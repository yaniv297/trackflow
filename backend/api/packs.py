from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Pack, User, Song, SongStatus, AlbumSeries
from api.auth import get_current_active_user
from pydantic import BaseModel

router = APIRouter(prefix="/packs", tags=["Packs"])

class PackCreate(BaseModel):
    name: str

class PackUpdate(BaseModel):
    name: Optional[str] = None

class PackStatusUpdate(BaseModel):
    status: str

class PackResponse(BaseModel):
    id: int
    name: str
    user_id: int
    created_at: str
    updated_at: str

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
    
    new_pack = Pack(
        name=pack.name,
        user_id=current_user.id
    )
    
    db.add(new_pack)
    db.commit()
    db.refresh(new_pack)
    
    return PackResponse(
        id=new_pack.id,
        name=new_pack.name,
        user_id=new_pack.user_id,
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
        raise HTTPException(status_code=403, detail="Only pack owner can rename pack")
    
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
    
    db.commit()
    db.refresh(pack)
    
    return PackResponse(
        id=pack.id,
        name=pack.name,
        user_id=pack.user_id,
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
    for song in songs:
        song.status = new_status
    
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
    
    # Delete all songs in the pack
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