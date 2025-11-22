from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
from schemas import SongCreate, SongOut
from models import SongStatus, User, Song, Pack
from api.auth import get_current_active_user

from ..services.song_service import SongService
from ..validators.song_validators import SongValidator


router = APIRouter()


@router.post("/", response_model=SongOut)
def create_song(
    song: SongCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new song."""
    SongValidator.validate_song_create(song)
    
    service = SongService(db)
    return service.create_song(song, current_user)


@router.get("/", response_model=List[SongOut])
def get_filtered_songs(
    status: Optional[SongStatus] = Query(None),
    query: Optional[str] = Query(None),
    pack_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get filtered songs with access control."""
    if query:
        SongValidator.validate_search_query(query)
    
    service = SongService(db)
    return service.get_filtered_songs(current_user, status, query, pack_id)


@router.patch("/{song_id}", response_model=SongOut)
def update_song(
    song_id: int,
    updates: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a song."""
    SongValidator.validate_song_update(updates)
    
    service = SongService(db)
    return service.update_song(song_id, updates, current_user)


@router.delete("/{song_id}", status_code=204)
def delete_song(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a song."""
    service = SongService(db)
    service.delete_song(song_id, current_user)


@router.post("/batch", response_model=List[SongOut])
def create_songs_batch(
    songs: List[SongCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create multiple songs in batch."""
    SongValidator.validate_batch_create(songs)
    
    service = SongService(db)
    return service.create_songs_batch(songs, current_user)


@router.post("/bulk-delete")
def bulk_delete(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete multiple songs."""
    song_ids = data.get("song_ids", [])
    SongValidator.validate_song_ids(song_ids)
    
    service = SongService(db)
    return service.bulk_delete_songs(song_ids, current_user)


@router.post("/{song_id}/collaborations")
def add_collaborations(
    song_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add collaborations to a song."""
    collaborations_data = data.get("collaborations", [])
    SongValidator.validate_collaboration_data(collaborations_data)
    
    service = SongService(db)
    return service.add_song_collaborations(song_id, collaborations_data, current_user)


@router.post("/release-pack")
def release_pack(
    pack_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Release a pack."""
    SongValidator.validate_pack_name(pack_name)
    
    service = SongService(db)
    return service.release_pack(pack_name, current_user)


@router.get("/recent-releases", response_model=List[SongOut])
def get_recent_releases(
    limit: int = Query(10, le=50, description="Maximum number of releases to return"),
    db: Session = Depends(get_db)
):
    """Get recently released songs, ordered by release date."""
    # This endpoint is public - no authentication required
    recent_releases = db.query(Song).options(
        joinedload(Song.user),
        joinedload(Song.pack_obj).joinedload(Pack.user)
    ).filter(
        Song.status == "Released",
        Song.released_at.isnot(None)
    ).order_by(Song.released_at.desc()).limit(limit).all()
    
    # Convert to SongOut format
    releases_data = []
    for song in recent_releases:
        song_dict = {
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "album": song.album,
            "year": song.year,
            "status": song.status,
            "album_cover": song.album_cover,
            "user_id": song.user_id,
            "pack_id": song.pack_id,
            "pack_name": song.pack_obj.name if song.pack_obj else None,
            "pack_priority": song.pack_obj.priority if song.pack_obj else None,
            "pack_owner_id": song.pack_obj.user_id if song.pack_obj else None,
            "pack_owner_username": song.pack_obj.user.username if song.pack_obj and song.pack_obj.user else None,
            "optional": song.optional,
            "author": song.user.username if song.user else "Unknown",  # Required field
            "collaborations": [],
            "authoring": None,
            "artist_image_url": None,
            "album_series_id": None,
            "album_series_number": None,
            "album_series_name": None,
            "is_editable": False,  # Public endpoint, no edit permissions
            "pack_collaboration": None,
            "released_at": song.released_at,
        }
        releases_data.append(song_dict)
    
    return [SongOut(**release) for release in releases_data]