from sqlalchemy.orm import Session
from models import Song, Collaboration, CollaborationType, User, Pack, Authoring
from schemas import SongCreate, AuthoringUpdate
from fastapi import HTTPException



def get_songs(db: Session):
    return db.query(Song).all()

def create_song_in_db(db: Session, song: SongCreate, user: User):
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
                new_pack = Pack(name=pack_name, user_id=user.id)
                db.add(new_pack)
                db.commit()
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
    
    # Clean up song_data to remove fields that don't exist in the Song model
    valid_fields = ['title', 'artist', 'album', 'pack_id', 'status', 'year', 'album_cover', 'user_id']
    cleaned_song_data = {k: v for k, v in song_data.items() if k in valid_fields}
    
    print(f"Cleaned song data: {cleaned_song_data}")
    
    db_song = Song(**cleaned_song_data)
    db.add(db_song)
    db.commit()
    db.refresh(db_song)
    
    print(f"Successfully created song with ID: {db_song.id}")
    
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
        db.commit()
    
    # Auto-create authoring row if song is "In Progress"
    if db_song.status == "In Progress":
        db_authoring = Authoring(song_id=db_song.id)
        db.add(db_authoring)
        db.commit()
        db.refresh(db_authoring)
    
    # Auto-enhance song with Spotify data
    try:
        from api.spotify import auto_enhance_song
        if auto_enhance_song(db_song.id, db):
            print(f"Auto-enhanced song {db_song.id} with Spotify data")
            
            # Auto-clean remaster tags after enhancement
            try:
                from api.tools import clean_string
                db.refresh(db_song)  # Refresh to get updated data from Spotify
                
                cleaned_title = clean_string(db_song.title)
                cleaned_album = clean_string(db_song.album or "")
                
                if cleaned_title != db_song.title or cleaned_album != db_song.album:
                    print(f"Cleaning remaster tags for song {db_song.id}")
                    db_song.title = cleaned_title
                    db_song.album = cleaned_album
                    db.commit()
                    print(f"Cleaned song {db_song.id}: title='{cleaned_title}', album='{cleaned_album}'")
            except Exception as clean_error:
                print(f"Failed to clean remaster tags for song {db_song.id}: {clean_error}")
        else:
            print(f"Auto-enhancement skipped for song {db_song.id}")
    except Exception as e:
        print(f"Failed to auto-enhance song {db_song.id}: {e}")
        
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
            # Delete authoring row if exists
            db.query(Authoring).filter(Authoring.song_id == song_id).delete()
            print(f"  Deleted authoring records for song {song_id}")

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
