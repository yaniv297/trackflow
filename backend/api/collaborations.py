from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Collaboration, CollaborationType, User, Pack, Song
from api.auth import get_current_active_user
from api.activity_logger import log_activity
from api.achievements import check_collaboration_achievements, check_social_achievements
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
            print(f"Collaboration already exists: pack_id={pack_id}, user_id={request.user_id}, type={permission}")
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
        print(f"Created collaboration: pack_id={pack_id}, user_id={request.user_id}, type={permission}")
    
    db.commit()
    print(f"Committed {len(collaborations)} new collaborations for user {request.user_id} on pack {pack_id}")
    
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="add_pack_collaborator",
            description=f"{current_user.username} added {target_user.username} to pack {pack_id}",
            metadata={
                "pack_id": pack_id,
                "target_user_id": request.user_id,
                "permissions": request.permissions
            }
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log pack collaboration addition: {log_err}")
    
    # Check achievements
    try:
        from api.achievements import check_social_collaboration_achievements
        check_social_collaboration_achievements(db, current_user.id)  # For pack owner (adding collaborator)
        check_social_collaboration_achievements(db, request.user_id)  # For collaborator (being added)
    except Exception as ach_err:
        print(f"⚠️ Failed to check achievements: {ach_err}")
    
    # Return all collaborations for this user on this pack
    result = db.query(Collaboration).filter(
        Collaboration.pack_id == pack_id,
        Collaboration.user_id == request.user_id
    ).all()
    print(f"Total collaborations for user {request.user_id} on pack {pack_id}: {len(result)}")
    for r in result:
        print(f"  - {r.collaboration_type.value}")
    
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
    
    # Check if song exists and current user owns it OR owns the pack it belongs to
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if current user owns the song OR owns the pack the song belongs to
    can_add_collaborator = song.user_id == current_user.id
    
    if not can_add_collaborator and song.pack_id:
        # Check if user owns the pack
        pack = db.query(Pack).filter(Pack.id == song.pack_id).first()
        if pack and pack.user_id == current_user.id:
            can_add_collaborator = True
    
    if not can_add_collaborator:
        raise HTTPException(status_code=403, detail="Only song owner or pack owner can add collaborators")
    
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
    
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="add_song_collaborator",
            description=f"{current_user.username} added {target_user.username} to song {song_id}",
            metadata={
                "song_id": song_id,
                "target_user_id": request.user_id
            }
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log song collaboration addition: {log_err}")
    
    # Check achievements
    try:
        from api.achievements import check_social_collaboration_achievements
        check_social_collaboration_achievements(db, current_user.id)  # For song owner (adding collaborator)
        check_social_collaboration_achievements(db, request.user_id)  # For collaborator (being added)
    except Exception as ach_err:
        print(f"⚠️ Failed to check achievements: {ach_err}")
    
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