from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from database import get_db
from schemas import SongCreate, SongOut
from api.data_access import create_song_in_db, delete_song_from_db
from models import Song, SongStatus, AlbumSeries, User, Pack, Collaboration, CollaborationType, Artist
from api.auth import get_current_active_user
from api.activity_logger import log_activity
from typing import Optional
from typing import List
from datetime import datetime

router = APIRouter(prefix="/songs", tags=["Songs"])


@router.post("/", response_model=SongOut)
def create_song(song: SongCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Set the user_id to the current user's ID (author field will be populated from user.username)
    song_data = song.dict()
    song_data["user_id"] = current_user.id
    
    # Handle pack creation if pack name is provided but pack_id is not
    if song_data.get('pack') and not song_data.get('pack_id'):
        pack_name = song_data['pack']
        existing_pack = db.query(Pack).filter(
            Pack.name.ilike(pack_name),
            Pack.user_id == current_user.id
        ).first()
        
        if existing_pack:
            # If pack exists, determine its status from existing songs
            pack_songs = db.query(Song).filter(Song.pack_id == existing_pack.id).all()
            
            if pack_songs:
                # Get the most common status in the pack
                status_counts = db.query(Song.status, func.count(Song.id)).filter(
                    Song.pack_id == existing_pack.id
                ).group_by(Song.status).order_by(func.count(Song.id).desc()).all()
                
                if status_counts:
                    pack_status = status_counts[0][0]  # Most common status
                    # Override the song status with the pack's status
                    song_data['status'] = pack_status
            
            # Set the pack_id to the existing pack
            song_data['pack_id'] = existing_pack.id
            song_data.pop('pack', None)  # Remove pack name since we have pack_id
        else:
            # Create new pack - the pack_id will be set in create_song_in_db
            # Keep the pack name in song_data for create_song_in_db to handle
            pass
    
    # Also handle case where pack_id is provided directly
    elif song_data.get('pack_id'):
        pack_id = song_data['pack_id']
        # Get the most common status in the pack
        status_counts = db.query(Song.status, func.count(Song.id)).filter(
            Song.pack_id == pack_id
        ).group_by(Song.status).order_by(func.count(Song.id).desc()).all()
        
        if status_counts:
            pack_status = status_counts[0][0]  # Most common status
            # Override the song status with the pack's status
            song_data['status'] = pack_status
    
    # Clean up song_data to remove fields that don't exist in the Song model
    cleaned_song_data = {k: v for k, v in song_data.items() 
                        if k in ['title', 'artist', 'album', 'pack_id', 'status', 'year', 'album_cover', 'optional']}
    
    # If we have a pack name but no pack_id, add it to cleaned_song_data for create_song_in_db to handle
    if song_data.get('pack') and not song_data.get('pack_id'):
        cleaned_song_data['pack'] = song_data['pack']
    
    song_with_author = SongCreate(**cleaned_song_data)
    
    # Create song and convert to proper response format
    db_song = create_song_in_db(db, song_with_author, current_user)
    
    # Re-fetch the song with all relationships loaded
    db_song = db.query(Song).options(
        joinedload(Song.collaborations).joinedload(Collaboration.user),
        joinedload(Song.user),  # Load the song owner
        joinedload(Song.pack_obj).joinedload(Pack.user),  # Load the pack relationship and its owner
        joinedload(Song.authoring)  # Load the authoring data
    ).filter(Song.id == db_song.id).first()
    
    # Build result with proper formatting (similar to PATCH endpoint)
    song_dict = db_song.__dict__.copy()
    
    # Set author from user relationship
    if db_song.user:
        song_dict["author"] = db_song.user.username
    
    # Attach collaborations if any
    song_dict["collaborations"] = []
    if hasattr(db_song, "collaborations"):
        collaborations_with_username = []
        for collab in db_song.collaborations:
            collab_dict = {
                "id": collab.id,
                "user_id": collab.user_id,
                "username": collab.user.username,
                "collaboration_type": collab.collaboration_type.value,
                "created_at": collab.created_at
            }
            collaborations_with_username.append(collab_dict)
        song_dict["collaborations"] = collaborations_with_username
    
    # Attach pack data if it exists
    if db_song.pack_obj:
        song_dict["pack_id"] = db_song.pack_obj.id
        song_dict["pack_name"] = db_song.pack_obj.name
        song_dict["pack_priority"] = db_song.pack_obj.priority
        song_dict["pack_owner_id"] = db_song.pack_obj.user_id
        song_dict["pack_owner_username"] = db_song.pack_obj.user.username if db_song.pack_obj.user else None
    
    # Log activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="create_song",
            description=f"{current_user.username} has created a new song: {db_song.title} by {db_song.artist}",
            metadata={"song_id": db_song.id, "title": db_song.title, "artist": db_song.artist, "status": db_song.status.value if hasattr(db_song.status, 'value') else str(db_song.status)}
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log create_song activity: {log_err}")
    
    return SongOut(**song_dict)

@router.get("/", response_model=list[SongOut])
def get_filtered_songs(
    status: Optional[SongStatus] = Query(None),
    query: Optional[str] = Query(None),
    pack_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    # Pre-fetch all collaboration data for the current user to avoid N+1 queries
    user_song_collaborations = db.query(Collaboration.song_id).filter(
        Collaboration.user_id == current_user.id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).all()
    user_song_collab_ids = {c.song_id for c in user_song_collaborations}
    
    # Get pack collaborations separated by type
    user_pack_collaborations = db.query(Collaboration.pack_id, Collaboration.collaboration_type).filter(
        Collaboration.user_id == current_user.id,
        Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
    ).all()
    user_pack_collab_ids = {c.pack_id for c in user_pack_collaborations if c.pack_id}
    user_pack_edit_ids = {c.pack_id for c in user_pack_collaborations if c.pack_id and c.collaboration_type == CollaborationType.PACK_EDIT}
    
    # Get packs owned by current user
    user_owned_packs = db.query(Pack.id).filter(Pack.user_id == current_user.id).all()
    user_owned_pack_ids = {p.id for p in user_owned_packs}
    
    # Get songs in packs where user has song-level collaboration
    songs_in_collab_packs = db.query(Song.pack_id).join(
        Collaboration, Song.id == Collaboration.song_id
    ).filter(
        Collaboration.user_id == current_user.id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT,
        Song.pack_id.isnot(None)
    ).distinct().all()
    songs_in_collab_pack_ids = {s.pack_id for s in songs_in_collab_packs if s.pack_id}
    
    # Build base query with all necessary joins
    q = db.query(Song).options(
        joinedload(Song.artist_obj),
        joinedload(Song.user),  # Load the song owner
        joinedload(Song.pack_obj).joinedload(Pack.user),  # Load the pack relationship and pack owner
        joinedload(Song.collaborations).joinedload(Collaboration.user),
        joinedload(Song.authoring)  # Load the authoring data
    )

    # Simplified filter using pre-fetched data
    q = q.filter(
        or_(
            Song.user_id == current_user.id,  # Songs owned by current user
            Song.id.in_(user_song_collab_ids),  # Songs where current user is a collaborator
            Song.pack_id.in_(user_pack_collab_ids),  # Songs in packs where user has pack-level access
            Song.pack_id.in_(songs_in_collab_pack_ids),  # Songs in packs where any song has user collaboration
            Song.pack_id.in_(user_owned_pack_ids)  # Songs in packs owned by current user
        )
    )

    if status:
        q = q.filter(Song.status == status)

    if pack_id:
        q = q.filter(Song.pack_id == pack_id)

    if query:
        pattern = f"%{query}%"
        # Search in song fields, pack name, and also in collaborations
        q = q.filter(
            or_(
                Song.title.ilike(pattern),
                Song.artist.ilike(pattern),
                Song.album.ilike(pattern),
                # Search in pack name
                Song.pack_obj.has(Pack.name.ilike(pattern)),
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
    
    # Pre-fetch pack album series ids directly from packs
    pack_ids = {song.pack_id for song in songs if song.pack_id}
    pack_map = {}
    if pack_ids:
        packs = db.query(Pack).join(User).filter(Pack.id.in_(pack_ids)).all()
        pack_map = {p.id: p for p in packs}
    
    # Prefetch album series by song-level ids only (source of truth)
    series_by_id = {}
    override_series_ids = {song.album_series_id for song in songs if getattr(song, "album_series_id", None)}
    if override_series_ids:
        series_list = db.query(AlbumSeries).filter(AlbumSeries.id.in_(override_series_ids)).all()
        series_by_id = {s.id: s for s in series_list}
    
    # Build result efficiently
    result = []
    for song in songs:
        song_dict = song.__dict__.copy()
        # Remove SQLAlchemy internal state
        song_dict.pop("_sa_instance_state", None)
        
        # Ensure pack_id is an integer if it exists
        if "pack_id" in song_dict and song_dict["pack_id"] is not None:
            try:
                song_dict["pack_id"] = int(song_dict["pack_id"])
            except (ValueError, TypeError):
                # If pack_id is not a valid integer, remove it
                song_dict.pop("pack_id", None)
        
        song_dict["artist_image_url"] = song.artist_obj.image_url if song.artist_obj else None
        
        # Set author from user relationship
        song_dict["author"] = song.user.username if song.user else None
        
        # Include authoring data for completion tracking
        # Note: authoring is deprecated, but keep for backward compatibility
        song_dict["authoring"] = None
        
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
        
        # Attach pack data and album series (song-level source of truth)
        preferred_series_id = getattr(song, "album_series_id", None)
        
        if song.pack_id and song.pack_id in pack_map:
            pack = pack_map[song.pack_id]
            song_dict["pack_id"] = int(pack.id)
            song_dict["pack_name"] = pack.name
            song_dict["pack_priority"] = pack.priority
            song_dict["pack_owner_id"] = int(pack.user_id)
            song_dict["pack_owner_username"] = pack.user.username
            song_dict["album_series_id"] = preferred_series_id
            if preferred_series_id:
                series = series_by_id.get(preferred_series_id)
                if series:
                    song_dict["album_series_number"] = series.series_number
                    song_dict["album_series_name"] = series.album_name
        elif song.pack_obj:
            song_dict["pack_id"] = int(song.pack_obj.id)
            song_dict["pack_name"] = song.pack_obj.name
            song_dict["pack_priority"] = song.pack_obj.priority
            song_dict["pack_owner_id"] = int(song.pack_obj.user_id)
            song_dict["pack_owner_username"] = song.pack_obj.user.username
            song_dict["album_series_id"] = preferred_series_id
            if song_dict["album_series_id"]:
                series = series_by_id.get(song_dict["album_series_id"]) or db.query(AlbumSeries).filter(AlbumSeries.id == song_dict["album_series_id"]).first()
                if series:
                    song_dict["album_series_number"] = series.series_number
                    song_dict["album_series_name"] = series.album_name
        
        # Handle case where song has album_series_id but no pack (or pack data wasn't set above)
        # This ensures album_series_name is always set when album_series_id exists
        if preferred_series_id and "album_series_name" not in song_dict:
            series = series_by_id.get(preferred_series_id)
            if series:
                song_dict["album_series_id"] = preferred_series_id
                song_dict["album_series_number"] = series.series_number
                song_dict["album_series_name"] = series.album_name
        
        # Determine if song is editable using pre-fetched collaboration data
        is_owner = song.user_id == current_user.id
        has_song_collaboration = song.id in user_song_collab_ids
        has_pack_collaboration = song.pack_id in user_pack_collab_ids if song.pack_id else False
        has_pack_edit_collaboration = song.pack_id in user_pack_edit_ids if song.pack_id else False
        
        # Song is editable if user owns it, has song-level edit collaboration, or has pack edit collaboration
        song_dict["is_editable"] = is_owner or has_song_collaboration or has_pack_edit_collaboration
        
        # Add pack collaboration info if user has access via pack collaboration
        if has_pack_collaboration and song.pack_id:
            song_dict["pack_collaboration"] = {
                "can_edit": has_pack_edit_collaboration,  # Can edit if has PACK_EDIT permission
                "pack_id": int(song.pack_id)  # Ensure it's an integer
            }
        
        # Sanitize album_series_id to be int or None
        if "album_series_id" in song_dict:
            val = song_dict["album_series_id"]
            if val in ("", None, "null"):
                song_dict["album_series_id"] = None
            elif isinstance(val, str):
                try:
                    song_dict["album_series_id"] = int(val)
                except Exception:
                    song_dict["album_series_id"] = None
        result.append(SongOut.model_validate(song_dict, from_attributes=True))
    
    return result

@router.delete("/{song_id}", status_code=204)
def delete_song(song_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Check if the song exists
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user has permission to delete this song - ONLY SONG OWNERS CAN DELETE
    can_delete = song.user_id == current_user.id  # Only user owns the song
    
    if not can_delete:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this song")
    
    # Log activity before deletion (so we have song info)
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="delete_song",
            description=f"{current_user.username} has deleted a song: {song.title} by {song.artist}",
            metadata={"song_id": song.id, "title": song.title, "artist": song.artist, "status": song.status.value if hasattr(song.status, 'value') else str(song.status)}
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log delete_song activity: {log_err}")
    
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
            
            new_song = create_song_in_db(db, song_with_author, current_user, auto_enhance=True)
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
            song_dict["pack_priority"] = song.pack_obj.priority
        
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

    # Track if status changed for activity logging
    old_status = song.status
    status_changed = False
    
    # Update other fields
    for key, value in updates.items():
        if hasattr(song, key):
            if key == "status":
                status_changed = True
            setattr(song, key, value)

    db.commit()
    db.refresh(song)
    
    # Log status change activity
    if status_changed and old_status != song.status:
        try:
            log_activity(
                db=db,
                user_id=current_user.id,
                activity_type="change_status",
                description=f"{current_user.username} has moved {song.title} by {song.artist} from {old_status.value if hasattr(old_status, 'value') else str(old_status)} to {song.status.value if hasattr(song.status, 'value') else str(song.status)}",
                metadata={"song_id": song.id, "title": song.title, "artist": song.artist, "old_status": old_status.value if hasattr(old_status, 'value') else str(old_status), "new_status": song.status.value if hasattr(song.status, 'value') else str(song.status)}
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log change_status activity: {log_err}")
    
    # Build result with proper collaboration formatting
    song_dict = song.__dict__.copy()
    
    # Remove SQLAlchemy internal state
    song_dict.pop("_sa_instance_state", None)
    
    # Ensure all required fields are present
    if "id" not in song_dict:
        song_dict["id"] = song.id
    if "title" not in song_dict:
        song_dict["title"] = song.title
    if "artist" not in song_dict:
        song_dict["artist"] = song.artist
    if "album" not in song_dict:
        song_dict["album"] = song.album
    if "status" not in song_dict:
        song_dict["status"] = song.status
    if "year" not in song_dict:
        song_dict["year"] = song.year
    if "album_cover" not in song_dict:
        song_dict["album_cover"] = song.album_cover
    if "user_id" not in song_dict:
        song_dict["user_id"] = song.user_id
    
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
    
    # Attach album series (song-level only)
    effective_series_id = getattr(song, "album_series_id", None)
    if effective_series_id:
        series = db.query(AlbumSeries).filter(AlbumSeries.id == effective_series_id).first()
        if series:
            song_dict["album_series_id"] = series.id
            song_dict["album_series_number"] = series.series_number
            song_dict["album_series_name"] = series.album_name
    
    # Attach pack data if it exists
    if song.pack_obj:
        song_dict["pack_id"] = song.pack_obj.id
        song_dict["pack_name"] = song.pack_obj.name
        song_dict["pack_priority"] = song.pack_obj.priority
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
    # Find the pack by name (first check if user owns it)
    pack = db.query(Pack).filter(Pack.name == pack_name, Pack.user_id == current_user.id).first()
    
    # If user doesn't own it, check if they have PACK_EDIT collaboration permission
    if not pack:
        pack = db.query(Pack).filter(Pack.name == pack_name).first()
        if not pack:
            raise HTTPException(status_code=404, detail="Pack not found")
        
        # Check if user has PACK_EDIT permission on this pack
        has_pack_edit = db.query(Collaboration).filter(
            Collaboration.pack_id == pack.id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.PACK_EDIT
        ).first()
        
        if not has_pack_edit:
            raise HTTPException(status_code=403, detail="You don't have permission to release this pack")
    
    # Get ALL songs in this pack (regardless of who owns them)
    songs = db.query(Song).filter(Song.pack_id == pack.id).all()
    
    # Define authoring fields that need to be complete
    authoring_fields = [
        "demucs", "tempo_map", "fake_ending", "drums", "bass", "guitar",
        "vocals", "harmonies", "pro_keys", "keys", "animations",
        "drum_fills", "overdrive", "compile"
    ]
    
    # Separate songs into completed and optional (incomplete)
    completed_songs = []
    optional_songs = []
    
    for song in songs:
        # Check if song is 100% complete
        if song.authoring:
            all_complete = all(getattr(song.authoring, field, False) for field in authoring_fields)
            if all_complete:
                completed_songs.append(song)
            else:
                optional_songs.append(song)
        else:
            # No authoring data means incomplete
            optional_songs.append(song)
    
    # Move completed songs to "Released" status
    for song in completed_songs:
        song.status = SongStatus.released
    
    # Handle optional songs
    if optional_songs:
        # Create a new pack for optional songs under the original pack owner's account
        optional_pack_name = f"{pack_name} Optional Songs"
        
        # Check if optional pack already exists (under the original pack owner)
        existing_optional_pack = db.query(Pack).filter(
            Pack.name == optional_pack_name, 
            Pack.user_id == pack.user_id
        ).first()
        
        if existing_optional_pack:
            optional_pack = existing_optional_pack
        else:
            # Create new pack for optional songs under the original pack owner's account
            optional_pack = Pack(
                name=optional_pack_name,
                user_id=pack.user_id  # Use original pack owner, not current user
            )
            db.add(optional_pack)
            db.flush()  # Get the ID
        
        # Move optional songs to Future Plans with new pack
        for song in optional_songs:
            song.status = SongStatus.future
            song.pack_id = optional_pack.id
    
    # Check if any completed songs belong to album series and auto-release them
    album_series_ids = set()
    for song in completed_songs:
        if song.album_series_id:
            album_series_ids.add(song.album_series_id)
    
    released_series = []
    for series_id in album_series_ids:
        series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
        if series and series.status != "released":
            # Find the next available series number
            max_series_number = db.query(AlbumSeries.series_number).filter(
                AlbumSeries.series_number.isnot(None)
            ).order_by(AlbumSeries.series_number.desc()).first()
            
            next_series_number = 1 if max_series_number is None else max_series_number[0] + 1
            
            # Update series
            series.series_number = next_series_number
            series.status = "released"
            series.updated_at = datetime.utcnow()
            
            released_series.append({
                "name": f"{series.artist_name} - {series.album_name}",
                "series_number": next_series_number
            })
    
    db.commit()
    
    # Prepare response message
    completed_count = len(completed_songs)
    optional_count = len(optional_songs)
    
    response = {
        "message": f"Released pack: {pack_name}",
    }
    
    if optional_count > 0 or released_series:
        response["details"] = {}
        if completed_count > 0:
            response["details"]["completed_songs"] = completed_count
        if optional_count > 0:
            response["details"]["optional_songs"] = optional_count
            response["details"]["optional_pack_name"] = f"{pack_name} Optional Songs"
        if released_series:
            response["details"]["released_series"] = released_series
    
    return response

@router.post("/bulk-delete")
def bulk_delete(data: dict = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    song_ids = data.get("ids", [])
    if not song_ids:
        raise HTTPException(status_code=400, detail="No song IDs provided")
    
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
    
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="update_song_collaborations",
            description=f"{current_user.username} updated collaborators on song {song_id}",
            metadata={
                "song_id": song_id,
                "collaborator_usernames": [c.get("author") for c in collaborations if isinstance(c, dict)]
            }
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log song collaboration update: {log_err}")
    
    return {"message": f"Updated collaborations for song {song_id}"}

@router.get("/all-artists")
def get_all_artists(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all unique artists in the system for dropdown usage"""
    # Get artists from the Artist table (which includes DLC artists)
    artists = db.query(Artist.name).filter(
        Artist.name.isnot(None),
        Artist.name != ""
    ).order_by(Artist.name).all()
    
    # Also get artists from existing songs (in case there are any not in Artist table)
    song_artists = db.query(Song.artist).filter(
        Song.artist.isnot(None),
        Song.artist != ""
    ).distinct().all()
    
    # Combine and deduplicate
    all_artist_names = set()
    for (artist_name,) in artists:
        if artist_name:
            all_artist_names.add(artist_name)
    
    for (artist_name,) in song_artists:
        if artist_name:
            all_artist_names.add(artist_name)
    
    # Return sorted list
    sorted_artists = sorted(all_artist_names)
    return [{"value": artist_name, "label": artist_name} for artist_name in sorted_artists]

@router.get("/autocomplete/artists")
def get_artists_autocomplete(query: str = Query(""), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get artists for auto-complete with case-insensitive matching"""
    if not query:
        return []
    
    # First try exact match (case-insensitive)
    exact_match = db.query(Song.artist).filter(
        Song.user_id == current_user.id,
        Song.artist.ilike(query)
    ).distinct().first()
    
    # Then get partial matches
    partial_matches = db.query(Song.artist).filter(
        Song.user_id == current_user.id,
        Song.artist.ilike(f"%{query}%"),
        Song.artist.ilike(f"%{query}%")  # This ensures we get partial matches too
    ).distinct().limit(10).all()
    
    results = []
    
    # Add exact match first if found
    if exact_match and exact_match[0]:
        results.append(exact_match[0])
    
    # Add partial matches (excluding exact match if already added)
    for artist in partial_matches:
        if artist[0] and artist[0] not in results:
            results.append(artist[0])
    
    return results[:10]  # Limit to 10 total results

@router.get("/autocomplete/albums")
def get_albums_autocomplete(query: str = Query(""), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get albums for auto-complete with case-insensitive matching"""
    if not query:
        return []
    
    # First try exact match (case-insensitive)
    exact_match = db.query(Song.album).filter(
        Song.user_id == current_user.id,
        Song.album.ilike(query)
    ).distinct().first()
    
    # Then get partial matches
    partial_matches = db.query(Song.album).filter(
        Song.user_id == current_user.id,
        Song.album.ilike(f"%{query}%"),
        Song.album.ilike(f"%{query}%")  # This ensures we get partial matches too
    ).distinct().limit(10).all()
    
    results = []
    
    # Add exact match first if found
    if exact_match and exact_match[0]:
        results.append(exact_match[0])
    
    # Add partial matches (excluding exact match if already added)
    for album in partial_matches:
        if album[0] and album[0] not in results:
            results.append(album[0])
    
    return results[:10]  # Limit to 10 total results

@router.get("/autocomplete/collaborators")
def get_collaborators_autocomplete(query: str = Query(""), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get collaborators for auto-complete"""
    if not query:
        return []
    
    # Optimized query using pre-fetched collaboration data
    collaborators = db.query(User.username).join(
        Collaboration, User.id == Collaboration.user_id
    ).filter(
        Collaboration.user_id != current_user.id,
        User.username.ilike(f"%{query}%"),
        or_(
            # Collaborators on songs owned by current user
            Collaboration.song_id.in_(
                db.query(Song.id).filter(Song.user_id == current_user.id).subquery()
            ),
            # Collaborators on packs owned by current user
            Collaboration.pack_id.in_(
                db.query(Pack.id).filter(Pack.user_id == current_user.id).subquery()
            ),
            # Collaborators where current user is also a collaborator
            Collaboration.song_id.in_(
                db.query(Collaboration.song_id).filter(
                    Collaboration.user_id == current_user.id
                ).subquery()
            )
        )
    ).distinct().limit(10).all()
    
    return [collab[0] for collab in collaborators if collab[0]]

@router.get("/autocomplete/packs")
def get_packs_autocomplete(query: str = Query(""), db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get packs for auto-complete with case-insensitive matching"""
    if not query:
        return []
    
    # First try exact match (case-insensitive)
    exact_match = db.query(Pack.name).filter(
        Pack.user_id == current_user.id,
        Pack.name.ilike(query)
    ).distinct().first()
    
    # Then get partial matches
    partial_matches = db.query(Pack.name).filter(
        Pack.user_id == current_user.id,
        Pack.name.ilike(f"%{query}%"),
        Pack.name.ilike(f"%{query}%")  # This ensures we get partial matches too
    ).distinct().limit(10).all()
    
    results = []
    
    # Add exact match first if found
    if exact_match and exact_match[0]:
        results.append(exact_match[0])
    
    # Add partial matches (excluding exact match if already added)
    for pack in partial_matches:
        if pack[0] and pack[0] not in results:
            results.append(pack[0])
    
    return results[:10]  # Limit to 10 total results

@router.get("/debug-songs")
def debug_songs(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Debug endpoint to see all songs and collaborations for current user"""
    # Get all songs
    all_songs = db.query(Song).all()
    
    # Get user's collaborations
    user_collaborations = db.query(Collaboration).filter(
        Collaboration.user_id == current_user.id
    ).all()
    
    # Get songs user should see
    visible_songs = db.query(Song).filter(
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
            # Songs in packs where current user has ANY collaboration access
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
    ).all()
    
    return {
        "current_user": {
            "id": current_user.id,
            "username": current_user.username
        },
        "all_songs": [
            {
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "user_id": song.user_id,
                "pack_id": song.pack_id,
                "pack_name": song.pack_obj.name if song.pack_obj else None,
                "status": song.status
            }
            for song in all_songs
        ],
        "user_collaborations": [
            {
                "id": collab.id,
                "pack_id": collab.pack_id,
                "song_id": collab.song_id,
                "collaboration_type": collab.collaboration_type.value
            }
            for collab in user_collaborations
        ],
        "visible_songs": [
            {
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "user_id": song.user_id,
                "pack_id": song.pack_id,
                "pack_name": song.pack_obj.name if song.pack_obj else None,
                "status": song.status
            }
            for song in visible_songs
        ]
    }
