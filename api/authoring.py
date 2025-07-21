from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import AuthoringOut
from api.data_access import get_authoring_by_song_id
from models import Song, AuthoringProgress
router = APIRouter(prefix="/authoring", tags=["Authoring"])

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

