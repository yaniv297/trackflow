from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from database import get_db
from models import Song, User, Artist, CollaborationRequest, RockBandDLC
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
    limit: int = Query(50, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Results offset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Browse all public songs with optional filtering and search"""
    
    if group_by == "artist":
        # When grouping by artist, get ALL songs first, then group and paginate
        songs_query = db.query(Song, User).join(User, Song.user_id == User.id).filter(Song.is_public == True)
        
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
        
        # Get all filtered and sorted results
        all_results = songs_query.all()
        
        # Get artist images for all songs in batch
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
                artist_image_url=artist_images.get(song.artist.lower()) if song.artist else None,
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
        # When grouping by user, get ALL songs first, then group and paginate
        songs_query = db.query(Song, User).join(User, Song.user_id == User.id).filter(Song.is_public == True)
        
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
        
        # Get all filtered and sorted results
        all_results = songs_query.all()
        
        # Get artist images for all songs in batch
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
                artist_image_url=artist_images.get(song.artist.lower()) if song.artist else None,
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
        
        # Get artist images for all songs in batch
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
                artist_image_url=artist_images.get(song.artist.lower()) if song.artist else None,
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get songs and artists shared between current user and other users"""
    
    # Get current user's songs for comparison
    my_songs = db.query(Song.title, Song.artist).filter(Song.user_id == current_user.id).subquery()
    
    # Find shared songs (same title + artist) - get song_id, album_cover, status, album, year
    shared_songs_query = db.query(
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
    ).distinct().limit(10)
    
    shared_songs_results = shared_songs_query.all()
    
    # Debug: Print first result to see what we're getting
    if shared_songs_results:
        print(f"DEBUG: First shared song result: {shared_songs_results[0]}")
        print(f"DEBUG: Result type: {type(shared_songs_results[0])}")
        print(f"DEBUG: Result length: {len(shared_songs_results[0]) if hasattr(shared_songs_results[0], '__len__') else 'N/A'}")
    
    # SIMPLIFIED APPROACH: Get artists where current user has songs
    my_artist_counts = db.query(
        Song.artist,
        func.count(Song.id).label('my_count')
    ).filter(
        Song.user_id == current_user.id
    ).group_by(Song.artist).subquery()
    
    # Find other users who have public songs by the same artists
    shared_artists_query = db.query(
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
    .order_by(func.count(Song.id).desc())\
    .limit(10).all()
    
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

class SongCheckRequest(BaseModel):
    title: str
    artist: str

class BulkSongCheckRequest(BaseModel):
    songs: List[SongCheckRequest]

class SongCheckResult(BaseModel):
    title: str
    artist: str
    dlc_status: Optional[dict] = None
    trackflow_matches: List[dict] = []

@router.post("/check-duplicates-batch", response_model=List[SongCheckResult])
def check_song_duplicates_batch(
    request: BulkSongCheckRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Check multiple songs for duplicates, DLC status, and collaboration opportunities.
    
    Returns per-song results with:
    - dlc_status: DLC check result (if song is official DLC)
    - trackflow_matches: List of matches from other users (Released, In Progress, Future Plans)
    """
    results = []
    
    for song_req in request.songs:
        title = song_req.title.strip()
        artist = song_req.artist.strip()
        
        if not title or not artist:
            results.append(SongCheckResult(
                title=title,
                artist=artist,
                dlc_status=None,
                trackflow_matches=[]
            ))
            continue
        
        # Check DLC status
        dlc_status = None
        try:
            # Search for exact matches first (case insensitive)
            exact_match = db.query(RockBandDLC).filter(
                RockBandDLC.title.ilike(title),
                RockBandDLC.artist.ilike(artist)
            ).first()
            
            if exact_match:
                dlc_status = {
                    "is_dlc": True,
                    "origin": exact_match.origin,
                    "match_type": "exact",
                    "dlc_entry": {
                        "id": exact_match.id,
                        "title": exact_match.title,
                        "artist": exact_match.artist,
                        "origin": exact_match.origin
                    }
                }
            else:
                # Search for partial matches
                partial_matches = db.query(RockBandDLC).filter(
                    RockBandDLC.title.ilike(f"%{title}%"),
                    RockBandDLC.artist.ilike(f"%{artist}%")
                ).limit(5).all()
                
                if partial_matches:
                    dlc_status = {
                        "is_dlc": True,
                        "origin": partial_matches[0].origin,
                        "match_type": "partial",
                        "dlc_entry": {
                            "id": partial_matches[0].id,
                            "title": partial_matches[0].title,
                            "artist": partial_matches[0].artist,
                            "origin": partial_matches[0].origin
                        },
                        "similar_matches": [
                            {
                                "id": match.id,
                                "title": match.title,
                                "artist": match.artist,
                                "origin": match.origin
                            }
                            for match in partial_matches
                        ]
                    }
                else:
                    dlc_status = {
                        "is_dlc": False,
                        "origin": None,
                        "match_type": None,
                        "dlc_entry": None
                    }
        except Exception as e:
            # If DLC check fails, continue without DLC status
            print(f"Error checking DLC for {title} by {artist}: {e}")
            dlc_status = {
                "is_dlc": False,
                "origin": None,
                "match_type": None,
                "dlc_entry": None
            }
        
        # Check TrackFlow matches (released songs and public WIP/collaboration opportunities)
        trackflow_matches = []
        try:
            # Query for exact matches (case-insensitive)
            # For Released songs: always visible regardless of is_public flag
            # For WIP/Future Plans: only if is_public is True
            # Exclude current user's songs
            query = db.query(Song, User).join(User, Song.user_id == User.id).filter(
                Song.title.ilike(title),
                Song.artist.ilike(artist),
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
            
            query_results = query.all()
            
            trackflow_matches = [
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
                for song, user in query_results
            ]
        except Exception as e:
            # If TrackFlow check fails, continue without matches
            print(f"Error checking TrackFlow matches for {title} by {artist}: {e}")
            trackflow_matches = []
        
        results.append(SongCheckResult(
            title=title,
            artist=artist,
            dlc_status=dlc_status,
            trackflow_matches=trackflow_matches
        ))
    
    return results