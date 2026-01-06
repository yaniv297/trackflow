from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, exists
from database import get_db
from models import Song, User, Artist, CollaborationRequest
from api.auth import get_current_active_user
from api.activity_logger import log_activity
from api.public_profiles import get_artist_images_batch
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
    artist_image_url: Optional[str] = None
    user_id: int
    username: str
    display_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        # Ensure None values are included in JSON
        exclude_none = False

class SharedConnectionsResponse(BaseModel):
    shared_songs: List[dict]
    shared_artists: List[dict]
    # Pagination info
    total_shared_songs: Optional[int] = None
    total_shared_artists: Optional[int] = None

class ArtistConnectionDetailsResponse(BaseModel):
    artist: str
    artist_image_url: Optional[str]
    other_username: str
    my_songs: List[dict]
    their_songs: List[dict]
    stats: dict

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
    search: Optional[str] = Query(None, description="Search by song title, artist, or username"),
    status: Optional[str] = Query(None, description="Filter by status"),
    sort_by: Optional[str] = Query("updated_at", description="Sort field (title, artist, username, status, updated_at)"),
    sort_direction: Optional[str] = Query("desc", description="Sort direction (asc, desc)"),
    group_by: Optional[str] = Query(None, description="Group by field (artist, user)"),
    limit: int = Query(50, ge=1, le=500, description="Number of results"),
    offset: int = Query(0, ge=0, description="Results offset"),
    include_artist_images: bool = Query(True, description="Include artist images (set to false for faster loading)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Browse all public songs with optional filtering and search"""
    
    if group_by == "artist":
        # Optimized grouping - limit data loading to prevent memory issues
        songs_query = db.query(Song, User).join(User, Song.user_id == User.id).filter(Song.is_public == True).distinct()
        
        # Apply filters to song query
        if search:
            search_term = f"%{search}%"
            songs_query = songs_query.filter(
                or_(
                    Song.title.ilike(search_term),
                    Song.artist.ilike(search_term),
                    User.username.ilike(search_term)
                )
            )
            
        if status:
            songs_query = songs_query.filter(Song.status == status)
        
        # Apply sorting - this happens BEFORE grouping and pagination
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
            songs_query = songs_query.order_by(sort_field.asc())
        else:
            songs_query = songs_query.order_by(sort_field.desc())
        
        # Get filtered and sorted results with reasonable limit for grouping
        # Limit to prevent memory issues while still providing good grouping coverage
        max_results = min(limit * 20, 1000)  # Max 1000 songs for grouping operations
        all_results = songs_query.limit(max_results).all()
        
        # Get artist images for all songs in batch (only if requested)
        artist_images = {}
        if include_artist_images:
            artist_names = [song.artist for song, _ in all_results if song.artist]
            artist_images = get_artist_images_batch(db, artist_names)
        
        # Build response objects
        all_songs = [
            PublicSongResponse(
                id=song.id,
                title=song.title,
                artist=song.artist,
                album=song.album,
                year=song.year,
                status=song.status,
                album_cover=song.album_cover,
                artist_image_url=artist_images.get(song.artist.lower()) if song.artist and include_artist_images else None,
                user_id=song.user_id,
                username=user.username,
                display_name=user.display_name,
                profile_image_url=user.profile_image_url,
                created_at=song.created_at,
                updated_at=song.updated_at
            )
            for song, user in all_results
        ]
        
        # Apply pagination to the final sorted list
        total_count = len(all_songs)
        start_index = offset
        end_index = offset + limit
        paginated_songs = all_songs[start_index:end_index]
        
        # Calculate pagination info
        page = (offset // limit) + 1
        total_pages = (total_count + limit - 1) // limit
        
        return PaginatedPublicSongsResponse(
            songs=paginated_songs,
            total_count=total_count,
            page=page,
            per_page=limit,
            total_pages=total_pages
        )
    
    elif group_by == "user":
        # Optimized grouping - limit data loading to prevent memory issues
        songs_query = db.query(Song, User).join(User, Song.user_id == User.id).filter(Song.is_public == True).distinct()
        
        # Apply filters to song query
        if search:
            search_term = f"%{search}%"
            songs_query = songs_query.filter(
                or_(
                    Song.title.ilike(search_term),
                    Song.artist.ilike(search_term),
                    User.username.ilike(search_term)
                )
            )
            
        if status:
            songs_query = songs_query.filter(Song.status == status)
        
        # Apply sorting - this happens BEFORE grouping and pagination
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
            songs_query = songs_query.order_by(sort_field.asc())
        else:
            songs_query = songs_query.order_by(sort_field.desc())
        
        # Get filtered and sorted results with reasonable limit for grouping
        # Limit to prevent memory issues while still providing good grouping coverage
        max_results = min(limit * 20, 1000)  # Max 1000 songs for grouping operations
        all_results = songs_query.limit(max_results).all()
        
        # Get artist images for all songs in batch (only if requested)
        artist_images = {}
        if include_artist_images:
            artist_names = [song.artist for song, _ in all_results if song.artist]
            artist_images = get_artist_images_batch(db, artist_names)
        
        # Build response objects
        all_songs = [
            PublicSongResponse(
                id=song.id,
                title=song.title,
                artist=song.artist,
                album=song.album,
                year=song.year,
                status=song.status,
                album_cover=song.album_cover,
                artist_image_url=artist_images.get(song.artist.lower()) if song.artist and include_artist_images else None,
                user_id=song.user_id,
                username=user.username,
                display_name=user.display_name,
                profile_image_url=user.profile_image_url,
                created_at=song.created_at,
                updated_at=song.updated_at
            )
            for song, user in all_results
        ]
        
        # Apply pagination to the final sorted list
        total_count = len(all_songs)
        start_index = offset
        end_index = offset + limit
        paginated_songs = all_songs[start_index:end_index]
        
        # Calculate pagination info
        page = (offset // limit) + 1
        total_pages = (total_count + limit - 1) // limit
        
        return PaginatedPublicSongsResponse(
            songs=paginated_songs,
            total_count=total_count,
            page=page,
            per_page=limit,
            total_pages=total_pages
        )
    
    else:
        # Optimized song-based pagination with DISTINCT
        # Base query for public songs
        query = db.query(Song, User).join(User, Song.user_id == User.id).filter(Song.is_public == True)
        
        # Add DISTINCT to prevent duplicates from JOIN
        query = query.distinct()
        
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
            
        if status:
            query = query.filter(Song.status == status)
        
        # Apply sorting with consistent secondary ordering
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
            query = query.order_by(sort_field.asc(), Song.id)
        else:
            query = query.order_by(sort_field.desc(), Song.id)
        
        # Get total count before pagination (optimized)
        if not search and not status:
            # For simple queries, use a faster count method
            total_count = db.query(Song).filter(Song.is_public == True).count()
        else:
            total_count = query.count()
        
        # Apply pagination at database level
        results = query.offset(offset).limit(limit).all()
        
        # Calculate pagination info
        page = (offset // limit) + 1
        total_pages = (total_count + limit - 1) // limit  # Ceiling division
        
        # Get artist images for all songs in batch (only if requested)
        artist_images = {}
        if include_artist_images:
            artist_names = [song.artist for song, _ in results if song.artist]
            artist_images = get_artist_images_batch(db, artist_names)
        
        songs = [
            PublicSongResponse(
                id=song.id,
                title=song.title,
                artist=song.artist,
                album=song.album,
                year=song.year,
                status=song.status,
                album_cover=song.album_cover,
                artist_image_url=artist_images.get(song.artist.lower()) if song.artist and include_artist_images else None,
                user_id=song.user_id,
                username=user.username,
                display_name=user.display_name,
                profile_image_url=user.profile_image_url,
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
    songs_limit: int = Query(100, ge=1, le=500, description="Max shared songs to return"),
    songs_offset: int = Query(0, ge=0, description="Offset for shared songs pagination"),
    artists_limit: int = Query(100, ge=1, le=500, description="Max shared artists to return"),
    artists_offset: int = Query(0, ge=0, description="Offset for shared artists pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get songs and artists shared between current user and other users"""
    
    # Get current user's songs for comparison
    my_songs = db.query(Song.title, Song.artist).filter(Song.user_id == current_user.id).subquery()
    
    # Find shared songs (same title + artist) - get song_id, album_cover, status, album, year
    shared_songs_base_query = db.query(
        User.username,
        Song.id,
        Song.title,
        Song.artist,
        Song.album_cover,
        Song.status,
        Song.album,
        Song.year
    ).select_from(Song)\
    .join(User, Song.user_id == User.id)\
    .join(my_songs, and_(Song.title == my_songs.c.title, Song.artist == my_songs.c.artist))\
    .filter(
        Song.user_id != current_user.id,
        Song.is_public == True
    ).distinct()
    
    # Get total count for shared songs
    total_shared_songs = shared_songs_base_query.count()
    
    # Apply pagination
    shared_songs_results = shared_songs_base_query.offset(songs_offset).limit(songs_limit).all()
    
    # SIMPLIFIED APPROACH: Get artists where current user has songs
    my_artist_counts = db.query(
        Song.artist,
        func.count(Song.id).label('my_count')
    ).filter(
        Song.user_id == current_user.id
    ).group_by(Song.artist).subquery()
    
    # Find other users who have public songs by the same artists
    shared_artists_base_query = db.query(
        User.username,
        Song.artist,
        func.count(Song.id).label('other_user_count'),
        my_artist_counts.c.my_count
    ).select_from(Song)\
    .join(User, Song.user_id == User.id)\
    .join(my_artist_counts, Song.artist == my_artist_counts.c.artist)\
    .filter(
        Song.user_id != current_user.id,
        Song.is_public == True
    ).group_by(User.username, Song.artist, my_artist_counts.c.my_count)\
    .order_by(func.count(Song.id).desc())
    
    # Get total count for shared artists (need a subquery for grouped count)
    total_shared_artists = db.query(func.count()).select_from(
        shared_artists_base_query.subquery()
    ).scalar()
    
    # Apply pagination
    shared_artists_query = shared_artists_base_query.offset(artists_offset).limit(artists_limit).all()
    
    # Get artist images for shared artists
    shared_artist_names = [artist for _, artist, _, _ in shared_artists_query if artist]
    artist_images = get_artist_images_batch(db, shared_artist_names)
    
    # Build detailed artist breakdown
    shared_artists = []
    for username, artist, other_user_count, my_songs_count in shared_artists_query:
        # Count shared songs (same title + artist between current user and this other user)
        shared_songs_count = db.query(func.count(Song.id)).select_from(Song)\
        .join(my_songs, and_(Song.title == my_songs.c.title, Song.artist == my_songs.c.artist))\
        .filter(
            Song.user_id != current_user.id,
            Song.artist == artist,
            Song.is_public == True
        ).scalar() or 0
        
        shared_artists.append((username, artist, other_user_count, shared_songs_count, my_songs_count))
    
    # Build response with proper field mapping - always include all fields
    shared_songs_list = []
    for result in shared_songs_results:
        # Access by index since SQLAlchemy returns tuples for multi-column queries
        username = result[0] if len(result) > 0 else None
        song_id = result[1] if len(result) > 1 else None
        title = result[2] if len(result) > 2 else None
        artist = result[3] if len(result) > 3 else None
        album_cover = result[4] if len(result) > 4 else None
        status = result[5] if len(result) > 5 else None
        album = result[6] if len(result) > 6 else None
        year = result[7] if len(result) > 7 else None
        
        shared_songs_list.append({
            "song_id": song_id,
            "username": username,
            "title": title,
            "artist": artist,
            "album_cover": album_cover,
            "status": status,
            "album": album,
            "year": year
        })
    
    # Debug: Print the first item in the list
    if shared_songs_list:
        print(f"DEBUG: First shared song dict: {shared_songs_list[0]}")
    
    return SharedConnectionsResponse(
        shared_songs=shared_songs_list,
        shared_artists=[
            {
                "username": username,
                "artist": artist,
                "song_count": other_user_count,
                "shared_songs_count": shared_songs_count,
                "my_songs_count": my_songs_count,
                "artist_image_url": artist_images.get(artist.lower()) if artist else None
            }
            for username, artist, other_user_count, shared_songs_count, my_songs_count in shared_artists
        ],
        total_shared_songs=total_shared_songs,
        total_shared_artists=total_shared_artists
    )

@router.get("/artist-connection-details", response_model=ArtistConnectionDetailsResponse)
def get_artist_connection_details(
    artist: str = Query(..., description="Artist name"),
    username: str = Query(..., description="Other user's username"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed song comparison for a specific artist between current user and another user"""
    
    # Get the other user
    other_user = db.query(User.id).filter(User.username == username).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    other_user_id = other_user.id
    
    # Normalize artist name for comparison (case-insensitive, trimmed)
    artist_normalized = artist.strip()
    
    # Optimized: Only select columns we need, use efficient filtering
    # Query my songs - select only needed columns
    my_songs_rows = db.query(
        Song.id,
        Song.title,
        Song.album,
        Song.album_cover,
        Song.status,
        Song.year
    ).filter(
        Song.user_id == current_user.id,
        func.lower(func.trim(Song.artist)) == func.lower(artist_normalized)
    ).order_by(Song.title).all()
    
    # Query their songs - select only needed columns
    their_songs_rows = db.query(
        Song.id,
        Song.title,
        Song.album,
        Song.album_cover,
        Song.status,
        Song.year
    ).filter(
        Song.user_id == other_user_id,
        func.lower(func.trim(Song.artist)) == func.lower(artist_normalized),
        Song.is_public == True
    ).order_by(Song.title).all()
    
    # Build normalized title sets for fast lookup (only do this once)
    their_titles_set = {row.title.lower().strip() for row in their_songs_rows}
    my_titles_set = {row.title.lower().strip() for row in my_songs_rows}
    
    # Build response lists with is_shared flag (single pass, efficient)
    my_songs = [
        {
            "song_id": row.id,
            "title": row.title,
            "album": row.album,
            "album_cover": row.album_cover,
            "status": row.status,
            "year": row.year,
            "is_shared": row.title.lower().strip() in their_titles_set
        }
        for row in my_songs_rows
    ]
    
    their_songs = [
        {
            "song_id": row.id,
            "title": row.title,
            "album": row.album,
            "album_cover": row.album_cover,
            "status": row.status,
            "year": row.year,
            "is_shared": row.title.lower().strip() in my_titles_set
        }
        for row in their_songs_rows
    ]
    
    # Calculate stats efficiently (use set intersection for shared count)
    shared_titles = my_titles_set.intersection(their_titles_set)
    stats = {
        "shared_count": len(shared_titles),
        "my_unique_count": len(my_titles_set - their_titles_set),
        "their_unique_count": len(their_titles_set - my_titles_set),
        "my_total": len(my_songs),
        "their_total": len(their_songs)
    }
    
    # Get artist image
    artist_images = get_artist_images_batch(db, [artist])
    artist_image_url = artist_images.get(artist.lower()) if artist else None
    
    return ArtistConnectionDetailsResponse(
        artist=artist,
        artist_image_url=artist_image_url,
        other_username=username,  # Use the username parameter directly
        my_songs=my_songs,
        their_songs=their_songs,
        stats=stats
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
    
    # Check public WIP achievements if song was made public
    if song.is_public:
        try:
            from api.achievements import check_public_wip_achievements
            check_public_wip_achievements(db, current_user.id)
        except Exception as ach_err:
            print(f"⚠️ Failed to check public WIP achievements: {ach_err}")
    
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

class ArtistImagesRequest(BaseModel):
    artist_names: List[str]

@router.post("/artist-images")
def get_artist_images(
    request: ArtistImagesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get artist image URLs for a list of artist names (for lazy loading)"""
    if not request.artist_names:
        return {"artist_images": {}}
    
    # Deduplicate and get images
    unique_artists = list(set(request.artist_names))
    artist_images = get_artist_images_batch(db, unique_artists)
    
    return {"artist_images": artist_images}

class BulkTogglePublicRequest(BaseModel):
    song_ids: List[int]
    make_public: bool

class BulkTogglePublicResponse(BaseModel):
    success_count: int
    failed_count: int
    total_count: int
    failed_song_ids: List[int]
    message: str

@router.post("/songs/bulk-toggle-public", response_model=BulkTogglePublicResponse)
def bulk_toggle_songs_public(
    request: BulkTogglePublicRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bulk toggle public status of multiple songs"""
    
    if not request.song_ids:
        raise HTTPException(status_code=400, detail="No song IDs provided")
    
    success_count = 0
    failed_count = 0
    failed_song_ids = []
    
    # Process each song
    for song_id in request.song_ids:
        try:
            # Check if song exists and user owns it
            song = db.query(Song).filter(Song.id == song_id, Song.user_id == current_user.id).first()
            if not song:
                failed_count += 1
                failed_song_ids.append(song_id)
                continue
            
            # Only update if the status is different
            if song.is_public != request.make_public:
                song.is_public = request.make_public
                success_count += 1
                
                # Log the activity for significant changes
                try:
                    log_activity(
                        db=db,
                        user_id=current_user.id,
                        activity_type="bulk_toggle_song_public",
                        description=f"{'Made public' if request.make_public else 'Made private'}: {song.title} by {song.artist}",
                        metadata={
                            "song_id": song_id,
                            "is_public": request.make_public,
                            "bulk_operation": True
                        }
                    )
                except Exception as log_err:
                    print(f"⚠️ Failed to log bulk song public toggle for song {song_id}: {log_err}")
            
        except Exception as e:
            print(f"⚠️ Error processing song {song_id}: {e}")
            failed_count += 1
            failed_song_ids.append(song_id)
    
    # Commit all changes at once
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save changes: {str(e)}")
    
    # Check public WIP achievements if any songs were made public
    if request.make_public and success_count > 0:
        try:
            from api.achievements import check_public_wip_achievements
            check_public_wip_achievements(db, current_user.id)
        except Exception as ach_err:
            print(f"⚠️ Failed to check public WIP achievements after bulk operation: {ach_err}")
    
    total_count = len(request.song_ids)
    
    return BulkTogglePublicResponse(
        success_count=success_count,
        failed_count=failed_count,
        total_count=total_count,
        failed_song_ids=failed_song_ids,
        message=f"Successfully updated {success_count} out of {total_count} songs"
    )

@router.get("/check-duplicates")
def check_song_duplicates(
    title: str = Query(..., description="Song title to check"),
    artist: str = Query(..., description="Artist name to check"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Check if a song already exists by other users for duplicate warnings."""
    
    if not title or not artist:
        return {"matches": []}
    
    # Query for exact matches (case-insensitive)
    # For Released songs: always visible regardless of is_public flag
    # For WIP/Future Plans: only if is_public is True
    # Exclude current user's songs
    query = db.query(Song, User).join(User, Song.user_id == User.id).filter(
        Song.title.ilike(title.strip()),
        Song.artist.ilike(artist.strip()),
        Song.user_id != current_user.id  # Exclude current user's songs
    ).filter(
        or_(
            Song.status == "Released",  # Released songs are always visible
            and_(
                Song.is_public == True,  # WIP/Future Plans only if public
                Song.status.in_(["In Progress", "Future Plans"])
            )
        )
    )
    
    results = query.all()
    
    matches = [
        {
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "status": song.status,
            "user_id": song.user_id,
            "username": user.username,
            "display_name": user.display_name,
            "profile_image_url": user.profile_image_url,
            "created_at": song.created_at,
            "updated_at": song.updated_at
        }
        for song, user in results
    ]
    
    return {"matches": matches}

class MakeAllFuturePlansResponse(BaseModel):
    success_count: int
    message: str

@router.post("/make-all-future-plans-public", response_model=MakeAllFuturePlansResponse)
def make_all_future_plans_public(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Efficiently make all Future Plans songs public for the current user using a single SQL UPDATE query.
    Also sets the user's default_public_sharing setting to True so future songs are public by default."""
    
    try:
        # Reload user from database to ensure it's attached to the session
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Use a single SQL UPDATE query to update all Future Plans songs for this user
        # Only update songs that are currently private (is_public = False)
        result = db.query(Song).filter(
            Song.user_id == user.id,
            Song.status == "Future Plans",
            Song.is_public == False
        ).update(
            {"is_public": True},
            synchronize_session=False
        )
        
        # Also set the user's default_public_sharing to True so future songs are public by default
        user.default_public_sharing = True
        
        db.commit()
        
        # Log the activity
        try:
            log_activity(
                db=db,
                user_id=user.id,
                activity_type="make_all_future_plans_public",
                description=f"Made all Future Plans songs public ({result} songs) and enabled default public sharing",
                metadata={
                    "success_count": result,
                    "default_public_sharing_enabled": True
                }
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log make all future plans public: {log_err}")
        
        # Check public WIP achievements if any songs were made public
        if result > 0:
            try:
                from api.achievements import check_public_wip_achievements
                check_public_wip_achievements(db, user.id)
            except Exception as ach_err:
                print(f"⚠️ Failed to check public WIP achievements: {ach_err}")
        
        return MakeAllFuturePlansResponse(
            success_count=result,
            message=f"Successfully made {result} Future Plans songs public"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to make Future Plans songs public: {str(e)}")

@router.post("/make-all-future-plans-private", response_model=MakeAllFuturePlansResponse)
def make_all_future_plans_private(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Efficiently make all Future Plans songs private for the current user using a single SQL UPDATE query.
    Also sets the user's default_public_sharing setting to False so future songs are private by default."""
    
    try:
        # Reload user from database to ensure it's attached to the session
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Use a single SQL UPDATE query to update all Future Plans songs for this user
        # Only update songs that are currently public (is_public = True)
        result = db.query(Song).filter(
            Song.user_id == user.id,
            Song.status == "Future Plans",
            Song.is_public == True
        ).update(
            {"is_public": False},
            synchronize_session=False
        )
        
        # Also set the user's default_public_sharing to False so future songs are private by default
        user.default_public_sharing = False
        
        db.commit()
        
        # Log the activity
        try:
            log_activity(
                db=db,
                user_id=user.id,
                activity_type="make_all_future_plans_private",
                description=f"Made all Future Plans songs private ({result} songs) and disabled default public sharing",
                metadata={
                    "success_count": result,
                    "default_public_sharing_enabled": False
                }
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log make all future plans private: {log_err}")
        
        return MakeAllFuturePlansResponse(
            success_count=result,
            message=f"Successfully made {result} Future Plans songs private"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to make Future Plans songs private: {str(e)}")