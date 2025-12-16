from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, update, text
from database import get_db
from models import Song, User, Artist, CollaborationRequest, RockBandDLC
from api.auth import get_current_active_user
from api.activity_logger import log_activity
from api.public_profiles import get_artist_images_batch
from utils.cache import cached, cache_key_for_public_songs
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/public-songs", tags=["Public Songs"])

def _build_base_query(db: Session, search: Optional[str] = None, status: Optional[str] = None):
    """Build the base query with filters applied."""
    query = db.query(Song, User).join(User, Song.user_id == User.id).filter(Song.is_public == True)
    
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
    
    return query

def _apply_sorting(query, sort_by: str, sort_direction: str):
    """Apply sorting to the query."""
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
        return query.order_by(sort_field.asc())
    else:
        return query.order_by(sort_field.desc())

def _build_song_response(song, user, artist_images):
    """Build a PublicSongResponse object."""
    return PublicSongResponse(
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

def _handle_default_query(db: Session, search: Optional[str], status: Optional[str], 
                         sort_by: str, sort_direction: str, limit: int, offset: int):
    """Handle default (non-grouped) query with proper pagination."""
    query = _build_base_query(db, search, status)
    query = _apply_sorting(query, sort_by, sort_direction)
    
    # Optimize count query - use estimated count for better performance
    total_count = _get_optimized_count(db, query, search, status)
    
    # Apply pagination at database level
    results = query.offset(offset).limit(limit).all()
    
    # Calculate pagination info
    page = (offset // limit) + 1
    total_pages = (total_count + limit - 1) // limit
    
    # Get artist images in batch
    artist_names = [song.artist for song, _ in results if song.artist]
    artist_images = get_artist_images_batch(db, artist_names)
    
    songs = [
        _build_song_response(song, user, artist_images)
        for song, user in results
    ]
    
    return PaginatedPublicSongsResponse(
        songs=songs,
        total_count=total_count,
        page=page,
        per_page=limit,
        total_pages=total_pages
    )

def _get_optimized_count(db: Session, query, search: Optional[str], status: Optional[str]) -> int:
    """Get optimized count that avoids expensive operations for large datasets."""
    # For simple queries without search, use estimated count from database statistics
    if not search and not status:
        # Use PostgreSQL/SQLite table statistics for rough count (much faster)
        try:
            # For PostgreSQL, use pg_class.reltuples for estimation
            if "postgresql" in str(db.bind.url).lower():
                result = db.execute(text("""
                    SELECT reltuples::bigint AS estimate
                    FROM pg_class 
                    WHERE relname = 'songs'
                """)).fetchone()
                if result and result[0] > 0:
                    # Estimate public songs as ~30% of total (adjust based on your data)
                    estimated_total = int(result[0] * 0.3)
                    return max(estimated_total, 100)  # Minimum reasonable count
        except Exception:
            pass  # Fallback to actual count
    
    # For complex queries or small datasets, use actual count
    # But limit the count query to prevent timeouts
    try:
        return query.limit(10000).count()  # Limit count operation
    except Exception:
        return query.count()  # Fallback to normal count

def _handle_grouped_query(db: Session, group_by: str, search: Optional[str], status: Optional[str],
                         sort_by: str, sort_direction: str, limit: int, offset: int):
    """Handle grouped queries (artist/user) with efficient database operations."""
    # For now, we'll use a simplified approach that's still much better than loading everything
    # This could be further optimized with window functions in the future
    
    # Build base query with sorting
    query = _build_base_query(db, search, status)
    query = _apply_sorting(query, sort_by, sort_direction)
    
    # For grouped results, we still need to be careful about memory usage
    # Use a reasonable max limit to prevent memory issues
    max_results = min(limit * 10, 1000)  # Load at most 1000 records for grouping
    
    # Get limited results for grouping
    results = query.limit(max_results).all()
    
    # Group results in memory (this is much smaller dataset now)
    if group_by == "artist":
        grouped = {}
        for song, user in results:
            artist_key = song.artist or "Unknown Artist"
            if artist_key not in grouped:
                grouped[artist_key] = []
            grouped[artist_key].append((song, user))
        
        # Flatten grouped results maintaining sort order
        flattened_results = []
        for artist in grouped:
            flattened_results.extend(grouped[artist])
    
    elif group_by == "user":
        grouped = {}
        for song, user in results:
            user_key = user.username or "Unknown User"
            if user_key not in grouped:
                grouped[user_key] = []
            grouped[user_key].append((song, user))
        
        # Flatten grouped results maintaining sort order
        flattened_results = []
        for username in grouped:
            flattened_results.extend(grouped[username])
    
    else:
        flattened_results = results
    
    # Apply pagination to the grouped/flattened results
    total_count = len(flattened_results)
    start_index = offset
    end_index = offset + limit
    paginated_results = flattened_results[start_index:end_index]
    
    # Calculate pagination info
    page = (offset // limit) + 1
    total_pages = (total_count + limit - 1) // limit
    
    # Get artist images in batch
    artist_names = [song.artist for song, _ in paginated_results if song.artist]
    artist_images = get_artist_images_batch(db, artist_names)
    
    songs = [
        _build_song_response(song, user, artist_images)
        for song, user in paginated_results
    ]
    
    return PaginatedPublicSongsResponse(
        songs=songs,
        total_count=total_count,
        page=page,
        per_page=limit,
        total_pages=total_pages
    )

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
    
    if group_by in ["artist", "user"]:
        # Use database-level grouping and pagination instead of loading everything into memory
        return _handle_grouped_query(db, group_by, search, status, sort_by, sort_direction, limit, offset)
    
    # Default: song-based pagination with proper database-level operations
    return _handle_default_query(db, search, status, sort_by, sort_direction, limit, offset)

@router.get("/shared-connections", response_model=SharedConnectionsResponse)
@cached(ttl=180, key_func=lambda db, current_user: f"shared_connections:{current_user.id}")
def get_shared_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get songs and artists shared between current user and other users with optimized queries."""
    
    # Single optimized query for shared songs using EXISTS instead of joins
    shared_songs_results = db.execute(text("""
        SELECT DISTINCT
            u.username,
            s.id,
            s.title,
            s.artist,
            s.album_cover,
            s.status,
            s.album,
            s.year
        FROM songs s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id != :user_id
          AND s.is_public = true
          AND EXISTS (
              SELECT 1 FROM songs my_s
              WHERE my_s.user_id = :user_id
                AND LOWER(my_s.title) = LOWER(s.title)
                AND LOWER(my_s.artist) = LOWER(s.artist)
          )
        ORDER BY s.updated_at DESC
        LIMIT 10
    """), {"user_id": current_user.id}).fetchall()
    
    # Single optimized query for shared artists with all data
    shared_artists_results = db.execute(text("""
        WITH my_artists AS (
            SELECT artist, COUNT(*) as my_count
            FROM songs
            WHERE user_id = :user_id AND artist IS NOT NULL
            GROUP BY artist
        ),
        other_artists AS (
            SELECT 
                u.username,
                s.artist,
                COUNT(*) as other_count
            FROM songs s
            JOIN users u ON s.user_id = u.id
            JOIN my_artists ma ON LOWER(s.artist) = LOWER(ma.artist)
            WHERE s.user_id != :user_id
              AND s.is_public = true
              AND s.artist IS NOT NULL
            GROUP BY u.username, s.artist
        )
        SELECT 
            oa.username,
            oa.artist,
            oa.other_count,
            ma.my_count,
            COALESCE(shared_songs.shared_count, 0) as shared_songs_count
        FROM other_artists oa
        JOIN my_artists ma ON LOWER(oa.artist) = LOWER(ma.artist)
        LEFT JOIN (
            SELECT 
                s.artist,
                COUNT(*) as shared_count
            FROM songs s
            WHERE s.user_id != :user_id
              AND s.is_public = true
              AND EXISTS (
                  SELECT 1 FROM songs my_s
                  WHERE my_s.user_id = :user_id
                    AND LOWER(my_s.title) = LOWER(s.title)
                    AND LOWER(my_s.artist) = LOWER(s.artist)
              )
            GROUP BY s.artist
        ) shared_songs ON LOWER(oa.artist) = LOWER(shared_songs.artist)
        ORDER BY oa.other_count DESC
        LIMIT 10
    """), {"user_id": current_user.id}).fetchall()
    
    # Build shared songs response
    shared_songs_list = [
        {
            "song_id": row[1],
            "username": row[0],
            "title": row[2],
            "artist": row[3],
            "album_cover": row[4],
            "status": row[5],
            "album": row[6],
            "year": row[7]
        }
        for row in shared_songs_results
    ]
    
    # Get artist images for shared artists
    shared_artist_names = [row[1] for row in shared_artists_results if row[1]]
    artist_images = get_artist_images_batch(db, shared_artist_names)
    
    # Build shared artists response
    shared_artists_list = [
        {
            "username": row[0],
            "artist": row[1],
            "song_count": row[2],
            "my_songs_count": row[3],
            "shared_songs_count": row[4],
            "artist_image_url": artist_images.get(row[1].lower()) if row[1] else None
        }
        for row in shared_artists_results
    ]
    
    return SharedConnectionsResponse(
        shared_songs=shared_songs_list,
        shared_artists=shared_artists_list
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

class MakeAllFuturePlansPublicResponse(BaseModel):
    success_count: int
    message: str

@router.post("/make-all-future-plans-public", response_model=MakeAllFuturePlansPublicResponse)
def make_all_future_plans_public(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Efficiently make all Future Plans songs public for the current user using a single SQL UPDATE."""
    
    # Count how many songs will be affected (for response)
    count_query = db.query(func.count(Song.id)).filter(
        Song.user_id == current_user.id,
        Song.status == "Future Plans",
        Song.is_public == False
    )
    songs_to_update_count = count_query.scalar() or 0
    
    if songs_to_update_count == 0:
        return MakeAllFuturePlansPublicResponse(
            success_count=0,
            message="No Future Plans songs to make public"
        )
    
    # Use a single SQL UPDATE query - much faster than looping
    stmt = (
        update(Song)
        .where(
            and_(
                Song.user_id == current_user.id,
                Song.status == "Future Plans",
                Song.is_public == False
            )
        )
        .values(is_public=True)
    )
    
    try:
        result = db.execute(stmt)
        updated_count = result.rowcount
        
        # Check if all Future Plans songs are now public, and if so, enable default_public_sharing
        total_future_plans = db.query(func.count(Song.id)).filter(
            Song.user_id == current_user.id,
            Song.status == "Future Plans"
        ).scalar() or 0
        
        public_future_plans = db.query(func.count(Song.id)).filter(
            Song.user_id == current_user.id,
            Song.status == "Future Plans",
            Song.is_public == True
        ).scalar() or 0
        
        # If all Future Plans songs are public, enable default_public_sharing
        # Need to fetch the actual User model from DB to update it
        db_user = db.query(User).filter(User.id == current_user.id).first()
        if total_future_plans > 0 and public_future_plans == total_future_plans:
            if db_user and not db_user.default_public_sharing:
                db_user.default_public_sharing = True
                print(f"✅ Enabled default_public_sharing for user {current_user.id} (all Future Plans songs are public)")
        
        # Commit both song updates and user setting change together
        db.commit()
        
        # Log the activity (single log entry for bulk operation)
        try:
            log_activity(
                db=db,
                user_id=current_user.id,
                activity_type="make_all_future_plans_public",
                description=f"Made {updated_count} Future Plans songs public",
                metadata={
                    "song_count": updated_count,
                    "bulk_operation": True
                }
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log make_all_future_plans_public activity: {log_err}")
        
        # Check public WIP achievements if songs were made public
        if updated_count > 0:
            try:
                from api.achievements import check_public_wip_achievements
                check_public_wip_achievements(db, current_user.id)
            except Exception as ach_err:
                print(f"⚠️ Failed to check public WIP achievements: {ach_err}")
        
        return MakeAllFuturePlansPublicResponse(
            success_count=updated_count,
            message=f"Successfully made {updated_count} Future Plans songs public"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update songs: {str(e)}")

@router.post("/make-all-future-plans-private", response_model=MakeAllFuturePlansPublicResponse)
def make_all_future_plans_private(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Efficiently make all Future Plans songs private for the current user using a single SQL UPDATE."""
    
    # Count how many songs will be affected (for response)
    count_query = db.query(func.count(Song.id)).filter(
        Song.user_id == current_user.id,
        Song.status == "Future Plans",
        Song.is_public == True
    )
    songs_to_update_count = count_query.scalar() or 0
    
    if songs_to_update_count == 0:
        return MakeAllFuturePlansPublicResponse(
            success_count=0,
            message="No Future Plans songs to make private"
        )
    
    # Use a single SQL UPDATE query - much faster than looping
    stmt = (
        update(Song)
        .where(
            and_(
                Song.user_id == current_user.id,
                Song.status == "Future Plans",
                Song.is_public == True
            )
        )
        .values(is_public=False)
    )
    
    try:
        result = db.execute(stmt)
        updated_count = result.rowcount
        
        # Disable default_public_sharing when making all songs private
        # Need to fetch the actual User model from DB to update it
        db_user = db.query(User).filter(User.id == current_user.id).first()
        if db_user and db_user.default_public_sharing:
            db_user.default_public_sharing = False
            print(f"✅ Disabled default_public_sharing for user {current_user.id} (all Future Plans songs are now private)")
        
        # Commit both song updates and user setting change together
        db.commit()
        
        # Log the activity (single log entry for bulk operation)
        try:
            log_activity(
                db=db,
                user_id=current_user.id,
                activity_type="make_all_future_plans_private",
                description=f"Made {updated_count} Future Plans songs private",
                metadata={
                    "song_count": updated_count,
                    "bulk_operation": True
                }
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log make_all_future_plans_private activity: {log_err}")
        
        return MakeAllFuturePlansPublicResponse(
            success_count=updated_count,
            message=f"Successfully made {updated_count} Future Plans songs private"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update songs: {str(e)}")

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