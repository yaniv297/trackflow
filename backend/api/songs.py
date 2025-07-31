from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from database import get_db
from schemas import SongCreate, SongOut
from api.data_access import create_song_in_db, delete_song_from_db
from models import Song, SongStatus, AlbumSeries, User, Pack, Collaboration, CollaborationType
from auth import get_current_active_user
from typing import Optional
from typing import List

router = APIRouter(prefix="/songs", tags=["Songs"])


@router.post("/", response_model=SongOut)
def create_song(song: SongCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Set the user_id to the current user's ID (author field will be populated from user.username)
    song_data = song.dict()
    song_data["user_id"] = current_user.id
    
    # Clean up song_data to remove fields that don't exist in the Song model
    from schemas import SongCreate
    
    # Remove fields that don't exist in the Song model
    cleaned_song_data = {k: v for k, v in song_data.items() 
                        if k in ['title', 'artist', 'album', 'pack', 'status', 'year', 'album_cover']}
    
    song_with_author = SongCreate(**cleaned_song_data)
    
    return create_song_in_db(db, song_with_author, current_user)

@router.get("/", response_model=list[SongOut])
def get_filtered_songs(
    status: Optional[SongStatus] = Query(None),
    query: Optional[str] = Query(None),
    pack_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Build base query with all necessary joins
    q = db.query(Song).options(
        joinedload(Song.artist_obj),
        joinedload(Song.user),  # Load the song owner
        joinedload(Song.pack_obj),  # Load the pack relationship
        joinedload(Song.collaborations).joinedload(Collaboration.user)
    )

    # Filter to show songs owned by the current user OR where the current user is a collaborator
    # OR songs in packs where the current user has ANY collaboration access (including read-only)
    q = q.filter(
        or_(
            Song.user_id == current_user.id,  # Songs owned by current user
            Song.id.in_(  # Songs where current user is a collaborator
                db.query(Collaboration.song_id)
                .filter(
                    Collaboration.user_id == current_user.id,
                    Collaboration.collaboration_type == CollaborationType.SONG_EDIT
                )
                .subquery()
            ),
            # Songs in packs where current user has ANY collaboration access (will be marked as read-only if no edit access)
            Song.pack_id.in_(
                db.query(Collaboration.pack_id)
                .filter(
                    Collaboration.user_id == current_user.id,
                    Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
                )
                .distinct()
                .subquery()
            )
        )
    )

    if status:
        q = q.filter(Song.status == status)

    if pack_id:
        q = q.filter(Song.pack_id == pack_id)

    if query:
        pattern = f"%{query}%"
        # Search in song fields and also in collaborations
        q = q.filter(
            or_(
                Song.title.ilike(pattern),
                Song.artist.ilike(pattern),
                Song.album.ilike(pattern),
                # Search in collaborations using EXISTS subquery
                Song.id.in_(
                    db.query(Collaboration.song_id)
                    .join(User, Collaboration.user_id == User.id)
                    .filter(User.username.ilike(pattern))
                    .subquery()
                )
            )
        )

    # Get all songs with their related data in one query
    songs = q.order_by(Song.artist.asc(), Song.title.asc()).all()
    
    # Pre-fetch all album series data to avoid N+1 queries
    album_series_ids = {song.album_series_id for song in songs if song.album_series_id}
    album_series_map = {}
    if album_series_ids:
        series_list = db.query(AlbumSeries).filter(AlbumSeries.id.in_(album_series_ids)).all()
        album_series_map = {series.id: series for series in series_list}
    

    
    # Build result efficiently
    result = []
    for song in songs:
        song_dict = song.__dict__.copy()
        song_dict["artist_image_url"] = song.artist_obj.image_url if song.artist_obj else None
        
        # Set author from user relationship
        if song.user:
            song_dict["author"] = song.user.username
        
        # Note: authoring relationship was removed in the unified collaboration system
        
        # Attach collaborations with username lookup
        if hasattr(song, "collaborations"):
            collaborations_with_username = []
            for collab in song.collaborations:
                collab_dict = {
                    "id": collab.id,
                    "user_id": collab.user_id,
                    "username": collab.user.username,  # Add username for frontend compatibility
                    "collaboration_type": collab.collaboration_type.value,
                    "created_at": collab.created_at
                }
                collaborations_with_username.append(collab_dict)
            song_dict["collaborations"] = collaborations_with_username
        
        # Attach album series data from pre-fetched map
        if song.album_series_id and song.album_series_id in album_series_map:
            series = album_series_map[song.album_series_id]
            song_dict["album_series_number"] = series.series_number
            song_dict["album_series_name"] = series.album_name
            
            # If album series has a pack_id, use that for pack information
            if series.pack_id:
                # Find the pack by ID
                pack = db.query(Pack).filter(Pack.id == series.pack_id).first()
                if pack:
                    song_dict["pack_id"] = pack.id
                    song_dict["pack_name"] = pack.name
                    song_dict["pack_owner_id"] = pack.user_id
                    # Get pack owner username
                    pack_owner = db.query(User).filter(User.id == pack.user_id).first()
                    if pack_owner:
                        song_dict["pack_owner_username"] = pack_owner.username
        
        # Attach pack data from loaded relationship (only if not already set by album series)
        if not song_dict.get("pack_name") and song.pack_obj:
            song_dict["pack_id"] = song.pack_obj.id
            song_dict["pack_name"] = song.pack_obj.name
            song_dict["pack_owner_id"] = song.pack_obj.user_id
            # Get pack owner username
            pack_owner = db.query(User).filter(User.id == song.pack_obj.user_id).first()
            if pack_owner:
                song_dict["pack_owner_username"] = pack_owner.username
        
        # Determine if song is editable based on unified collaboration system
        is_owner = song.user_id == current_user.id
        
        # Check if user has song-level collaboration
        has_song_collaboration = db.query(Collaboration).filter(
            Collaboration.song_id == song.id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None
        
        # Check if user has pack-level collaboration
        has_pack_collaboration = db.query(Collaboration).filter(
            Collaboration.pack_id == song.pack_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
        ).first() is not None
        
        # Song is editable if user owns it or has song-level edit collaboration
        song_dict["is_editable"] = is_owner or has_song_collaboration
        
        # Add pack collaboration info if user has access via pack collaboration
        if has_pack_collaboration and song.pack_id:
            song_dict["pack_collaboration"] = {
                "can_edit": has_song_collaboration,  # Only editable if direct song collaboration
                "pack_id": song.pack_id
            }
        
        result.append(SongOut.model_validate(song_dict, from_attributes=True))
    
    return result

@router.delete("/{song_id}", status_code=204)
def delete_song(song_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Check if the song exists
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user has permission to delete this song
    can_delete = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None  # User is a collaborator
    )
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this song")
    
    success = delete_song_from_db(db, song_id)
    if not success:
        raise HTTPException(status_code=404, detail="Song not found")

@router.post("/batch", response_model=list[SongOut])
def create_songs_batch(songs: List[SongCreate], db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    new_songs = []
    errors = []
    
    for i, song_data in enumerate(songs):
        try:
            # Set the user_id to the current user's ID (author field will be populated from user.username)
            song_dict = song_data.dict()
            song_dict["user_id"] = current_user.id
            
            # Create a new SongCreate object with the current user
            from schemas import SongCreate
            song_with_author = SongCreate(**song_dict)
            
            new_song = create_song_in_db(db, song_with_author, current_user)
            new_songs.append(new_song)
        except HTTPException as e:
            # If it's a duplicate error, add it to errors list but continue
            if e.status_code == 400 and "already exists" in e.detail:
                errors.append(f"Song {i+1}: {e.detail}")
            else:
                # Re-raise other HTTP exceptions
                raise e
        except Exception as e:
            errors.append(f"Song {i+1}: {str(e)}")
    
    # If there were any errors, return them along with successfully created songs
    if errors:
        raise HTTPException(
            status_code=400,
            detail=f"Some songs could not be created: {'; '.join(errors)}"
        )
    
    # Return properly formatted songs with pack data
    # Reload songs with relationships
    song_ids = [song.id for song in new_songs]
    songs_with_relations = db.query(Song).options(
        joinedload(Song.user),
        joinedload(Song.pack_obj)
    ).filter(Song.id.in_(song_ids)).all()
    
    formatted_songs = []
    for song in songs_with_relations:
        song_dict = song.__dict__.copy()
        
        # Set author from user relationship
        if song.user:
            song_dict["author"] = song.user.username
        
        # Attach pack data if it exists
        if song.pack_obj:
            song_dict["pack_id"] = song.pack_obj.id
            song_dict["pack_name"] = song.pack_obj.name
        
        # Attach album series data if it exists
        if song.album_series_id:
            series = db.query(AlbumSeries).filter(AlbumSeries.id == song.album_series_id).first()
            if series:
                song_dict["album_series_number"] = series.series_number
                song_dict["album_series_name"] = series.album_name
        
        formatted_songs.append(SongOut.model_validate(song_dict, from_attributes=True))
    
    return formatted_songs

@router.patch("/{song_id}", response_model=SongOut)
def update_song(song_id: int, updates: dict = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Check if the song exists
    song = db.query(Song).options(
        joinedload(Song.collaborations).joinedload(Collaboration.user),
        joinedload(Song.user),  # Load the song owner
        joinedload(Song.pack_obj),  # Load the pack relationship
    ).filter(Song.id == song_id).first()
    
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user has permission to edit this song
    can_edit = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None or  # User is a direct collaborator
        db.query(Collaboration).filter(
            Collaboration.pack_id == song.pack_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.PACK_EDIT
        ).first() is not None  # User has edit access via pack collaboration
    )
    
    if not can_edit:
        raise HTTPException(status_code=403, detail="You don't have permission to edit this song")

    # Handle collaborations update if provided
    if "collaborations" in updates:
        # Delete existing collaborations
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).delete()
        
        # Add new collaborations
        collaborations = updates["collaborations"]
        
        # Handle both string format (comma-separated) and list format
        if isinstance(collaborations, str):
            # Split comma-separated string and clean up
            collab_names = [name.strip() for name in collaborations.split(",") if name.strip()]
        elif isinstance(collaborations, list):
            # Handle list of strings or list of dictionaries
            collab_names = []
            for collab_data in collaborations:
                if isinstance(collab_data, str):
                    collab_names.append(collab_data)
                elif isinstance(collab_data, dict) and "author" in collab_data:
                    collab_names.append(collab_data["author"])
                else:
                    continue
        else:
            collab_names = []
        
        # Add collaborations to database
        for author in collab_names:
            if author and author != current_user.username:  # Don't add self as collaborator
                # Find user by username
                collaborator_user = db.query(User).filter(User.username == author).first()
                if collaborator_user:
                    db_collab = Collaboration(
                        song_id=song_id,
                        user_id=collaborator_user.id,
                        collaboration_type=CollaborationType.SONG_EDIT
                    )
                    db.add(db_collab)
        
        # Remove collaborations from updates dict to avoid setting it as an attribute
        del updates["collaborations"]

    # Handle pack update specially (convert pack name to pack_id)
    if "pack" in updates:
        pack_name = updates["pack"]
        if pack_name:
            # Find existing pack or create new one
            existing_pack = db.query(Pack).filter(
                Pack.name == pack_name,
                Pack.user_id == current_user.id
            ).first()
            
            if existing_pack:
                song.pack_id = existing_pack.id
            else:
                # Create new pack
                new_pack = Pack(name=pack_name, user_id=current_user.id)
                db.add(new_pack)
                db.flush()  # Flush to get the ID
                song.pack_id = new_pack.id
        else:
            # Empty pack name, remove from pack
            song.pack_id = None
        
        del updates["pack"]

    # Update other fields
    for key, value in updates.items():
        if hasattr(song, key):
            setattr(song, key, value)

    db.commit()
    db.refresh(song)
    
    # Build result with proper collaboration formatting
    song_dict = song.__dict__.copy()
    song_dict["artist_image_url"] = song.artist_obj.image_url if song.artist_obj else None
    
    # Set author from user relationship
    if song.user:
        song_dict["author"] = song.user.username
    
    # Attach collaborations with username lookup
    if hasattr(song, "collaborations"):
        collaborations_with_username = []
        for collab in song.collaborations:
            collab_dict = {
                "id": collab.id,
                "user_id": collab.user_id,
                "username": collab.user.username,  # Add username for frontend compatibility
                "collaboration_type": collab.collaboration_type.value,
                "created_at": collab.created_at
            }
            collaborations_with_username.append(collab_dict)
        song_dict["collaborations"] = collaborations_with_username
    
    # Attach album series data if it exists
    if song.album_series_id and hasattr(song, "album_series_obj") and song.album_series_obj:
        song_dict["album_series_number"] = song.album_series_obj.series_number
        song_dict["album_series_name"] = song.album_series_obj.album_name
    
    # Attach pack data if it exists
    if song.pack_obj:
        song_dict["pack_id"] = song.pack_obj.id
        song_dict["pack_name"] = song.pack_obj.name
        song_dict["pack_owner_id"] = song.pack_obj.user_id
        # Get pack owner username
        pack_owner = db.query(User).filter(User.id == song.pack_obj.user_id).first()
        if pack_owner:
            song_dict["pack_owner_username"] = pack_owner.username
    
    # Determine if song is editable and add collaboration info (same logic as get_filtered_songs)
    is_owner = song.user_id == current_user.id
    is_song_collaborator = db.query(Collaboration).filter(
        Collaboration.song_id == song.id,
        Collaboration.user_id == current_user.id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).first() is not None
    
    # Check if user has pack edit collaboration
    has_pack_edit = db.query(Collaboration).filter(
        Collaboration.pack_id == song.pack_id,
        Collaboration.user_id == current_user.id,
        Collaboration.collaboration_type == CollaborationType.PACK_EDIT
    ).first() is not None
    
    # Check if user has any pack collaboration (for read-only access)
    has_pack_collaboration = db.query(Collaboration).filter(
        Collaboration.pack_id == song.pack_id,
        Collaboration.user_id == current_user.id,
        Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
    ).first() is not None
    
    # Song is editable if user owns it, is a direct collaborator, or has edit access via pack collaboration
    song_dict["is_editable"] = is_owner or is_song_collaborator or has_pack_edit
    
    # Add pack collaboration info if user has access via pack collaboration
    if has_pack_edit:
        song_dict["pack_collaboration"] = {
            "can_edit": True,
            "pack_id": song.pack_id
        }
    elif has_pack_collaboration and song.pack_id:
        # User has collaboration on this pack but not edit access (read-only)
        song_dict["pack_collaboration"] = {
            "can_edit": False,
            "pack_id": song.pack_id
        }
    
    result = SongOut.model_validate(song_dict, from_attributes=True)
    return result

@router.post("/release-pack")
def release_pack(pack_name: str, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Find the pack by name
    pack = db.query(Pack).filter(Pack.name == pack_name, Pack.user_id == current_user.id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found or not owned by user")
    
    # Update all songs in this pack
    songs = db.query(Song).filter(Song.pack_id == pack.id).all()
    for song in songs:
        song.status = SongStatus.released
    db.commit()
    return {"message": f"Released pack: {pack_name}"}

@router.post("/bulk-delete")
def bulk_delete(song_ids: list[int], db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Verify all songs belong to the current user
    user_songs = db.query(Song).filter(Song.id.in_(song_ids), Song.user_id == current_user.id).all()
    if len(user_songs) != len(song_ids):
        raise HTTPException(status_code=404, detail="Some songs not found or not owned by user")
    
    for song_id in song_ids:
        delete_song_from_db(db, song_id)
    return {"message": f"Deleted {len(song_ids)} songs"}

@router.post("/{song_id}/collaborations")
def add_collaborations(song_id: int, data: dict = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Check if the song exists
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user has permission to modify collaborations
    can_modify = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None  # User is a collaborator
    )
    
    if not can_modify:
        raise HTTPException(status_code=403, detail="You don't have permission to modify this song's collaborations")
    
    # Delete existing collaborations
    db.query(Collaboration).filter(
        Collaboration.song_id == song_id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).delete()
    
    # Add new collaborations
    collaborations = data.get("collaborations", [])
    for collab_data in collaborations:
        # Find user by username
        collaborator_user = db.query(User).filter(User.username == collab_data["author"]).first()
        if collaborator_user and collaborator_user.id != current_user.id:  # Don't add self as collaborator
            db_collab = Collaboration(
                song_id=song_id,
                user_id=collaborator_user.id,
                collaboration_type=CollaborationType.SONG_EDIT
            )
            db.add(db_collab)
    
    db.commit()
    return {"message": f"Updated collaborations for song {song_id}"}

@router.get("/autocomplete/artists")
def get_artists_autocomplete(query: str = Query(""), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get artists for auto-complete"""
    if not query:
        return []
    
    artists = db.query(Song.artist).filter(
        Song.user_id == current_user.id,
        Song.artist.ilike(f"%{query}%")
    ).distinct().limit(10).all()
    
    return [artist[0] for artist in artists if artist[0]]

@router.get("/autocomplete/albums")
def get_albums_autocomplete(query: str = Query(""), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get albums for auto-complete"""
    if not query:
        return []
    
    albums = db.query(Song.album).filter(
        Song.user_id == current_user.id,
        Song.album.ilike(f"%{query}%")
    ).distinct().limit(10).all()
    
    return [album[0] for album in albums if album[0]]

@router.get("/autocomplete/collaborators")
def get_collaborators_autocomplete(query: str = Query(""), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get collaborators for auto-complete"""
    if not query:
        return []
    
    collaborators = db.query(User.username).join(Collaboration, User.id == Collaboration.user_id).join(Song).filter(
        Collaboration.song_id == Song.id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT,
        Song.user_id == current_user.id,
        User.username.ilike(f"%{query}%"),
        User.username != current_user.username
    ).distinct().limit(10).all()
    
    return [collab[0] for collab in collaborators if collab[0]]

@router.get("/autocomplete/packs")
def get_packs_autocomplete(query: str = Query(""), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get packs for auto-complete"""
    if not query:
        return []
    
    packs = db.query(Pack.name).filter(
        Pack.user_id == current_user.id,
        Pack.name.ilike(f"%{query}%")
    ).distinct().limit(10).all()
    
    return [pack[0] for pack in packs if pack[0]]

@router.get("/debug-songs")
def debug_songs(db: Session = Depends(get_db)):
    songs = db.query(Song).options(
        joinedload(Song.pack_obj)
    ).filter(Song.status == "wip").limit(5).all()
    
    result = []
    for song in songs:
        result.append({
            "id": song.id,
            "title": song.title,
            "pack_id": song.pack_id,
            "pack_obj_loaded": song.pack_obj is not None,
            "pack_name": song.pack_obj.name if song.pack_obj else None
        })
    
    return result
