from sqlalchemy.orm import Session
from sqlalchemy import text
from models import Song, Collaboration, CollaborationType, User, Pack, Authoring, SongStatus
from schemas import SongCreate, AuthoringUpdate
from fastapi import HTTPException



def get_songs(db: Session):
    return db.query(Song).all()

def create_song_in_db(db: Session, song: SongCreate, user: User, auto_enhance: bool = True, auto_commit: bool = True):
    # Extract collaborations from the song data
    song_data = song.dict()
    collaborations = song_data.pop('collaborations', [])
    
    # Handle pack creation if pack_id is not provided but pack_name or pack is
    if not song_data.get('pack_id'):
        pack_name = song_data.pop('pack_name', None) or song_data.pop('pack', None)
        print(f"Pack creation debug: pack_name={pack_name}, song_data={song_data}")
        if pack_name:
            # Check if pack already exists for this user (case-insensitive)
            existing_pack = db.query(Pack).filter(
                Pack.name.ilike(pack_name),
                Pack.user_id == user.id
            ).first()
            
            if existing_pack:
                print(f"Using existing pack: {existing_pack.id}")
                song_data['pack_id'] = existing_pack.id
            else:
                # Create new pack
                print(f"Creating new pack: {pack_name}")
                priority = song_data.get('priority')  # Get priority from song data or None
                new_pack = Pack(name=pack_name, user_id=user.id, priority=priority)
                db.add(new_pack)
                if auto_commit:
                    db.commit()
                    db.refresh(new_pack)
                else:
                    db.flush()
                    db.refresh(new_pack)
                song_data['pack_id'] = new_pack.id
                print(f"Created pack with ID: {new_pack.id}")
        else:
            print("No pack name provided")
    
    # Check if song already exists for this user (as owner or collaborator)
    if check_song_duplicate_for_user(db, song_data.get('title'), song_data.get('artist'), user):
        raise HTTPException(
            status_code=400,
            detail=f"Song '{song_data.get('title')}' by {song_data.get('artist')} already exists in your database (as owner or collaborator)"
        )
    
    print(f"Creating song: {song_data.get('title')} by {song_data.get('artist')} with pack_id: {song_data.get('pack_id')}")
    
    # Ensure user_id is set
    song_data['user_id'] = user.id
    
    # Check user's default_public_sharing setting to determine if new song should be public
    # Reload user from database to get fresh setting value (user might be from cache)
    db_user = db.query(User).filter(User.id == user.id).first()
    user_default_public_sharing = False
    if db_user and hasattr(db_user, 'default_public_sharing'):
        user_default_public_sharing = bool(db_user.default_public_sharing) if db_user.default_public_sharing is not None else False
    
    # Clean up song_data to remove fields that don't exist in the Song model
    valid_fields = ['title', 'artist', 'album', 'pack_id', 'status', 'year', 'album_cover', 'user_id', 'notes', 'optional', 'is_public']
    cleaned_song_data = {k: v for k, v in song_data.items() if k in valid_fields}
    # Remove priority field as it's only used for pack creation, not song creation
    cleaned_song_data.pop('priority', None)
    
    # Set is_public based on user's default_public_sharing setting if not explicitly provided
    if 'is_public' not in cleaned_song_data:
        cleaned_song_data['is_public'] = user_default_public_sharing
        print(f"Setting is_public={user_default_public_sharing} based on user's default_public_sharing setting")
    
    print(f"Cleaned song data: {cleaned_song_data}")
    
    db_song = Song(**cleaned_song_data)
    db.add(db_song)
    if auto_commit:
        db.commit()
        db.refresh(db_song)
    else:
        db.flush()  # Get the ID without committing
        db.refresh(db_song)
    
    print(f"Successfully created song with ID: {db_song.id}")
    
    # Increment achievement counters based on status
    try:
        from api.achievements.repositories.achievements_repository import AchievementsRepository
        achievements_repo = AchievementsRepository()
        
        # Increment Future Plans creation counter if song created as Future Plans
        if db_song.status == SongStatus.future:
            achievements_repo.increment_future_creation_count(db, user.id, commit=False)
        
        # Increment WIP creation counter if song created as WIP  
        elif db_song.status == SongStatus.wip:
            achievements_repo.increment_wip_creation_count(db, user.id, commit=False)
            
    except Exception as e:
        print(f"⚠️ Failed to increment achievement counters: {e}")
        # Don't fail song creation if achievement counting fails
    
    # Create collaboration records if provided
    if collaborations:
        for collab_data in collaborations:
            # Handle both Pydantic objects and dicts
            if hasattr(collab_data, 'author'):
                author = collab_data.author
            else:
                author = collab_data['author']
            
            # Don't add the current user as a collaborator
            if author != user.username:
                # Find the collaborator user
                collaborator_user = db.query(User).filter(User.username == author).first()
                if collaborator_user:
                    db_collab = Collaboration(
                        song_id=db_song.id,
                        user_id=collaborator_user.id,
                        collaboration_type=CollaborationType.SONG_EDIT
                    )
                    db.add(db_collab)
        if auto_commit:
            db.commit()
    
    # Auto-create song progress steps from user's workflow if song is "In Progress"
    if db_song.status == "In Progress":
        # Load user's workflow - REQUIRED, no fallback to templates
        workflow_steps = db.execute(text("""
            SELECT uws.step_name, uws.display_name, uws.order_index
            FROM user_workflows uw
            JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
            WHERE uw.user_id = :uid
            ORDER BY uws.order_index
        """), {"uid": user.id}).fetchall()
        
        if not workflow_steps:
            # User has no workflow configured - this is an error
            # Rollback the song creation
            if auto_commit:
                db.rollback()
            raise HTTPException(
                status_code=409,
                detail="USER_WORKFLOW_NOT_CONFIGURED: User workflow is required before creating songs. Please configure your workflow first."
            )
        
        # Create song progress steps from user's workflow
        for step_row in workflow_steps:
            step_name = step_row[0]
            db.execute(text("""
                INSERT INTO song_progress (song_id, step_name, is_completed, created_at, updated_at)
                VALUES (:sid, :step, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(song_id, step_name) DO NOTHING
            """), {"sid": db_song.id, "step": step_name})
        
        if auto_commit:
            db.commit()
        else:
            db.flush()
    
    # Auto-enhance song with Spotify data (only if auto_enhance is True and user has it enabled)
    # Reload user from database to get fresh setting value (user might be from cache)
    db_user = db.query(User).filter(User.id == user.id).first()
    user_auto_enhance_enabled = True
    if db_user:
        user_auto_enhance_enabled = getattr(db_user, 'auto_spotify_fetch_enabled', True)
        # Handle None or 0/1 from database
        if user_auto_enhance_enabled is None:
            user_auto_enhance_enabled = True
        else:
            user_auto_enhance_enabled = bool(user_auto_enhance_enabled)
    
    if auto_enhance and user_auto_enhance_enabled:
        print(f"🎵 Attempting auto-enhancement for song {db_song.id} ({db_song.title} by {db_song.artist})")
        try:
            from api.spotify import auto_enhance_song
            enhancement_result = auto_enhance_song(db_song.id, db, preserve_artist_album=False)
            if enhancement_result:
                print(f"✅ Auto-enhanced song {db_song.id} with Spotify data")
                
                # Refresh to get updated metadata from Spotify
                db.refresh(db_song)
            else:
                print(f"❌ Auto-enhancement failed for song {db_song.id} - no results found or error occurred")
                
            # Check for duplicates AFTER Spotify enhancement
            print(f"Checking for post-enhancement duplicates: '{db_song.title}' by {db_song.artist}")
            # Look for other songs with the same title/artist (excluding this one)
            # Protect against None values that could cause crashes
            if db_song.title and db_song.artist:
                duplicate_song = db.query(Song).filter(
                    Song.title.ilike(db_song.title),
                    Song.artist.ilike(db_song.artist),
                    Song.id != db_song.id  # Exclude the current song
                ).first()
            else:
                duplicate_song = None
            
            if duplicate_song:
                # Check if user owns or collaborates on the duplicate
                user_has_access = False
                if duplicate_song.user_id == user.id:
                    user_has_access = True
                else:
                    collaboration = db.query(Collaboration).filter(
                        Collaboration.song_id == duplicate_song.id,
                        Collaboration.user_id == user.id,
                        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
                    ).first()
                    if collaboration:
                        user_has_access = True
                
                if user_has_access:
                    # Delete the newly created song to prevent duplicate using proper cleanup
                    print(f"Deleting duplicate song {db_song.id} created by Spotify enhancement")
                    song_id_to_delete = db_song.id
                    song_title = db_song.title
                    song_artist = db_song.artist
                    
                    # Use the proper deletion function that handles related records
                    if delete_song_from_db(db, song_id_to_delete):
                        print(f"Successfully deleted duplicate song {song_id_to_delete}")
                    else:
                        print(f"Failed to delete duplicate song {song_id_to_delete}")
                    
                    raise HTTPException(
                        status_code=400,
                        detail=f"Song '{song_title}' by {song_artist} already exists in your database (detected after Spotify enhancement)"
                    )
            
            # Auto-clean remaster tags after enhancement (runs regardless of duplicate check)
            try:
                from api.tools import clean_string
                
                cleaned_title = clean_string(db_song.title)
                cleaned_album = clean_string(db_song.album or "")
                
                if cleaned_title != db_song.title or cleaned_album != db_song.album:
                    print(f"Cleaning remaster tags for song {db_song.id}")
                    db_song.title = cleaned_title
                    db_song.album = cleaned_album
                    if auto_commit:
                        db.commit()
                    print(f"Cleaned song {db_song.id}: title='{cleaned_title}', album='{cleaned_album}'")
            except Exception as clean_error:
                print(f"Failed to clean remaster tags for song {db_song.id}: {clean_error}")
        except Exception as e:
            print(f"Failed to auto-enhance song {db_song.id}: {e}")
            # Re-raise HTTPException to propagate duplicate detection errors
            if isinstance(e, HTTPException):
                raise e
    else:
        if not auto_enhance:
            print(f"Auto-enhancement skipped for song {db_song.id} (auto_enhance parameter is False)")
        elif not user_auto_enhance_enabled:
            print(f"Auto-enhancement skipped for song {db_song.id} (user has disabled automatic Spotify fetching)")
        
    return db_song

