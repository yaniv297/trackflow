from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from schemas import AuthoringOut
from api.data_access import get_authoring_by_song_id
from models import Song, AuthoringProgress, WipCollaboration

class EditPartsRequest(BaseModel):
    disabled_parts: List[str]
router = APIRouter(prefix="/authoring", tags=["Authoring"], trailing_slash=False)

@router.get("/{song_id}", response_model=AuthoringOut)
def get_authoring(song_id: int, db: Session = Depends(get_db)):
    record = get_authoring_by_song_id(db, song_id)
    if not record:
        raise HTTPException(status_code=404, detail="No authoring data for this song")
    return record

@router.put("/{song_id}")
def update_authoring(song_id: int, updates: dict, db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    # Ensure authoring progress exists
    if not song.authoring:
        authoring = AuthoringProgress(song_id=song.id)
        db.add(authoring)
        db.commit()
        db.refresh(authoring)
        song.authoring = authoring

    for key, value in updates.items():
        setattr(song.authoring, key, value)
    
    db.commit()
    db.refresh(song)
    return {"message": "Authoring updated"}

@router.post("/complete/{song_id}")
def mark_all_authoring_complete(song_id: int, db: Session = Depends(get_db)):
    song = db.query(Song).get(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    # Ensure authoring progress exists
    if not song.authoring:
        authoring = AuthoringProgress(song_id=song.id)
        db.add(authoring)
        db.commit()
        db.refresh(authoring)
        song.authoring = authoring

    # Set all fields to True
    for field in [
        "demucs", "midi", "tempo_map", "fake_ending", "drums", "bass", "guitar",
        "vocals", "harmonies", "pro_keys", "keys", "animations",
        "drum_fills", "overdrive", "compile"
    ]:
        setattr(song.authoring, field, True)

    db.commit()
    db.refresh(song)
    return {"success": True}

@router.get("/{song_id}/wip-collaborations")
async def get_wip_collaborations(
    song_id: int,
    db: Session = Depends(get_db)
):
    """
    Get WIP collaborations for a song.
    Returns: List of collaborator assignments
    """
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Get WIP collaborations from database
    wip_collaborations = db.query(WipCollaboration).filter(
        WipCollaboration.song_id == song_id
    ).all()
    
    assignments = [
        {
            "collaborator": collab.collaborator,
            "field": collab.field
        }
        for collab in wip_collaborations
    ]
    
    return {"assignments": assignments}

@router.put("/{song_id}/wip-collaborations")
async def update_wip_collaborations(
    song_id: int,
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Update WIP collaborations for a song.
    request: {"assignments": [{"collaborator": "John", "field": "drums"}]}
    """
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    assignments = request.get("assignments", [])
    
    # Delete existing WIP collaborations for this song
    db.query(WipCollaboration).filter(
        WipCollaboration.song_id == song_id
    ).delete()
    
    # Add new WIP collaborations
    for assignment in assignments:
        wip_collab = WipCollaboration(
            song_id=song_id,
            collaborator=assignment["collaborator"],
            field=assignment["field"]
        )
        db.add(wip_collab)
    
    db.commit()
    return {"message": "WIP collaborations updated successfully"}

