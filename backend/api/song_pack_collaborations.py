from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional
from database import get_db
from models import SongPackCollaboration, User, Song, Pack, SongCollaboration
from auth import get_current_active_user

router = APIRouter(prefix="/song-pack-collaborations", tags=["Song Pack Collaborations"])

class SongPackCollaborationRequest(BaseModel):
    pack_id: int
    collaborator_username: str
    song_ids: List[int]  # List of song IDs to give edit access to

class SongPackCollaborationResponse(BaseModel):
    id: int
    pack_id: int
    pack_name: str
    song_id: int
    song_title: str
    collaborator_username: str
    can_edit: bool
    created_at: str

@router.post("/")
async def add_song_pack_collaborator(
    request: SongPackCollaborationRequest, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Add a collaborator to specific songs in a pack"""
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
    
    # Verify all songs belong to the pack
    songs = db.query(Song).filter(
        Song.id.in_(request.song_ids),
        Song.pack_id == request.pack_id
    ).all()
    
    if len(songs) != len(request.song_ids):
        raise HTTPException(status_code=400, detail="Some songs do not belong to this pack")
    
    # Check if collaboration already exists for this user on this pack
    existing_collaboration = db.query(SongPackCollaboration).filter(
        SongPackCollaboration.pack_id == request.pack_id,
        SongPackCollaboration.collaborator_id == collaborator.id
    ).first()
    
    if existing_collaboration:
        raise HTTPException(status_code=400, detail="Collaboration already exists for this user on this pack")
    
    # Create new collaborations for each song
    pack_collaborations = []
    song_collaborations = []
    
    for song_id in request.song_ids:
        # Create SongPackCollaboration entry
        pack_collaboration = SongPackCollaboration(
            pack_id=request.pack_id,
            song_id=song_id,
            owner_id=current_user.id,
            collaborator_id=collaborator.id,
            can_edit=True
        )
        pack_collaborations.append(pack_collaboration)
        
        # Create bidirectional SongCollaboration entries
        # 1. Owner -> Collaborator
        owner_to_collab = SongCollaboration(
            song_id=song_id,
            collaborator_id=collaborator.id,
            role=None
        )
        song_collaborations.append(owner_to_collab)
        
        # 2. Collaborator -> Owner (so collaborator sees owner in their view)
        collab_to_owner = SongCollaboration(
            song_id=song_id,
            collaborator_id=current_user.id,
            role=None
        )
        song_collaborations.append(collab_to_owner)
    
    db.add_all(pack_collaborations)
    db.add_all(song_collaborations)
    db.commit()
    
    return {"message": f"Collaborator added to {len(pack_collaborations)} songs"}

@router.delete("/{pack_id}/{collaborator_username}")
async def remove_song_pack_collaborator(
    pack_id: int, 
    collaborator_username: str, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Remove a collaborator from all songs in a pack"""
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
    
    # Find and delete all pack collaborations for this user on this pack
    pack_collaborations = db.query(SongPackCollaboration).filter(
        SongPackCollaboration.pack_id == pack_id,
        SongPackCollaboration.collaborator_id == collaborator.id
    ).all()
    
    # Get the song IDs from the pack collaborations
    song_ids = [collab.song_id for collab in pack_collaborations]
    
    # Delete pack collaborations
    for collaboration in pack_collaborations:
        db.delete(collaboration)
    
    # Delete bidirectional song collaborations
    if song_ids:
        # Remove owner -> collaborator collaborations
        db.query(SongCollaboration).filter(
            SongCollaboration.song_id.in_(song_ids),
            SongCollaboration.collaborator_id == collaborator.id
        ).delete()
        
        # Remove collaborator -> owner collaborations
        db.query(SongCollaboration).filter(
            SongCollaboration.song_id.in_(song_ids),
            SongCollaboration.collaborator_id == current_user.id
        ).delete()
    
    db.commit()
    
    return {"message": "Collaborator removed successfully"}

@router.get("/my-collaborations/")
async def get_my_song_pack_collaborations(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Get all song pack collaborations where the current user is a collaborator"""
    collaborations = db.query(SongPackCollaboration).options(
        joinedload(SongPackCollaboration.pack),
        joinedload(SongPackCollaboration.song),
        joinedload(SongPackCollaboration.owner)
    ).filter(
        SongPackCollaboration.collaborator_id == current_user.id
    ).all()
    
    return [
        {
            "id": collab.id,
            "pack_id": collab.pack_id,
            "pack_name": collab.pack.name,
            "song_id": collab.song_id,
            "song_title": collab.song.title,
            "can_edit": collab.can_edit,
            "created_at": collab.created_at.isoformat()
        }
        for collab in collaborations
    ]

@router.get("/pack/{pack_id}")
async def get_pack_song_collaborations(
    pack_id: int, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_user)
):
    """Get all song collaborations for a specific pack"""
    # Check if user has access to this pack
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Check if user owns the pack or is a collaborator
    if pack.user_id != current_user.id:
        is_collaborator = db.query(SongPackCollaboration).filter(
            SongPackCollaboration.pack_id == pack_id,
            SongPackCollaboration.collaborator_id == current_user.id
        ).first()
        if not is_collaborator:
            raise HTTPException(status_code=403, detail="Not authorized to view this pack")
    
    collaborations = db.query(SongPackCollaboration).options(
        joinedload(SongPackCollaboration.song),
        joinedload(SongPackCollaboration.collaborator)
    ).filter(
        SongPackCollaboration.pack_id == pack_id
    ).all()
    
    # Group by collaborator
    collaborator_groups = {}
    for collab in collaborations:
        username = collab.collaborator.username
        if username not in collaborator_groups:
            collaborator_groups[username] = []
        collaborator_groups[username].append({
            "song_id": collab.song_id,
            "song_title": collab.song.title,
            "can_edit": collab.can_edit
        })
    
    return [
        {
            "collaborator_username": username,
            "songs": songs
        }
        for username, songs in collaborator_groups.items()
    ] 