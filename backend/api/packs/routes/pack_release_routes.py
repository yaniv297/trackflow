"""Pack release and status routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from api.auth import get_current_active_user
from ..schemas import PackStatusUpdate, PackReleaseData, PackResponse
from ..services.pack_release_service import PackReleaseService

router = APIRouter()


@router.patch("/{pack_id}/status", response_model=PackResponse)
def update_pack_status(
    pack_id: int, 
    status_update: PackStatusUpdate, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Update pack status."""
    release_service = PackReleaseService(db)
    return release_service.update_pack_status(
        pack_id, 
        status_update.status, 
        current_user.id
    )


@router.post("/{pack_id}/release", response_model=PackResponse)
def release_pack_with_metadata(
    pack_id: int,
    release_data: PackReleaseData,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Release a pack with metadata."""
    print(f"🚨 ROUTE DEBUG: Pack release route called for pack {pack_id} by user {current_user.id}")
    release_service = PackReleaseService(db)
    return release_service.release_pack(pack_id, release_data, current_user.id)