from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Collaboration, CollaborationType, User, Pack, Song
from auth import get_current_active_user
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/collaborations", tags=["Collaborations"])

class CollaborationRequest(BaseModel):
    user_id: int
    collaboration_type: str  # "pack_view", "pack_edit", "song_edit"

class CollaborationResponse(BaseModel):
    id: int
    pack_id: Optional[int]
    song_id: Optional[int]
    user_id: int
    username: str
    collaboration_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PackCollaborationRequest(BaseModel):
    user_id: int
    permissions: List[str]  # ["pack_view", "pack_edit"]

class SongCollaborationRequest(BaseModel):
    user_id: int

@router.post("/packs/{pack_id}/collaborate", response_model=List[CollaborationResponse])
def add_pack_collaborator(
    pack_id: int,
    request: PackCollaborationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a collaborator to a pack with specified permissions."""
    
    # Check if pack exists and current user owns it
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    if pack.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only pack owner can add collaborators")
    
    # Check if target user exists
    target_user = db.query(User).filter(User.id == request.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't add self as collaborator
    if request.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as collaborator")
    
    collaborations = []
    
    for permission in request.permissions:
        if permission not in ["pack_view", "pack_edit"]:
            raise HTTPException(status_code=400, detail=f"Invalid permission: {permission}")
        
        # Check if collaboration already exists
        existing = db.query(Collaboration).filter(
            Collaboration.pack_id == pack_id,
            Collaboration.user_id == request.user_id,
            Collaboration.collaboration_type == CollaborationType(permission)
        ).first()
        
        if existing:
            continue  # Skip if already exists
        
        # Create new collaboration
        collab = Collaboration(
            pack_id=pack_id,
            song_id=None,
            user_id=request.user_id,
            collaboration_type=CollaborationType(permission)
        )
        db.add(collab)
        collaborations.append(collab)
    
    db.commit()
    
    # Return all collaborations for this user on this pack
    result = db.query(Collaboration).filter(
        Collaboration.pack_id == pack_id,
        Collaboration.user_id == request.user_id
    ).all()
    
    return [
        CollaborationResponse(
            id=c.id,
            pack_id=c.pack_id,
            song_id=c.song_id,
            user_id=c.user_id,
            username=target_user.username,
            collaboration_type=c.collaboration_type.value,
            created_at=c.created_at
        )
        for c in result
    ]

@router.delete("/packs/{pack_id}/collaborate/{user_id}")
def remove_pack_collaborator(
    pack_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a collaborator from a pack."""
    
    # Check if pack exists and current user owns it
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    if pack.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only pack owner can remove collaborators")
    
    # Remove all collaborations for this user on this pack
    pack_collaborations_deleted = db.query(Collaboration).filter(
        Collaboration.pack_id == pack_id,
        Collaboration.user_id == user_id
    ).delete()
    
    # Also remove any song-level collaborations for songs in this pack
    song_collaborations_deleted = db.query(Collaboration).filter(
        Collaboration.song_id.in_(
            db.query(Song.id).filter(Song.pack_id == pack_id)
        ),
        Collaboration.user_id == user_id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).delete(synchronize_session=False)
    
    total_deleted = pack_collaborations_deleted + song_collaborations_deleted
    
    db.commit()
    
    return {"message": f"Removed {total_deleted} collaborations (pack: {pack_collaborations_deleted}, songs: {song_collaborations_deleted})"}

@router.post("/songs/{song_id}/collaborate", response_model=CollaborationResponse)
def add_song_collaborator(
    song_id: int,
    request: SongCollaborationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a collaborator to a song."""
    
    # Check if song exists and current user owns it
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if song.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only song owner can add collaborators")
    
    # Check if target user exists
    target_user = db.query(User).filter(User.id == request.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't add self as collaborator
    if request.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as collaborator")
    
    # Check if collaboration already exists
    existing = db.query(Collaboration).filter(
        Collaboration.song_id == song_id,
        Collaboration.user_id == request.user_id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="User is already a collaborator on this song")
    
    # Create new collaboration
    collab = Collaboration(
        pack_id=None,
        song_id=song_id,
        user_id=request.user_id,
        collaboration_type=CollaborationType.SONG_EDIT
    )
    db.add(collab)
    db.commit()
    db.refresh(collab)
    
    return CollaborationResponse(
        id=collab.id,
        pack_id=collab.pack_id,
        song_id=collab.song_id,
        user_id=collab.user_id,
        username=target_user.username,
        collaboration_type=collab.collaboration_type.value,
        created_at=collab.created_at
    )

@router.delete("/songs/{song_id}/collaborate/{user_id}")
def remove_song_collaborator(
    song_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a collaborator from a song."""
    
    # Check if song exists and current user owns it
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if song.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only song owner can remove collaborators")
    
    # Remove collaboration
    deleted = db.query(Collaboration).filter(
        Collaboration.song_id == song_id,
        Collaboration.user_id == user_id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).delete()
    
    db.commit()
    
    return {"message": f"Removed {deleted} collaborations"}

@router.get("/packs/{pack_id}/collaborators", response_model=List[CollaborationResponse])
def get_pack_collaborators(
    pack_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all collaborators for a pack."""
    
    # Check if pack exists
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if user has access to this pack
    if pack.user_id != current_user.id:
        has_access = db.query(Collaboration).filter(
            Collaboration.pack_id == pack_id,
            Collaboration.user_id == current_user.id
        ).first()
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all collaborations for this pack
    collaborations = db.query(Collaboration).filter(
        Collaboration.pack_id == pack_id
    ).all()
    
    # Get usernames for all user IDs
    user_ids = list(set([c.user_id for c in collaborations]))
    users = {u.id: u.username for u in db.query(User).filter(User.id.in_(user_ids)).all()}
    
    return [
        CollaborationResponse(
            id=c.id,
            pack_id=c.pack_id,
            song_id=c.song_id,
            user_id=c.user_id,
            username=users.get(c.user_id, "Unknown"),
            collaboration_type=c.collaboration_type.value,
            created_at=c.created_at
        )
        for c in collaborations
    ]

@router.get("/songs/{song_id}/collaborators", response_model=List[CollaborationResponse])
def get_song_collaborators(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all collaborators for a song."""
    
    # Check if song exists
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user has access to this song
    if song.user_id != current_user.id:
        has_access = db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first()
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all collaborations for this song
    collaborations = db.query(Collaboration).filter(
        Collaboration.song_id == song_id
    ).all()
    
    # Get usernames for all user IDs
    user_ids = list(set([c.user_id for c in collaborations]))
    users = {u.id: u.username for u in db.query(User).filter(User.id.in_(user_ids)).all()}
    
    return [
        CollaborationResponse(
            id=c.id,
            pack_id=c.pack_id,
            song_id=c.song_id,
            user_id=c.user_id,
            username=users.get(c.user_id, "Unknown"),
            collaboration_type=c.collaboration_type.value,
            created_at=c.created_at
        )
        for c in collaborations
    ]

@router.get("/my-collaborations", response_model=List[CollaborationResponse])
def get_my_collaborations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all collaborations for the current user."""
    
    collaborations = db.query(Collaboration).filter(
        Collaboration.user_id == current_user.id
    ).all()
    
    # Get usernames for all user IDs (should just be current user)
    return [
        CollaborationResponse(
            id=c.id,
            pack_id=c.pack_id,
            song_id=c.song_id,
            user_id=c.user_id,
            username=current_user.username,
            collaboration_type=c.collaboration_type.value,
            created_at=c.created_at
        )
        for c in collaborations
    ] 

@router.get("/on-my-packs", response_model=List[CollaborationResponse])
def get_collaborations_on_my_packs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all collaborations on packs owned by the current user."""
    
    # Find all collaborations on packs owned by current user
    collaborations = db.query(Collaboration).join(
        Pack, Collaboration.pack_id == Pack.id
    ).filter(
        Pack.user_id == current_user.id
    ).all()
    
    # Get usernames for all collaborator user IDs
    user_ids = list(set([c.user_id for c in collaborations]))
    users = {u.id: u.username for u in db.query(User).filter(User.id.in_(user_ids)).all()}
    
    return [
        CollaborationResponse(
            id=c.id,
            pack_id=c.pack_id,
            song_id=c.song_id,
            user_id=c.user_id,
            username=users.get(c.user_id, "Unknown"),
            collaboration_type=c.collaboration_type.value,
            created_at=c.created_at
        )
        for c in collaborations
    ] 