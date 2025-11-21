from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from schemas import SongCreate, SongOut
from models import SongStatus, User
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