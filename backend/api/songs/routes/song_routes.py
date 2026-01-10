from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from database import get_db
from schemas import SongCreate, SongOut
from models import SongStatus, User, Song, Pack, Collaboration, CollaborationType
from api.auth import get_current_active_user_model as get_current_active_user

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
    completion_threshold: Optional[int] = Query(None),
    order: Optional[str] = Query(None),
    limit: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get filtered songs with access control."""
    if query:
        SongValidator.validate_search_query(query)
    
    service = SongService(db)
    return service.get_filtered_songs(current_user, status, query, pack_id, completion_threshold, order, limit)


@router.get("/{song_id}", response_model=SongOut)
def get_song(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single song by ID."""
    service = SongService(db)
    return service.get_song(song_id, current_user)


@router.get("/{song_id}/owner-id")
def get_song_owner_id(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get the owner's user_id for a song. Lightweight endpoint for collaboration workflows."""
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user has access (owns it OR is a collaborator)
    has_access = (
        song.user_id == current_user.id or
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="You don't have permission to access this song")
    
    return {"owner_id": song.user_id}


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
    SongValidator.validate_batch_create(songs, current_user, db)  # Pass additional params
    
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


@router.get("/recent-releases", response_model=List[SongOut])
def get_recent_releases(
    limit: int = Query(10, le=50, description="Maximum number of releases to return"),
    offset: int = Query(0, ge=0, description="Number of releases to skip"),
    db: Session = Depends(get_db)
):
    """Get recently released songs, ordered by release date."""
    # This endpoint is public - no authentication required
    recent_releases = db.query(Song).options(
        joinedload(Song.user),
        joinedload(Song.pack_obj).joinedload(Pack.user)
    ).filter(
        Song.status == "Released",
        Song.released_at.isnot(None)
    ).order_by(Song.released_at.desc()).offset(offset).limit(limit).all()
    
    # Convert to SongOut format
    releases_data = []
    for song in recent_releases:
        song_dict = {
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "album": song.album,
            "year": song.year,
            "status": song.status,
            "album_cover": song.album_cover,
            "user_id": song.user_id,
            "pack_id": song.pack_id,
            "pack_name": song.pack_obj.name if song.pack_obj else None,
            "pack_priority": song.pack_obj.priority if song.pack_obj else None,
            "pack_owner_id": song.pack_obj.user_id if song.pack_obj else None,
            "pack_owner_username": song.pack_obj.user.username if song.pack_obj and song.pack_obj.user else None,
            "optional": song.optional,
            "author": song.user.username if song.user else "Unknown",  # Required field
            "collaborations": [],
            "authoring": None,
            "artist_image_url": None,
            "album_series_id": None,
            "album_series_number": None,
            "album_series_name": None,
            "is_editable": False,  # Public endpoint, no edit permissions
            "pack_collaboration": None,
            "released_at": song.released_at,
            "release_description": song.release_description,
            "release_download_link": song.release_download_link,
            "release_youtube_url": song.release_youtube_url,
            # Pack-level release metadata
            "pack_release_description": song.pack_obj.release_description if song.pack_obj else None,
            "pack_release_download_link": song.pack_obj.release_download_link if song.pack_obj else None,
            "pack_release_youtube_url": song.pack_obj.release_youtube_url if song.pack_obj else None,
        }
        releases_data.append(song_dict)
    
    return [SongOut(**release) for release in releases_data]


@router.get("/recent-pack-releases")
def get_recent_pack_releases(
    limit: int = Query(10, le=50, description="Maximum number of pack releases to return"),
    offset: int = Query(0, ge=0, description="Number of pack releases to skip"),
    days_back: int = Query(30, le=365, description="Number of days back to fetch releases"),
    db: Session = Depends(get_db)
):
    """Get recently released packs with their songs, grouped by pack and ordered by pack release date."""
    from datetime import datetime, timedelta
    
    # Calculate cutoff date
    cutoff_date = datetime.utcnow() - timedelta(days=days_back)
    
    # Get unique packs that have released songs AND are meant to be shown on homepage
    # Use explicit show_on_homepage boolean field
    pack_releases = db.query(Pack).options(
        joinedload(Pack.user),
        joinedload(Pack.songs).joinedload(Song.user)
    ).join(Song).filter(
        Song.status == "Released",
        Song.released_at.isnot(None),
        Pack.released_at.isnot(None),  # Pack must be released
        Pack.released_at >= cutoff_date,
        Pack.show_on_homepage == True  # Explicit homepage visibility check
    ).group_by(Pack.id).order_by(Pack.released_at.desc()).offset(offset).limit(limit).all()
    
    pack_data = []
    for pack in pack_releases:
        # Get all released songs from this pack
        released_songs = [song for song in pack.songs if song.status == "Released" and song.released_at]
        
        if not released_songs:
            continue
            
        # Use the pack's released_at timestamp
        pack_released_at = pack.released_at
        
        # Check if pack has associated album series
        from models import AlbumSeries
        album_series = db.query(AlbumSeries).filter(AlbumSeries.pack_id == pack.id).first()
        
        # Get the user who released the pack (fallback to pack owner if not set)
        released_by_user = None
        if pack.released_by_user_id:
            released_by_user = db.query(User).filter(User.id == pack.released_by_user_id).first()
        released_by_username = released_by_user.username if released_by_user else (pack.user.username if pack.user else "Unknown")
        
        pack_info = {
            "pack_id": pack.id,
            "pack_name": pack.name,
            "pack_owner_id": pack.user_id,
            "pack_owner_username": pack.user.username if pack.user else "Unknown",
            "released_by_user_id": pack.released_by_user_id,
            "released_by_username": released_by_username,
            "pack_priority": pack.priority,
            "released_at": pack_released_at,
            "release_title": pack.release_title if hasattr(pack, 'release_title') else None,
            "release_description": pack.release_description,
            "release_download_link": pack.release_download_link,
            "release_youtube_url": pack.release_youtube_url,
            "songs": [],
            # Include album series data if available
            "album_series_id": album_series.id if album_series else None,
            "album_series_number": album_series.series_number if album_series else None,
            "album_series_name": album_series.album_name if album_series else None,
            "album_series_status": album_series.status if album_series else None
        }
        
        # Add song data
        for song in released_songs:
            song_info = {
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "album": song.album,
                "year": song.year,
                "album_cover": song.album_cover,
                "author": song.user.username if song.user else "Unknown",
                "user_id": song.user_id,
                "optional": song.optional,
                "released_at": song.released_at,
                "release_description": song.release_description,
                "release_download_link": song.release_download_link,
                "release_youtube_url": song.release_youtube_url
            }
            pack_info["songs"].append(song_info)
        
        # Sort songs by release date within the pack
        pack_info["songs"].sort(key=lambda s: s["released_at"] or "", reverse=True)
        
        pack_data.append(pack_info)
    
    return pack_data


@router.get("/recent-pack-releases/count")
def get_recent_pack_releases_count(
    days_back: int = Query(30, le=365, description="Number of days back to count releases"),
    db: Session = Depends(get_db)
):
    """Get the count of pack releases from the specified time period."""
    from datetime import datetime, timedelta
    
    # Calculate cutoff date
    cutoff_date = datetime.utcnow() - timedelta(days=days_back)
    
    # Count unique packs that have been released within the time period AND are visible on homepage
    # In Postgres, released_at is a proper timestamp, so we only check for NOT NULL and cutoff date.
    pack_count = (
        db.query(Pack)
        .join(Song)
        .filter(
            Song.status == "Released",
            Song.released_at.isnot(None),
            Pack.released_at.isnot(None),
            Pack.released_at >= cutoff_date,
            Pack.show_on_homepage.is_(True),  # Only count packs visible on homepage
        )
        .group_by(Pack.id)
        .count()
    )
    
    return {"count": pack_count}