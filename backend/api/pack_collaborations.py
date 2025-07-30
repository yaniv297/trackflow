from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import PackCollaboration, User, Song, Pack
from auth import get_current_active_user

router = APIRouter(prefix="/pack-collaborations", tags=["Pack Collaborations"])

class PackCollaborationRequest(BaseModel):
    pack_id: int
    collaborator_username: str

class PackCollaborationResponse(BaseModel):
    id: int
    pack_id: int
    pack_name: str
    collaborator_username: str
    created_at: str

@router.get("/{pack_id}")
async def get_pack_collaborations(pack_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all collaborators for a specific pack"""
    # Check if user has access to this pack
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if user owns the pack or is a collaborator
    if pack.user_id != current_user.id:
        is_collaborator = db.query(PackCollaboration).filter(
            PackCollaboration.pack_id == pack_id,
            PackCollaboration.collaborator_id == current_user.id
        ).first()
        if not is_collaborator:
            raise HTTPException(status_code=403, detail="Not authorized to view this pack")
    
    collaborations = db.query(PackCollaboration).options(
        joinedload(PackCollaboration.collaborator)
    ).filter(PackCollaboration.pack_id == pack_id).all()
    
    return [
        PackCollaborationResponse(
            id=collab.id,
            pack_id=collab.pack_id,
            pack_name=pack.name,
            collaborator_username=collab.collaborator.username,
            created_at=collab.created_at.isoformat()
        )
        for collab in collaborations
    ]

@router.post("/")
async def add_pack_collaborator(request: PackCollaborationRequest, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Add a collaborator to a pack"""
    # Check if pack exists and user owns it
    pack = db.query(Pack).filter(Pack.id == request.pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    if pack.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only pack owner can add collaborators")
    
    # Find the collaborator user
    collaborator = db.query(User).filter(User.username == request.collaborator_username).first()
    if not collaborator:
        raise HTTPException(status_code=404, detail="User not found")
    
    if collaborator.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a collaborator")
    
    # Check if collaboration already exists
    existing = db.query(PackCollaboration).filter(
        PackCollaboration.pack_id == request.pack_id,
        PackCollaboration.collaborator_id == collaborator.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Collaboration already exists")
    
    # Create the collaboration
    collaboration = PackCollaboration(
        pack_id=request.pack_id,
        owner_id=current_user.id,
        collaborator_id=collaborator.id
    )
    
    db.add(collaboration)
    db.commit()
    db.refresh(collaboration)
    
    return PackCollaborationResponse(
        id=collaboration.id,
        pack_id=collaboration.pack_id,
        pack_name=pack.name,
        collaborator_username=collaborator.username,
        created_at=collaboration.created_at.isoformat()
    )

@router.delete("/{pack_id}/{collaborator_username}")
async def remove_pack_collaborator(pack_id: int, collaborator_username: str, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Remove a collaborator from a pack"""
    # Check if pack exists and user owns it
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    if pack.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only pack owner can remove collaborators")
    
    # Find the collaborator user
    collaborator = db.query(User).filter(User.username == collaborator_username).first()
    if not collaborator:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find and delete the collaboration
    collaboration = db.query(PackCollaboration).filter(
        PackCollaboration.pack_id == pack_id,
        PackCollaboration.collaborator_id == collaborator.id
    ).first()
    
    if not collaboration:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    
    db.delete(collaboration)
    db.commit()
    
    return {"message": "Collaborator removed successfully"}

@router.get("/my-collaborations/")
async def get_my_pack_collaborations(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all packs where the current user is a collaborator"""
    collaborations = db.query(PackCollaboration).options(
        joinedload(PackCollaboration.pack),
        joinedload(PackCollaboration.owner)
    ).filter(
        PackCollaboration.collaborator_id == current_user.id
    ).all()
    
    return [
        {
            "id": collab.id,
            "pack_id": collab.pack_id,
            "pack_name": collab.pack.name,
            "owner_username": collab.owner.username,
            "created_at": collab.created_at.isoformat()
        }
        for collab in collaborations
    ]

@router.get("/users/")
async def get_all_users(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all users for the dropdown (excluding the current user)."""
    users = db.query(User).filter(User.id != current_user.id, User.is_active == True).order_by(User.username.asc()).all()
    return [{"id": user.id, "username": user.username, "email": user.email} for user in users] 