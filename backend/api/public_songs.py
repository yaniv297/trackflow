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

class PaginatedPublicSongsResponse(BaseModel):
    songs: List[PublicSongResponse]
    total_count: int
    page: int
    per_page: int
    total_pages: int

@router.get("/browse", response_model=PaginatedPublicSongsResponse)
def browse_public_songs(
    search: Optional[str] = Query(None, description="Search by song title or artist"),
    artist: Optional[str] = Query(None, description="Filter by artist name"),
    user: Optional[str] = Query(None, description="Filter by username"),
    status: Optional[str] = Query(None, description="Filter by status"),
    sort_by: Optional[str] = Query("updated_at", description="Sort field (title, artist, username, status, updated_at)"),
    sort_direction: Optional[str] = Query("desc", description="Sort direction (asc, desc)"),
    group_by: Optional[str] = Query(None, description="Group by field (artist, user)"),
    limit: int = Query(50, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Results offset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Browse all public songs with optional filtering and search"""
    
    if group_by == "artist":
        # When grouping by artist, we need to handle pagination differently
        # First, get unique artists with filtering
        artist_query = db.query(Song.artist.distinct().label('artist')).join(User, Song.user_id == User.id).filter(Song.is_public == True)
        
        # Apply filters to artist query
        if search:
            search_term = f"%{search}%"
            artist_query = artist_query.filter(
                or_(
                    Song.title.ilike(search_term),
                    Song.artist.ilike(search_term),
                    User.username.ilike(search_term)
                )
            )
        
        if artist:
            artist_query = artist_query.filter(Song.artist.ilike(f"%{artist}%"))
        
        if user:
            artist_query = artist_query.filter(User.username.ilike(f"%{user}%"))
            
        if status:
            artist_query = artist_query.filter(Song.status == status)
        
        # Sort artists
        if sort_by == 'artist':
            if sort_direction.lower() == 'asc':
                artist_query = artist_query.order_by(Song.artist.asc())
            else:
                artist_query = artist_query.order_by(Song.artist.desc())
        else:
            # For other sort fields, we'll sort by artist for now
            artist_query = artist_query.order_by(Song.artist.asc())
        
        # Get total artist count
        total_artists = artist_query.count()
        
        # Apply pagination to artists
        paginated_artists = artist_query.offset(offset).limit(limit).all()
        artist_names = [row.artist for row in paginated_artists]
        
        # Now get all songs for these artists
        if artist_names:
            songs_query = db.query(Song, User).join(User, Song.user_id == User.id).filter(
                Song.is_public == True,
                Song.artist.in_(artist_names)
            )
            
            # Apply same filters to songs query (except artist filter since we're already filtering by artist names)
            if search:
                search_term = f"%{search}%"
                songs_query = songs_query.filter(
                    or_(
                        Song.title.ilike(search_term),
                        Song.artist.ilike(search_term),
                        User.username.ilike(search_term)
                    )
                )
            
            if user:
                songs_query = songs_query.filter(User.username.ilike(f"%{user}%"))
                
            if status:
                songs_query = songs_query.filter(Song.status == status)
            
            # Sort songs within each artist group
            songs_query = songs_query.order_by(Song.artist.asc(), Song.updated_at.desc())
            
            results = songs_query.all()
        else:
            results = []
        
        # Calculate pagination info
        page = (offset // limit) + 1
        total_pages = (total_artists + limit - 1) // limit
        
        songs = [
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
        
        return PaginatedPublicSongsResponse(
            songs=songs,
            total_count=total_artists,  # Total count is number of artists, not songs
            page=page,
            per_page=limit,
            total_pages=total_pages
        )
    
    elif group_by == "user":
        # When grouping by user, we need to handle pagination differently
        # First, get unique users with filtering
        user_query = db.query(User.id, User.username, User.display_name, User.profile_image_url).join(Song, User.id == Song.user_id).filter(Song.is_public == True).distinct()
        
        # Apply filters to user query
        if search:
            search_term = f"%{search}%"
            user_query = user_query.filter(
                or_(
                    Song.title.ilike(search_term),
                    Song.artist.ilike(search_term),
                    User.username.ilike(search_term)
                )
            )
        
        if artist:
            user_query = user_query.filter(Song.artist.ilike(f"%{artist}%"))
        
        if user:
            user_query = user_query.filter(User.username.ilike(f"%{user}%"))
            
        if status:
            user_query = user_query.filter(Song.status == status)
        
        # Sort users
        if sort_by == 'username':
            if sort_direction.lower() == 'asc':
                user_query = user_query.order_by(User.username.asc())
            else:
                user_query = user_query.order_by(User.username.desc())
        else:
            # For other sort fields, we'll sort by username for now
            user_query = user_query.order_by(User.username.asc())
        
        # Get total user count
        total_users = user_query.count()
        
        # Apply pagination to users
        paginated_users = user_query.offset(offset).limit(limit).all()
        user_ids = [row.id for row in paginated_users]
        
        # Now get all songs for these users
        if user_ids:
            songs_query = db.query(Song, User).join(User, Song.user_id == User.id).filter(
                Song.is_public == True,
                Song.user_id.in_(user_ids)
            )
            
            # Apply same filters to songs query (except user filter since we're already filtering by user IDs)
            if search:
                search_term = f"%{search}%"
                songs_query = songs_query.filter(
                    or_(
                        Song.title.ilike(search_term),
                        Song.artist.ilike(search_term),
                        User.username.ilike(search_term)
                    )
                )
            
            if artist:
                songs_query = songs_query.filter(Song.artist.ilike(f"%{artist}%"))
                
            if status:
                songs_query = songs_query.filter(Song.status == status)
            
            # Sort songs within each user group
            songs_query = songs_query.order_by(User.username.asc(), Song.updated_at.desc())
            
            results = songs_query.all()
        else:
            results = []
        
        # Calculate pagination info
        page = (offset // limit) + 1
        total_pages = (total_users + limit - 1) // limit
        
        songs = [
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
        
        return PaginatedPublicSongsResponse(
            songs=songs,
            total_count=total_users,  # Total count is number of users, not songs
            page=page,
            per_page=limit,
            total_pages=total_pages
        )
    
    else:
        # Original song-based pagination
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
        
        # Apply sorting
        sort_field_map = {
            'title': Song.title,
            'artist': Song.artist,
            'username': User.username,
            'status': Song.status,
            'updated_at': Song.updated_at
        }
        
        if sort_by not in sort_field_map:
            sort_by = 'updated_at'  # Default fallback
        
        sort_field = sort_field_map[sort_by]
        
        if sort_direction.lower() == 'asc':
            query = query.order_by(sort_field.asc())
        else:
            query = query.order_by(sort_field.desc())
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply pagination
        results = query.offset(offset).limit(limit).all()
        
        # Calculate pagination info
        page = (offset // limit) + 1
        total_pages = (total_count + limit - 1) // limit  # Ceiling division
        
        songs = [
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
        
        return PaginatedPublicSongsResponse(
            songs=songs,
            total_count=total_count,
            page=page,
            per_page=limit,
            total_pages=total_pages
        )

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