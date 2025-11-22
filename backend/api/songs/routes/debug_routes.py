from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import User
from api.auth import get_current_active_user

from ..services.song_service import SongService


router = APIRouter()


@router.get("/debug-songs")
def debug_songs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Debug endpoint to show song visibility information."""
    service = SongService(db)
    return service.debug_songs(current_user)