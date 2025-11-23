from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from typing import List, Optional, Dict
from datetime import datetime
from database import get_db
from models import Pack, Song, SongStatus, AlbumSeries
from api.auth import get_current_active_user
from api.achievements import check_pack_achievements
from pydantic import BaseModel

router = APIRouter(prefix="/packs", tags=["Packs"])

# Define specific routes FIRST to avoid conflicts with /{pack_id}
@router.get("/near-completion")
def get_packs_near_completion(
    limit: int = Query(3, le=10),
    threshold: int = Query(70, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get packs that are close to completion for the current user.
    Uses EXACT SAME LOGIC as WIP page:
    1. Get all core (non-optional) "In Progress" songs
    2. For each song, get the song owner's workflow fields
    3. Calculate each song's completion: (completed fields / total workflow fields) * 100
    4. Average all song percentages to get pack completion
    """
    
    # Default workflow fields fallback (legacy list)
    DEFAULT_WORKFLOW_FIELDS = [
        'demucs', 'midi', 'tempo_map', 'fake_ending', 'drums', 'bass', 
        'guitar', 'vocals', 'harmonies', 'pro_keys', 'keys', 
        'animations', 'drum_fills', 'overdrive', 'compile'
    ]
    
    # Get packs with their songs
    packs = db.query(Pack).filter(
        Pack.user_id == current_user.id
    ).all()
    
    pack_completions = []  # List of (pack, completion_percentage) tuples
    
    for pack in packs:
        # Get only "In Progress" songs in the pack (core songs only - filter out optional)
        # Handle NULL/False explicitly for SQLite compatibility
        pack_songs = db.query(Song).filter(
            Song.pack_id == pack.id,
            Song.status == "In Progress",
            or_(Song.optional == False, Song.optional.is_(None))  # Only core songs (not optional)
        ).all()
        
        if not pack_songs:
            continue
        
        # Get unique song owner IDs to fetch their workflows
        song_owner_ids = list(set(song.user_id for song in pack_songs if song.user_id))
        
        # Fetch workflow fields for all song owners in one query
        workflow_fields_map: Dict[int, List[str]] = {}
        if song_owner_ids:
            placeholders = ",".join([f":uid{i}" for i in range(len(song_owner_ids))])
            params = {f"uid{i}": user_id for i, user_id in enumerate(song_owner_ids)}
            
            # Get workflow steps for all song owners
            workflow_rows = db.execute(text(f"""
                SELECT uw.user_id, uws.step_name
                FROM user_workflows uw
                JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
                WHERE uw.user_id IN ({placeholders})
                ORDER BY uw.user_id, uws.order_index
            """), params).fetchall()
            
            # Group by user_id
            for user_id, step_name in workflow_rows:
                if user_id not in workflow_fields_map:
                    workflow_fields_map[user_id] = []
                workflow_fields_map[user_id].append(step_name)
        
        # Get song progress for all songs in one query
        song_ids = [song.id for song in pack_songs]
        if not song_ids:
            continue
            
        progress_placeholders = ",".join([f":sid{i}" for i in range(len(song_ids))])
        progress_params = {f"sid{i}": song_id for i, song_id in enumerate(song_ids)}
        
        progress_rows = db.execute(text(f"""
            SELECT song_id, step_name, is_completed
            FROM song_progress
            WHERE song_id IN ({progress_placeholders})
        """), progress_params).fetchall()
        
        # Build progress map: {song_id: {step_name: is_completed}}
        song_progress_map: Dict[int, Dict[str, bool]] = {}
        for song_id, step_name, is_completed in progress_rows:
            if song_id not in song_progress_map:
                song_progress_map[song_id] = {}
            song_progress_map[song_id][step_name] = bool(is_completed)
        
        # Fallback: Check legacy authoring table if song_progress is empty
        # This handles cases where data hasn't been fully migrated
        songs_without_progress = [s for s in pack_songs if s.id not in song_progress_map or len(song_progress_map[s.id]) == 0]
        if songs_without_progress:
            legacy_song_ids = [s.id for s in songs_without_progress]
            legacy_placeholders = ",".join([f":lsid{i}" for i in range(len(legacy_song_ids))])
            legacy_params = {f"lsid{i}": song_id for i, song_id in enumerate(legacy_song_ids)}
            
            # Try to read from legacy authoring table (if it exists as a table, not just a view)
            try:
                legacy_rows = db.execute(text(f"""
                    SELECT song_id, 
                           demucs, midi, tempo_map, fake_ending, drums, bass, guitar,
                           vocals, harmonies, pro_keys, keys, animations, drum_fills, overdrive, compile
                    FROM authoring
                    WHERE song_id IN ({legacy_placeholders})
                """), legacy_params).fetchall()
                
                # Map legacy fields to song_progress format
                for row in legacy_rows:
                    song_id = row[0]
                    if song_id not in song_progress_map:
                        song_progress_map[song_id] = {}
                    
                    # Map each legacy boolean field
                    legacy_fields = ['demucs', 'midi', 'tempo_map', 'fake_ending', 'drums', 'bass', 
                                   'guitar', 'vocals', 'harmonies', 'pro_keys', 'keys', 
                                   'animations', 'drum_fills', 'overdrive', 'compile']
                    for i, field in enumerate(legacy_fields, start=1):
                        if i < len(row):
                            song_progress_map[song_id][field] = bool(row[i])
            except Exception as e:
                # Legacy table might not exist or be a view - that's okay
                print(f"⚠️ Could not read from legacy authoring table: {e}")
        
        # Ensure progress rows exist for all songs and their workflow steps
        # This matches the behavior of get_song_progress endpoint
        for song in pack_songs:
            song_owner_id = song.user_id
            if not song_owner_id:
                continue
                
            workflow_fields = workflow_fields_map.get(song_owner_id)
            if not workflow_fields:
                workflow_fields = DEFAULT_WORKFLOW_FIELDS
            
            # Ensure progress rows exist for each workflow step (if not already in map)
            if song.id not in song_progress_map:
                song_progress_map[song.id] = {}
            
            for step_name in workflow_fields:
                if step_name not in song_progress_map[song.id]:
                    # Create missing progress row (default to False)
                    try:
                        db.execute(text("""
                            INSERT INTO song_progress (song_id, step_name, is_completed, created_at, updated_at)
                            VALUES (:sid, :step, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                            ON CONFLICT(song_id, step_name) DO NOTHING
                        """), {"sid": song.id, "step": step_name})
                        song_progress_map[song.id][step_name] = False
                    except Exception as e:
                        print(f"⚠️ Failed to create progress row for song {song.id}, step {step_name}: {e}")
        
        db.commit()  # Commit any new progress rows we created
        
        # Calculate completion for each song and average
        total_percent = 0
        core_songs_count = 0
        
        for song in pack_songs:
            # Get workflow fields for this song's owner
            song_owner_id = song.user_id
            workflow_fields = workflow_fields_map.get(song_owner_id)
            
            # Fallback to default if no custom workflow
            if not workflow_fields:
                workflow_fields = DEFAULT_WORKFLOW_FIELDS
            
            if not workflow_fields:
                continue  # Skip if no workflow fields at all
            
            # Get progress for this song
            song_progress = song_progress_map.get(song.id, {})
            
            # Calculate completed fields count
            completed_count = sum(
                1 for field in workflow_fields 
                if song_progress.get(field, False)
            )
            
            # Calculate song completion percentage
            total_fields = len(workflow_fields)
            if total_fields > 0:
                song_percent = (completed_count / total_fields) * 100
                total_percent += song_percent
                core_songs_count += 1
        
        # Calculate pack completion as average of song percentages (rounded, matching WIP page)
        if core_songs_count > 0:
            completion_percentage = round(total_percent / core_songs_count)
        else:
            completion_percentage = 0
        
        # Debug logging
        print(f"🔍 Pack '{pack.name}': {core_songs_count} core songs, {len(pack_songs)} total, completion: {completion_percentage}%")
        if core_songs_count > 0:
            print(f"   Workflow fields found for {len(workflow_fields_map)} users")
            print(f"   Progress entries found for {len(song_progress_map)} songs")
            if pack_songs:
                first_song = pack_songs[0]
                first_owner_id = first_song.user_id
                first_workflow = workflow_fields_map.get(first_owner_id, DEFAULT_WORKFLOW_FIELDS)
                first_progress = song_progress_map.get(first_song.id, {})
                print(f"   Example: Song {first_song.id} (owner {first_owner_id}): {len(first_workflow)} workflow fields, {len(first_progress)} progress entries")
                print(f"   Workflow fields: {first_workflow[:5]}...")
                print(f"   Progress keys: {list(first_progress.keys())[:5]}...")
        
        # Near-completion logic: show packs that meet threshold and are not 100% complete
        meets_threshold = completion_percentage >= threshold and completion_percentage < 100
        
        if meets_threshold:
            pack_completions.append((pack, completion_percentage, pack_songs))
        else:
            print(f"   ❌ Pack '{pack.name}' filtered out: {completion_percentage}% (threshold: {threshold}%)")
    
    # Sort by completion percentage descending (highest first)
    pack_completions.sort(key=lambda x: x[1], reverse=True)
    
    # Build response
    near_completion_packs = []
    for pack, completion_percentage, pack_songs in pack_completions[:limit]:
        # Get all core songs in pack to count completed vs total
        all_pack_songs = db.query(Song).filter(
            Song.pack_id == pack.id,
            or_(Song.optional == False, Song.optional.is_(None))  # Only core songs
        ).all()
        total_songs = len(all_pack_songs)
        
        # Get song owner IDs for all songs
        all_song_owner_ids = list(set(song.user_id for song in all_pack_songs if song.user_id))
        
        # Fetch workflow fields for all song owners
        all_workflow_fields_map: Dict[int, List[str]] = {}
        if all_song_owner_ids:
            placeholders = ",".join([f":uid{i}" for i in range(len(all_song_owner_ids))])
            params = {f"uid{i}": user_id for i, user_id in enumerate(all_song_owner_ids)}
            
            workflow_rows = db.execute(text(f"""
                SELECT uw.user_id, uws.step_name
                FROM user_workflows uw
                JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
                WHERE uw.user_id IN ({placeholders})
                ORDER BY uw.user_id, uws.order_index
            """), params).fetchall()
            
            for user_id, step_name in workflow_rows:
                if user_id not in all_workflow_fields_map:
                    all_workflow_fields_map[user_id] = []
                all_workflow_fields_map[user_id].append(step_name)
        
        # Get progress for all songs
        all_song_ids = [song.id for song in all_pack_songs]
        all_progress_rows = []
        if all_song_ids:
            progress_placeholders = ",".join([f":sid{i}" for i in range(len(all_song_ids))])
            progress_params = {f"sid{i}": song_id for i, song_id in enumerate(all_song_ids)}
            
            all_progress_rows = db.execute(text(f"""
                SELECT song_id, step_name, is_completed
                FROM song_progress
                WHERE song_id IN ({progress_placeholders})
            """), progress_params).fetchall()
        
        # Build progress map
        all_song_progress_map: Dict[int, Dict[str, bool]] = {}
        for song_id, step_name, is_completed in all_progress_rows:
            if song_id not in all_song_progress_map:
                all_song_progress_map[song_id] = {}
            all_song_progress_map[song_id][step_name] = bool(is_completed)
        
        # Count completed songs (100% workflow completion)
        completed_songs = 0
        for song in all_pack_songs:
            song_owner_id = song.user_id
            workflow_fields = all_workflow_fields_map.get(song_owner_id)
            if not workflow_fields:
                workflow_fields = DEFAULT_WORKFLOW_FIELDS
            
            if not workflow_fields:
                continue
            
            song_progress = all_song_progress_map.get(song.id, {})
            completed_count = sum(
                1 for field in workflow_fields 
                if song_progress.get(field, False)
            )
            
            # Song is complete if all workflow fields are done
            if completed_count == len(workflow_fields) and len(workflow_fields) > 0:
                completed_songs += 1
        
        # Check if pack has album series - use album series name instead of pack name if available
        display_name = pack.name
        album_cover = None
        # Check if pack has an album series (AlbumSeries has pack_id field)
        album_series = db.query(AlbumSeries).filter(AlbumSeries.pack_id == pack.id).first()
        if album_series:
            series_number = album_series.series_number
            series_name = album_series.album_name
            if series_number:
                display_name = f"Album Series #{series_number}: {series_name}"
            else:
                display_name = f"Album Series: {series_name}"
            # Use album series cover image if available
            album_cover = album_series.cover_image_url
        
        # Get album cover from songs - find the most common album_cover among all songs in pack
        if not album_cover:
            all_pack_songs_for_cover = db.query(Song).filter(Song.pack_id == pack.id).all()
            # Count album covers
            cover_counts = {}
            for song in all_pack_songs_for_cover:
                if song.album_cover:
                    cover_counts[song.album_cover] = cover_counts.get(song.album_cover, 0) + 1
            
            # Get the most common album cover
            if cover_counts:
                album_cover = max(cover_counts.items(), key=lambda x: x[1])[0]
        
        # Debug: verify album cover is being set
        print(f"🎨 Pack '{pack.name}' (id: {pack.id}): album_cover = {album_cover}")
        
        pack_data = {
            "id": pack.id,
            "name": pack.name,  # Keep original pack name for reference
            "display_name": display_name,  # Use album series name if available
            "album_cover": album_cover,  # Album art for display
            "priority": pack.priority,
            "created_at": pack.created_at.isoformat() if pack.created_at else None,
            "updated_at": pack.updated_at.isoformat() if pack.updated_at else None,
            "completion_percentage": completion_percentage,
            "total_songs": total_songs,
            "completed_songs": completed_songs,
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
    
    return near_completion_packs

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
    return {"message": message, "pack_id": pack_id} 