def get_authoring_by_song_id(db: Session, song_id: int):
    return db.query(Authoring).filter(Authoring.song_id == song_id).first()

def update_authoring_progress(db: Session, song_id: int, updates: AuthoringUpdate):
    db_row = get_authoring_by_song_id(db, song_id)
    if not db_row:
        return None
    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_row, key, value)
    db.commit()
    db.refresh(db_row)
    return db_row

def delete_song_from_db(db: Session, song_id: int) -> bool:
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        print(f"Song {song_id} not found in database")
        return False

    print(f"Attempting to delete song {song_id}: '{song.title}' by {song.artist}")

    # Try multiple times with exponential backoff
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Delete all related records in a single transaction
            # Do NOT touch the authoring table here. In some installations it's a VIEW
            # and is not directly deletable. We only remove dependent rows we own.

            # Delete all collaborations at once
            collab_count = db.query(Collaboration).filter(Collaboration.song_id == song_id).count()
            db.query(Collaboration).filter(Collaboration.song_id == song_id).delete()
            print(f"  Deleted {collab_count} collaborations for song {song_id}")

            # Finally delete the song
            db.delete(song)
            db.commit()
            print(f"  Successfully deleted song {song_id}")
            return True
            
        except Exception as e:
            db.rollback()
            print(f"Attempt {attempt + 1} failed for song {song_id}: {e}")
            if attempt < max_retries - 1:
                import time
                time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
                continue
            else:
                print(f"All {max_retries} attempts failed for song {song_id}")
                return False
    
    return False

def check_song_duplicate_for_user(db: Session, title: str, artist: str, current_user: User) -> bool:
    """
    Check if a song already exists for the current user (as owner or collaborator).
    Returns True if the user already has access to this song, False otherwise.
    Uses case-insensitive matching to prevent duplicates with different capitalization.
    """
    # Protect against None values that could cause crashes
    if not title or not artist:
        return False
    
    # Check if user owns this song (case-insensitive)
    existing_song = db.query(Song).filter(
        Song.title.ilike(title),
        Song.artist.ilike(artist)
    ).first()
    
    if existing_song:
        # Check if user owns this song
        if existing_song.user_id == current_user.id:
            return True
        
        # Check if user is a collaborator on this song
        collaboration = db.query(Collaboration).filter(
            Collaboration.song_id == existing_song.id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first()
        
        if collaboration:
            return True
    
    return False
