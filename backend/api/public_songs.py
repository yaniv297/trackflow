from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from database import get_db
from models import Song, User, Artist, CollaborationRequest
from api.auth import get_current_active_user
from api.activity_logger import log_activity
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/public-songs", tags=["Public Songs"])

class PublicSongResponse(BaseModel):
    id: int
    title: str
    artist: str
    album: Optional[str] = None
    year: Optional[int] = None
    status: str
    album_cover: Optional[str] = None
    user_id: int
    username: str
    display_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SharedConnectionsResponse(BaseModel):
    shared_songs: List[dict]
    shared_artists: List[dict]

class TogglePublicRequest(BaseModel):
    song_id: int

@router.get("/browse", response_model=List[PublicSongResponse])
def browse_public_songs(
    search: Optional[str] = Query(None, description="Search by song title or artist"),
    artist: Optional[str] = Query(None, description="Filter by artist name"),
    user: Optional[str] = Query(None, description="Filter by username"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Results offset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Browse all public songs with optional filtering and search"""
    
    # Base query for public songs
    query = db.query(Song, User).join(User, Song.user_id == User.id).filter(Song.is_public == True)
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Song.title.ilike(search_term),
                Song.artist.ilike(search_term),
                User.username.ilike(search_term)
            )
        )
    
    if artist:
        query = query.filter(Song.artist.ilike(f"%{artist}%"))
    
    if user:
        query = query.filter(User.username.ilike(f"%{user}%"))
        
    if status:
        query = query.filter(Song.status == status)
    
    # Order by most recent first
    query = query.order_by(Song.updated_at.desc())
    
    # Apply pagination
    results = query.offset(offset).limit(limit).all()
    
    return [
        PublicSongResponse(
            id=song.id,
            title=song.title,
            artist=song.artist,
            album=song.album,
            year=song.year,
            status=song.status,
            album_cover=song.album_cover,
            user_id=song.user_id,
            username=user.username,
            display_name=user.display_name,
            created_at=song.created_at,
            updated_at=song.updated_at
        )
        for song, user in results
    ]

@router.get("/shared-connections", response_model=SharedConnectionsResponse)
def get_shared_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get songs and artists shared between current user and other users"""
    
    # Get current user's songs for comparison
    my_songs = db.query(Song.title, Song.artist).filter(Song.user_id == current_user.id).subquery()
    
    # Find shared songs (same title + artist)
    shared_songs = db.query(
        User.username,
        Song.title,
        Song.artist
    ).select_from(Song)\
    .join(User, Song.user_id == User.id)\
    .join(my_songs, and_(Song.title == my_songs.c.title, Song.artist == my_songs.c.artist))\
    .filter(
        Song.user_id != current_user.id,
        Song.is_public == True
    ).distinct().limit(10).all()
    
    # Get current user's artists for comparison
    my_artists = db.query(Song.artist).filter(Song.user_id == current_user.id).distinct().subquery()
    
    # Find shared artists
    shared_artists = db.query(
        User.username,
        Song.artist,
        func.count(Song.id).label('song_count')
    ).select_from(Song)\
    .join(User, Song.user_id == User.id)\
    .join(my_artists, Song.artist == my_artists.c.artist)\
    .filter(
        Song.user_id != current_user.id,
        Song.is_public == True
    ).group_by(User.username, Song.artist)\
    .order_by(func.count(Song.id).desc())\
    .limit(10).all()
    
    return SharedConnectionsResponse(
        shared_songs=[
            {
                "username": username,
                "title": title,
                "artist": artist
            }
            for username, title, artist in shared_songs
        ],
        shared_artists=[
            {
                "username": username,
                "artist": artist,
                "song_count": count
            }
            for username, artist, count in shared_artists
        ]
    )

@router.post("/songs/{song_id}/toggle-public")
def toggle_song_public(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle public status of a song"""
    
    # Check if song exists and user owns it
    song = db.query(Song).filter(Song.id == song_id, Song.user_id == current_user.id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found or access denied")
    
    # Toggle the public status
    song.is_public = not song.is_public
    db.commit()
    
    # Log the activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="toggle_song_public",
            description=f"{'Made public' if song.is_public else 'Made private'}: {song.title} by {song.artist}",
            metadata={
                "song_id": song_id,
                "is_public": song.is_public
            }
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log song public toggle: {log_err}")
    
    return {
        "song_id": song_id,
        "is_public": song.is_public,
        "message": f"Song {'made public' if song.is_public else 'made private'}"
    }

@router.post("/users/toggle-default-sharing")
def toggle_user_default_sharing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Toggle user's default public sharing setting"""
    
    # Toggle the default sharing setting
    current_user.default_public_sharing = not current_user.default_public_sharing
    db.commit()
    
    # If enabling default sharing, make all future songs public
    # If disabling, existing songs remain unchanged (user choice)
    
    # Log the activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="toggle_default_sharing",
            description=f"{'Enabled' if current_user.default_public_sharing else 'Disabled'} default public sharing",
            metadata={
                "default_public_sharing": current_user.default_public_sharing
            }
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log default sharing toggle: {log_err}")
    
    return {
        "default_public_sharing": current_user.default_public_sharing,
        "message": f"Default sharing {'enabled' if current_user.default_public_sharing else 'disabled'}"
    }

@router.get("/my-public-songs", response_model=List[PublicSongResponse])
def get_my_public_songs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's public songs"""
    
    songs = db.query(Song).filter(
        Song.user_id == current_user.id,
        Song.is_public == True
    ).order_by(Song.updated_at.desc()).all()
    
    return [
        PublicSongResponse(
            id=song.id,
            title=song.title,
            artist=song.artist,
            album=song.album,
            year=song.year,
            status=song.status,
            album_cover=song.album_cover,
            user_id=song.user_id,
            username=current_user.username,
            display_name=current_user.display_name,
            created_at=song.created_at,
            updated_at=song.updated_at
        )
        for song in songs
    ]