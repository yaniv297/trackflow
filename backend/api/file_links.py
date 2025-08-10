from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
from auth import get_current_active_user
from models import FileLink, Song, User, Collaboration, CollaborationType
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/file-links", tags=["file-links"])

class FileLinkCreate(BaseModel):
    file_url: str
    message: str

class FileLinkOut(BaseModel):
    id: int
    song_id: int
    user_id: int
    username: str  # Username of the user who uploaded
    file_url: str
    message: str
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/{song_id}", response_model=List[FileLinkOut])
def get_file_links(song_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all file links for a song"""
    # Check if song exists and user has access
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user has permission to view this song
    can_view = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None or  # User is a direct collaborator
        db.query(Collaboration).filter(
            Collaboration.pack_id == song.pack_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
        ).first() is not None  # User has pack access
    )
    
    if not can_view:
        raise HTTPException(status_code=403, detail="You don't have permission to view this song")
    
    # Get file links with user information
    file_links = db.query(FileLink).options(
        joinedload(FileLink.user)
    ).filter(FileLink.song_id == song_id).order_by(FileLink.created_at.desc()).all()
    
    # Convert to response format
    result = []
    for link in file_links:
        link_dict = {
            "id": link.id,
            "song_id": link.song_id,
            "user_id": link.user_id,
            "username": link.user.username,
            "file_url": link.file_url,
            "message": link.message,
            "created_at": link.created_at
        }
        result.append(FileLinkOut.model_validate(link_dict, from_attributes=True))
    
    return result

@router.post("/{song_id}", response_model=FileLinkOut)
def create_file_link(song_id: int, file_link: FileLinkCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Create a new file link for a song"""
    # Check if song exists and user has edit access
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user has permission to edit this song
    can_edit = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None or  # User is a direct collaborator
        db.query(Collaboration).filter(
            Collaboration.pack_id == song.pack_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.PACK_EDIT
        ).first() is not None  # User has pack edit access
    )
    
    if not can_edit:
        raise HTTPException(status_code=403, detail="You don't have permission to edit this song")
    
    # Validate file URL (basic validation)
    if not file_link.file_url.strip():
        raise HTTPException(status_code=400, detail="File URL cannot be empty")
    
    if not file_link.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Create new file link
    new_file_link = FileLink(
        song_id=song_id,
        user_id=current_user.id,
        file_url=file_link.file_url.strip(),
        message=file_link.message.strip()
    )
    
    db.add(new_file_link)
    db.commit()
    db.refresh(new_file_link)
    
    # Return with user information
    link_dict = {
        "id": new_file_link.id,
        "song_id": new_file_link.song_id,
        "user_id": new_file_link.user_id,
        "username": current_user.username,
        "file_url": new_file_link.file_url,
        "message": new_file_link.message,
        "created_at": new_file_link.created_at
    }
    
    return FileLinkOut.model_validate(link_dict, from_attributes=True)

@router.delete("/{link_id}", status_code=204)
def delete_file_link(link_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Delete a file link (only the user who created it can delete it)"""
    # Check if file link exists
    file_link = db.query(FileLink).filter(FileLink.id == link_id).first()
    if not file_link:
        raise HTTPException(status_code=404, detail="File link not found")
    
    # Check if user can delete this link (only the creator can delete)
    if file_link.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own file links")
    
    db.delete(file_link)
    db.commit()
    
    return None 