from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from database import get_db
from models import Pack, User, Song, SongStatus, AlbumSeries
from api.auth import get_current_active_user
from api.achievements import check_pack_achievements
from pydantic import BaseModel

router = APIRouter(prefix="/packs", tags=["Packs"])

# Define specific routes FIRST to avoid conflicts with /{pack_id}
@router.get("/near-completion")
def get_packs_near_completion(
    limit: int = Query(3, le=10),
    threshold: int = Query(80, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get packs that are close to completion for the current user"""
    
    # Get packs with their songs
    packs = db.query(Pack).filter(
        Pack.user_id == current_user.id
    ).all()
    
    near_completion_packs = []
    
    for pack in packs:
        # Get only "In Progress" songs in the pack with authoring data loaded
        pack_songs = db.query(Song).options(
            joinedload(Song.authoring)
        ).filter(
            Song.pack_id == pack.id,
            Song.status == "In Progress"
        ).all()
        
        if not pack_songs:
            continue
            
        # Calculate completion percentage based on authoring progress (like WIP page)
        total_songs = len(pack_songs)
        
        # Calculate average song completion percentage from authoring data
        total_completion = 0
        songs_with_authoring = 0
        
        for song in pack_songs:
            if hasattr(song, 'authoring') and song.authoring:
                # Count completed authoring steps
                authoring_fields = [
                    'demucs', 'midi', 'tempo_map', 'fake_ending', 'drums', 'bass', 
                    'guitar', 'vocals', 'harmonies', 'pro_keys', 'keys', 
                    'animations', 'drum_fills', 'overdrive', 'compile'
                ]
                completed_steps = sum(1 for field in authoring_fields if getattr(song.authoring, field, False))
                total_steps = len(authoring_fields)
                song_completion = (completed_steps / total_steps) * 100
                total_completion += song_completion
                songs_with_authoring += 1
        
        completion_percentage = (total_completion / songs_with_authoring) if songs_with_authoring > 0 else 0
        
        # Debug: show what we're calculating
        print(f"🔍 Pack '{pack.name}': {total_songs} WIP songs, {songs_with_authoring} with authoring, {completion_percentage:.1f}% avg completion")
        if songs_with_authoring > 0:
            print(f"   First song authoring example: {pack_songs[0].authoring.__dict__ if pack_songs[0].authoring else 'None'}")
        
        # Near-completion logic: show packs that meet threshold and are not 100% complete
        meets_threshold = completion_percentage >= threshold and completion_percentage < 100
        has_songs_with_progress = songs_with_authoring > 0
        
        print(f"   Meets threshold ({threshold}%)? {meets_threshold}, Has progress? {has_songs_with_progress}")
        
        if meets_threshold and has_songs_with_progress:
            pack_data = {
                "id": pack.id,
                "name": pack.name,
                "priority": pack.priority,
                "created_at": pack.created_at.isoformat() if pack.created_at else None,
                "updated_at": pack.updated_at.isoformat() if pack.updated_at else None,
                "songs": [
                    {
                        "id": song.id,
                        "title": song.title,
                        "artist": song.artist,
                        "status": song.status
                    }
                    for song in pack_songs
                ]
            }
            near_completion_packs.append(pack_data)
    
    # Sort by completion percentage descending
    near_completion_packs.sort(key=lambda p: 
        len([s for s in p["songs"] if s["status"] == "Released"]) / len(p["songs"]) if p["songs"] else 0, 
        reverse=True
    )
    
    return near_completion_packs[:limit]

class PackCreate(BaseModel):
    name: str
    priority: Optional[int] = None  # No default - null unless specified

class PackUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[int] = None

class PackStatusUpdate(BaseModel):
    status: str

class PackReleaseData(BaseModel):
    description: Optional[str] = None
    download_link: Optional[str] = None
    youtube_url: Optional[str] = None
    song_download_links: Optional[dict] = None  # {song_id: download_link}
    hide_from_homepage: Optional[bool] = False  # If True, don't set released_at

class PackResponse(BaseModel):
    id: int
    name: str
    user_id: int
    priority: Optional[int] = None  # Can be null
    created_at: str
    updated_at: str
    released_at: Optional[str] = None  # When pack was released
    release_description: Optional[str] = None  # Optional description for the release
    release_download_link: Optional[str] = None  # Download link for the pack
    release_youtube_url: Optional[str] = None  # YouTube video URL for the release

@router.post("/", response_model=PackResponse)
def create_pack(pack: PackCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Create a new pack"""
    # Check if pack with this name already exists for this user
    existing_pack = db.query(Pack).filter(
        Pack.name == pack.name,
        Pack.user_id == current_user.id
    ).first()
    
    if existing_pack:
        raise HTTPException(status_code=400, detail="Pack with this name already exists")
    
    # Validate priority value (1-5)
    priority = pack.priority
    if priority is not None and (priority < 1 or priority > 5):
        raise HTTPException(status_code=400, detail="Priority must be between 1 and 5")
    
    new_pack = Pack(
        name=pack.name,
        user_id=current_user.id,
        priority=priority
    )
    
    db.add(new_pack)
    db.commit()
    db.refresh(new_pack)
    
    # Check achievements
    try:
        check_pack_achievements(db, current_user.id)
    except Exception as ach_err:
        print(f"⚠️ Failed to check achievements: {ach_err}")
    
    return PackResponse(
        id=new_pack.id,
        name=new_pack.name,
        user_id=new_pack.user_id,
        priority=new_pack.priority,
        created_at=new_pack.created_at.isoformat(),
        updated_at=new_pack.updated_at.isoformat()
    )

@router.get("/", response_model=List[PackResponse])
def get_packs(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all packs for the current user"""
    packs = db.query(Pack).filter(Pack.user_id == current_user.id).all()
    return [
        PackResponse(
            id=pack.id,
            name=pack.name,
            user_id=pack.user_id,
            priority=pack.priority,
            created_at=pack.created_at.isoformat(),
            updated_at=pack.updated_at.isoformat()
        )
        for pack in packs
    ]

@router.get("/{pack_id}", response_model=PackResponse)
def get_pack(pack_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get a specific pack by ID"""
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if user has access to this pack
    if pack.user_id != current_user.id:
        # Check if user is a collaborator on this pack
        from models import Collaboration, CollaborationType
        collaboration = db.query(Collaboration).filter(
            Collaboration.pack_id == pack_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
        ).first()
        
        if not collaboration:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return PackResponse(
        id=pack.id,
        name=pack.name,
        user_id=pack.user_id,
        priority=pack.priority,
        created_at=pack.created_at.isoformat(),
        updated_at=pack.updated_at.isoformat()
    )

@router.patch("/{pack_id}", response_model=PackResponse)
def update_pack(pack_id: int, pack_update: PackUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Update a pack (rename)"""
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if user owns this pack
    if pack.user_id != current_user.id:
        # Determine which operation is being attempted for a more specific error message
        if pack_update.name is not None:
            raise HTTPException(status_code=403, detail="Only pack owner can rename pack")
        elif pack_update.priority is not None:
            raise HTTPException(status_code=403, detail="Only pack owner can update pack priority")
        else:
            raise HTTPException(status_code=403, detail="Only pack owner can modify pack")
    
    # Update pack name if provided
    if pack_update.name is not None:
        # Check if pack with this name already exists for this user
        existing_pack = db.query(Pack).filter(
            Pack.name == pack_update.name,
            Pack.user_id == current_user.id,
            Pack.id != pack_id
        ).first()
        
        if existing_pack:
            raise HTTPException(status_code=400, detail="Pack with this name already exists")
        
        pack.name = pack_update.name
    
    # Update pack priority if provided
    if pack_update.priority is not None:
        # Validate priority value (1-5)
        if pack_update.priority < 1 or pack_update.priority > 5:
            raise HTTPException(status_code=400, detail="Priority must be between 1 and 5")
        pack.priority = pack_update.priority
    
    db.commit()
    db.refresh(pack)
    
    return PackResponse(
        id=pack.id,
        name=pack.name,
        user_id=pack.user_id,
        priority=pack.priority,
        created_at=pack.created_at.isoformat(),
        updated_at=pack.updated_at.isoformat()
    )

@router.patch("/{pack_id}/status")
def update_pack_status(pack_id: int, status_update: PackStatusUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Update pack status and all songs in the pack"""
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if user owns this pack
    if pack.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only pack owner can change pack status")
    
    # Validate status
    valid_statuses = ["Future Plans", "In Progress", "Released"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Map status string to SongStatus enum
    status_map = {
        "Future Plans": SongStatus.future,
        "In Progress": SongStatus.wip,
        "Released": SongStatus.released
    }
    new_status = status_map.get(status_update.status)
    
    if not new_status:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Update all songs in the pack
    songs = db.query(Song).filter(Song.pack_id == pack_id).all()
    
    # If changing to Released, set released_at timestamp
    release_timestamp = datetime.utcnow() if status_update.status == "Released" else None
    
    for song in songs:
        old_status = song.status
        song.status = new_status
        
        # Set released_at for songs that are changing to Released
        if status_update.status == "Released":
            if old_status != SongStatus.released and old_status != "Released":
                song.released_at = release_timestamp
                print(f"🚀 Pack Release: Set released_at for song {song.id} '{song.title}' - status change from {old_status} to Released")
            elif song.released_at is None:
                # Edge case: song is already Released but has no timestamp
                song.released_at = release_timestamp
                print(f"🔧 Pack Release: Fixed missing released_at for song {song.id} '{song.title}' (was already Released)")
            else:
                print(f"ℹ️ Pack Release: Song {song.id} '{song.title}' already released with timestamp {song.released_at}")
    
    # Also set released_at for the pack itself
    if status_update.status == "Released":
        pack.released_at = release_timestamp
    
    db.commit()
    
    return {"message": f"Pack and {len(songs)} songs updated to {status_update.status}"}


@router.delete("/{pack_id}")
def delete_pack(pack_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Delete a pack and all its songs"""
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if user owns this pack
    if pack.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only pack owner can delete pack")
    
    # Get all songs in the pack
    songs = db.query(Song).filter(Song.pack_id == pack_id).all()
    song_count = len(songs)
    
    # Collect album series IDs that might become orphaned
    album_series_ids = set()
    for song in songs:
        if song.album_series_id:
            album_series_ids.add(song.album_series_id)
    
    # Delete all songs in the pack. We avoid touching the authoring table because
    # on some installations it is a VIEW and not directly deletable.
    for song in songs:
        db.delete(song)
    
    # Delete the pack
    db.delete(pack)
    
    # Check for orphaned album series and delete them
    orphaned_series_count = 0
    for series_id in album_series_ids:
        # Check if any songs still reference this album series
        remaining_songs = db.query(Song).filter(Song.album_series_id == series_id).first()
        if not remaining_songs:
            # No songs left, delete the album series
            series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
            if series:
                db.delete(series)
                orphaned_series_count += 1
    
    # Commit the transaction
    db.commit()
    
    message = f"Pack '{pack.name}' and {song_count} songs deleted successfully"
    if orphaned_series_count > 0:
        message += f" (and {orphaned_series_count} orphaned album series)"
    
    return {"message": message}

@router.post("/{pack_id}/release")
def release_pack_with_metadata(
    pack_id: int,
    release_data: PackReleaseData,
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Release a pack with optional metadata."""
    
    # Get the pack
    pack = db.query(Pack).filter(Pack.id == pack_id, Pack.user_id == current_user.id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if pack is already released - if so, just update metadata
    if pack.released_at:
        # Pack already released, just update the metadata
        pack.release_description = release_data.description
        pack.release_download_link = release_data.download_link 
        pack.release_youtube_url = release_data.youtube_url
        db.commit()
        return {"message": f"Pack '{pack.name}' metadata updated successfully", "pack_id": pack_id}
    
    # Update pack with release metadata
    # Only set released_at if not hiding from homepage
    if not release_data.hide_from_homepage:
        pack.released_at = datetime.utcnow()
    pack.release_description = release_data.description
    pack.release_download_link = release_data.download_link 
    pack.release_youtube_url = release_data.youtube_url
    
    # Get all songs in the pack
    songs = db.query(Song).filter(Song.pack_id == pack_id).all()
    
    # Release completed songs and move optional incomplete songs to "Future Plans"
    released_count = 0
    moved_count = 0
    
    for song in songs:
        if song.status == "In Progress":
            if not song.optional:
                # Required song must be released
                song.status = "Released"
                song.released_at = datetime.utcnow()
                
                # Set song download link if provided
                if release_data.song_download_links and str(song.id) in release_data.song_download_links:
                    song.release_download_link = release_data.song_download_links[str(song.id)]
                
                released_count += 1
            else:
                # Optional song - move to "Future Plans" with new pack name
                song.status = "Future Plans"
                song.pack_id = None
                # Create a new pack name for the moved song
                new_pack_name = f"{pack.name} (Bonus)"
                
                # Find or create the new pack
                new_pack = db.query(Pack).filter(
                    Pack.name == new_pack_name,
                    Pack.user_id == current_user.id
                ).first()
                
                if not new_pack:
                    new_pack = Pack(
                        name=new_pack_name,
                        user_id=current_user.id,
                        priority=pack.priority
                    )
                    db.add(new_pack)
                    db.flush()  # Get the ID
                    
                song.pack_id = new_pack.id
                moved_count += 1
        elif song.status == "Released":
            # Song already released - ensure it has release timestamp
            if not song.released_at:
                song.released_at = datetime.utcnow()
            
            # Set song download link if provided
            if release_data.song_download_links and str(song.id) in release_data.song_download_links:
                song.release_download_link = release_data.song_download_links[str(song.id)]
            
            released_count += 1
    
    # Check pack achievements
    try:
        check_pack_achievements(current_user.id, db)
    except Exception as e:
        print(f"Warning: Failed to check pack achievements: {e}")
    
    # Send notifications to all users if not hidden from homepage
    if not release_data.hide_from_homepage:
        try:
            from api.notifications.services.notification_service import NotificationService
            notification_service = NotificationService(db)
            notification_result = notification_service.broadcast_pack_release_notification(
                pack_name=pack.name,
                pack_owner_username=current_user.username
            )
            print(f"🔔 Pack release notifications: {notification_result}")
        except Exception as e:
            print(f"Warning: Failed to send pack release notifications: {e}")
    
    db.commit()
    
    message = f"Pack '{pack.name}' released successfully with {released_count} songs"
    if moved_count > 0:
        message += f" ({moved_count} optional songs moved to future plans)"
    
    return {"message": message, "pack_id": pack_id} 