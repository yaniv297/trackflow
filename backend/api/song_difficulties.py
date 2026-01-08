"""
Song Difficulties API - Optional feature for tracking instrument difficulty ratings
Rock Band-style difficulty tiers: 0-5 dots + devil tier
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Song, SongDifficulty
from api.auth import get_current_active_user
from pydantic import BaseModel, field_validator
from typing import Optional, Dict, List
from datetime import datetime

router = APIRouter(prefix="/songs", tags=["Song Difficulties"])

# Valid instruments
VALID_INSTRUMENTS = ['drums', 'bass', 'guitar', 'vocals', 'keys', 'pro_keys', 'harmonies']

# Difficulty labels for display
DIFFICULTY_LABELS = {
    -1: "No Part",
    0: "0 Dots",
    1: "1 Dot",
    2: "2 Dots",
    3: "3 Dots",
    4: "4 Dots",
    5: "5 Dots",
    6: "Devil",
}


class DifficultyUpdate(BaseModel):
    """Update a single instrument difficulty"""
    instrument: str
    difficulty: Optional[int] = None  # NULL = not set, -1 = no part, 0-5 = dots, 6 = devil
    
    @field_validator('instrument')
    @classmethod
    def validate_instrument(cls, v):
        if v not in VALID_INSTRUMENTS:
            raise ValueError(f"Invalid instrument. Must be one of: {', '.join(VALID_INSTRUMENTS)}")
        return v
    
    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v):
        if v is not None and (v < -1 or v > 6):
            raise ValueError("Difficulty must be between -1 (no part) and 6 (devil tier)")
        return v


class BulkDifficultyUpdate(BaseModel):
    """Update multiple instrument difficulties at once"""
    difficulties: Dict[str, Optional[int]]  # instrument -> difficulty
    
    @field_validator('difficulties')
    @classmethod
    def validate_difficulties(cls, v):
        for instrument, difficulty in v.items():
            if instrument not in VALID_INSTRUMENTS:
                raise ValueError(f"Invalid instrument '{instrument}'. Must be one of: {', '.join(VALID_INSTRUMENTS)}")
            if difficulty is not None and (difficulty < -1 or difficulty > 6):
                raise ValueError(f"Difficulty for {instrument} must be between -1 (no part) and 6 (devil tier)")
        return v


class DifficultyResponse(BaseModel):
    """Response for a single instrument difficulty"""
    instrument: str
    difficulty: Optional[int] = None
    difficulty_label: Optional[str] = None
    
    class Config:
        from_attributes = True


class SongDifficultiesResponse(BaseModel):
    """Response for all song difficulties"""
    song_id: int
    difficulties: Dict[str, Optional[int]]  # instrument -> difficulty
    difficulty_labels: Dict[str, str]  # instrument -> display label


@router.get("/{song_id}/difficulties", response_model=SongDifficultiesResponse)
def get_song_difficulties(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all difficulty ratings for a song"""
    
    # Verify song exists and user has access
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Get existing difficulties
    difficulties = db.query(SongDifficulty).filter(SongDifficulty.song_id == song_id).all()
    
    # Build response dict with all instruments (even if not set)
    result = {inst: None for inst in VALID_INSTRUMENTS}
    labels = {inst: "Not Set" for inst in VALID_INSTRUMENTS}
    
    for diff in difficulties:
        result[diff.instrument] = diff.difficulty
        if diff.difficulty is not None:
            labels[diff.instrument] = DIFFICULTY_LABELS.get(diff.difficulty, "Unknown")
    
    return SongDifficultiesResponse(
        song_id=song_id,
        difficulties=result,
        difficulty_labels=labels
    )


@router.put("/{song_id}/difficulties", response_model=SongDifficultiesResponse)
def update_song_difficulties(
    song_id: int,
    update: BulkDifficultyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update difficulty ratings for a song (bulk update)"""
    
    # Verify song exists
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user can edit this song (owner or collaborator)
    is_owner = song.user_id == current_user.id
    is_collaborator = any(
        c.user_id == current_user.id and c.collaboration_type.value in ['song_edit', 'SONG_EDIT']
        for c in (song.collaborations or [])
    )
    
    if not is_owner and not is_collaborator:
        raise HTTPException(status_code=403, detail="You don't have permission to edit this song's difficulties")
    
    # Update each instrument difficulty
    for instrument, difficulty in update.difficulties.items():
        existing = db.query(SongDifficulty).filter(
            SongDifficulty.song_id == song_id,
            SongDifficulty.instrument == instrument
        ).first()
        
        if existing:
            existing.difficulty = difficulty
            existing.updated_at = datetime.utcnow()
        else:
            new_diff = SongDifficulty(
                song_id=song_id,
                instrument=instrument,
                difficulty=difficulty
            )
            db.add(new_diff)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update difficulties: {str(e)}")
    
    # Return updated difficulties
    return get_song_difficulties(song_id, db, current_user)


@router.put("/{song_id}/difficulties/{instrument}", response_model=DifficultyResponse)
def update_single_difficulty(
    song_id: int,
    instrument: str,
    update: DifficultyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a single instrument difficulty"""
    
    if instrument not in VALID_INSTRUMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid instrument. Must be one of: {', '.join(VALID_INSTRUMENTS)}")
    
    # Verify song exists
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user can edit this song
    is_owner = song.user_id == current_user.id
    is_collaborator = any(
        c.user_id == current_user.id and c.collaboration_type.value in ['song_edit', 'SONG_EDIT']
        for c in (song.collaborations or [])
    )
    
    if not is_owner and not is_collaborator:
        raise HTTPException(status_code=403, detail="You don't have permission to edit this song's difficulties")
    
    # Update or create difficulty
    existing = db.query(SongDifficulty).filter(
        SongDifficulty.song_id == song_id,
        SongDifficulty.instrument == instrument
    ).first()
    
    if existing:
        existing.difficulty = update.difficulty
        existing.updated_at = datetime.utcnow()
        diff = existing
    else:
        diff = SongDifficulty(
            song_id=song_id,
            instrument=instrument,
            difficulty=update.difficulty
        )
        db.add(diff)
    
    try:
        db.commit()
        db.refresh(diff)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update difficulty: {str(e)}")
    
    return DifficultyResponse(
        instrument=diff.instrument,
        difficulty=diff.difficulty,
        difficulty_label=DIFFICULTY_LABELS.get(diff.difficulty, "Not Set") if diff.difficulty is not None else "Not Set"
    )


@router.get("/difficulties/bulk")
def get_bulk_song_difficulties(
    song_ids: str,  # Comma-separated song IDs
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get difficulties for multiple songs at once (for efficient loading)"""
    
    try:
        ids = [int(id.strip()) for id in song_ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid song_ids format. Must be comma-separated integers.")
    
    if not ids:
        return {}
    
    # Get all difficulties for the requested songs
    difficulties = db.query(SongDifficulty).filter(SongDifficulty.song_id.in_(ids)).all()
    
    # Build response: song_id -> { instrument -> difficulty }
    result = {}
    for song_id in ids:
        result[song_id] = {inst: None for inst in VALID_INSTRUMENTS}
    
    for diff in difficulties:
        if diff.song_id in result:
            result[diff.song_id][diff.instrument] = diff.difficulty
    
    return result

