"""Main pack CRUD routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from api.auth import get_current_active_user
from ..schemas import PackCreate, PackUpdate, PackResponse
from ..services.pack_service import PackService

router = APIRouter()


@router.get("/autocomplete")
def get_pack_autocomplete(
    query: str = Query(""),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get pack name autocomplete suggestions."""
    # Import here to avoid circular imports
    from api.songs.services.song_service import SongService
    from api.songs.validators.song_validators import SongValidator
    
    if query and query.strip():
        SongValidator.validate_autocomplete_query(query)
    
    service = SongService(db)
    suggestions = service.get_autocomplete_suggestions("packs", query, current_user)
    return {"suggestions": suggestions}


@router.post("/", response_model=PackResponse)
def create_pack(
    pack: PackCreate, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Create a new pack."""
    pack_service = PackService(db)
    return pack_service.create_pack(pack, current_user.id)


@router.get("/", response_model=List[PackResponse])
def get_packs(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Get all packs for the current user."""
    pack_service = PackService(db)
    return pack_service.get_user_packs(current_user.id)


@router.get("/{pack_id}", response_model=PackResponse)
def get_pack(
    pack_id: int, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Get a specific pack."""
    pack_service = PackService(db)
    pack = pack_service.get_pack_by_id(pack_id, current_user.id)
    
    return PackResponse(
        id=pack.id,
        name=pack.name,
        user_id=pack.user_id,
        priority=pack.priority,
        created_at=pack.created_at.isoformat() if pack.created_at else "",
        updated_at=pack.updated_at.isoformat() if pack.updated_at else "",
        released_at=pack.released_at.isoformat() if pack.released_at else None,
        release_title=pack.release_title,
        release_description=pack.release_description,
        release_download_link=pack.release_download_link,
        release_youtube_url=pack.release_youtube_url
    )


@router.patch("/{pack_id}", response_model=PackResponse)
def update_pack(
    pack_id: int, 
    pack_update: PackUpdate, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Update a pack."""
    pack_service = PackService(db)
    return pack_service.update_pack(pack_id, pack_update, current_user.id)


@router.delete("/{pack_id}")
def delete_pack(
    pack_id: int, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Delete a pack."""
    pack_service = PackService(db)
    pack_service.delete_pack(pack_id, current_user.id)
    return {"message": "Pack deleted successfully"}