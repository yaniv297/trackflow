from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Song, SongStatus, User, Pack
from sqlalchemy import func, text, desc
from api.auth import get_current_active_user, get_optional_user
from typing import Optional

router = APIRouter(prefix="/community", tags=["Community"])

@router.get("/public-wips")
def get_public_wips(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get random public songs from Future Plans and WIP status.
    Only shows songs that users have explicitly made public.
    """
    
    # Get public songs from Future Plans and WIP status (excluding current user if authenticated)
    query = db.query(
        Song.id,
        Song.title,
        Song.artist,
        Song.album,
        Song.album_cover,
        Song.year,
        Song.status,
        Song.created_at,
        Song.updated_at,
        User.username.label('author')
    ).join(User, Song.user_id == User.id).filter(
        Song.is_public == True,  # Only show public songs
        Song.status.in_([SongStatus.future, SongStatus.wip]),  # Future Plans or WIP only
        Song.title.isnot(None),
        Song.artist.isnot(None)
    )
    
    # Exclude current user's songs if authenticated
    if current_user:
        query = query.filter(Song.user_id != current_user.id)
    
    # Fully random selection on every request
    try:
        # For SQLite, use RANDOM() for pure randomization
        wips = query.order_by(func.random()).limit(limit).all()
    except:
        # Fallback: order by id desc and take latest
        wips = query.order_by(desc(Song.id)).limit(limit).all()
    
    # Calculate completion percentage based on status
    result = []
    for wip in wips:
        # More realistic completion percentage based on status
        if wip.status == SongStatus.future:
            # Future Plans: 5-25% completion
            mock_completion = hash(str(wip.id)) % 20 + 5
        else:  # SongStatus.wip
            # WIP: 25-85% completion  
            mock_completion = hash(str(wip.id)) % 60 + 25
        
        result.append({
            "id": wip.id,
            "title": wip.title,
            "artist": wip.artist,
            "album": wip.album,
            "album_cover": wip.album_cover,
            "year": wip.year,
            "status": wip.status.value if hasattr(wip.status, 'value') else str(wip.status),
            "author": wip.author,
            "created_at": wip.created_at,
            "updated_at": wip.updated_at,
            "completion_percentage": mock_completion
        })
    
    return result