from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from schemas import AuthoringOut
from api.data_access import get_authoring_by_song_id
from models import Song, WipCollaboration, Authoring, Collaboration, CollaborationType, SongStatus
from api.auth import get_current_active_user
from sqlalchemy import text

class EditPartsRequest(BaseModel):
    disabled_parts: List[str]
router = APIRouter(prefix="/authoring", tags=["Authoring"])

# Define specific routes FIRST to avoid conflicts with /{song_id}
@router.get("/recent")
def get_recent_authoring_activity(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get recent authoring activity for the current user (songs they own or collaborate on)"""
    recent_activity = db.execute(
        text("""
            SELECT DISTINCT
                sp.step_name as part_name,
                s.title as song_title,
                sp.song_id,
                sp.completed_at,
                s.artist
            FROM song_progress sp
            JOIN songs s ON s.id = sp.song_id
            LEFT JOIN collaborations c_song ON c_song.song_id = s.id 
                AND c_song.user_id = :user_id 
                AND c_song.collaboration_type = 'SONG_EDIT'
            LEFT JOIN collaborations c_pack ON c_pack.pack_id = s.pack_id 
                AND c_pack.user_id = :user_id 
                AND c_pack.collaboration_type = 'PACK_EDIT'
            WHERE (
                s.user_id = :user_id 
                OR c_song.id IS NOT NULL
                OR c_pack.id IS NOT NULL
            )
            AND (sp.is_completed = 1 OR sp.is_completed = TRUE)
            AND sp.completed_at IS NOT NULL
            ORDER BY sp.completed_at DESC
            LIMIT :limit
        """),
        {"user_id": current_user.id, "limit": limit}
    ).fetchall()
    
    return [
        {
            "part_name": row.part_name,
            "song_title": row.song_title,
            "song_id": row.song_id,
            "completed_at": row.completed_at,
            "artist": row.artist
        }
        for row in recent_activity
    ]

@router.get("/{song_id}", response_model=AuthoringOut)
def get_authoring(song_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Check if the song exists and current user has access (owns it OR is a collaborator)
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user owns the song or is a collaborator
    can_access = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None  # User is a collaborator
    )
    
    if not can_access:
        raise HTTPException(status_code=403, detail="You don't have permission to access this song's authoring")
    
    record = get_authoring_by_song_id(db, song_id)
    if not record:
        raise HTTPException(status_code=404, detail="No authoring data for this song")
    return record

@router.put("/{song_id}")
def update_authoring(song_id: int, updates: dict, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Update authoring for a song.
    Writes to the new song_progress table (one row per step), and keeps the legacy
    Authoring booleans in sync for backward compatibility during transition.
    """
    # Check if the song exists and current user has access (owns it OR is a collaborator)
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user owns the song or is a collaborator
    can_access = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None  # User is a collaborator
    )
    
    if not can_access:
        raise HTTPException(status_code=403, detail="You don't have permission to update this song's authoring")

    # Ensure legacy authoring row exists (temporary during cutover)
    if not song.authoring:
        authoring = Authoring(song_id=song.id)
        db.add(authoring)
        db.commit()
        db.refresh(authoring)
        song.authoring = authoring

    # Upsert into song_progress and mirror to legacy booleans
    for step_name, value in updates.items():
        is_completed = bool(value)
        # song_progress upsert (SQLite-compatible using insert-or-update pattern)
        # Try update first
        updated = db.execute(
            text(
                """
                UPDATE song_progress
                SET is_completed = :is_completed,
                    completed_at = CASE WHEN :is_completed = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE song_id = :song_id AND step_name = :step_name
                """
            ),
            {"is_completed": is_completed, "song_id": song.id, "step_name": step_name},
        )
        if updated.rowcount == 0:
            db.execute(
                text(
                    """
                    INSERT INTO song_progress (song_id, step_name, is_completed, completed_at, created_at, updated_at)
                    VALUES (:song_id, :step_name, :is_completed,
                            CASE WHEN :is_completed = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END,
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """
                ),
                {"song_id": song.id, "step_name": step_name, "is_completed": is_completed},
            )
        # Note: Legacy authoring table mirroring removed as it's a view
    
    db.commit()
    db.refresh(song)
    
    # Check achievements after authoring update
    try:
        from api.achievements import check_quality_achievements, check_wip_completion_achievements
        check_quality_achievements(db, current_user.id)
        # Check WIP completion achievements - songs become complete when all workflow steps are done
        # Only check if song is in Released status (completed WIP songs are released)
        if song.status == SongStatus.released:
            check_wip_completion_achievements(db, current_user.id)
    except Exception as ach_err:
        print(f"⚠️ Failed to check achievements: {ach_err}")
    
    return {"message": "Authoring updated"}

@router.post("/complete/{song_id}")
def mark_all_authoring_complete(song_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Check if the song exists and current user has access (owns it OR is a collaborator)
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user owns the song or is a collaborator
    can_access = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None  # User is a collaborator
    )
    
    if not can_access:
        raise HTTPException(status_code=403, detail="You don't have permission to complete this song's authoring")

    # Ensure legacy authoring progress exists (temporary during cutover)
    if not song.authoring:
        authoring = Authoring(song_id=song.id)
        db.add(authoring)
        db.commit()
        db.refresh(authoring)
        song.authoring = authoring

    # Determine steps to complete from owner's workflow - REQUIRED, no fallback
    rows = db.execute(
        text(
            """
            SELECT uws.step_name
            FROM user_workflows uw
            JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
            WHERE uw.user_id = :uid
            ORDER BY uws.order_index
            """
        ),
        {"uid": song.user_id},
    ).fetchall()
    step_names = [r[0] for r in rows]
    
    if not step_names:
        raise HTTPException(
            status_code=409,
            detail="USER_WORKFLOW_NOT_CONFIGURED: Song owner's workflow is not configured. Cannot mark steps as complete."
        )

    # Upsert all steps as completed
    for step in step_names:
        db.execute(
            text(
                """
                INSERT INTO song_progress (song_id, step_name, is_completed, completed_at, created_at, updated_at)
                VALUES (:sid, :step, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT(song_id, step_name) DO UPDATE SET
                  is_completed = TRUE,
                  completed_at = CURRENT_TIMESTAMP,
                  updated_at = CURRENT_TIMESTAMP
                """
            ),
            {"sid": song.id, "step": step},
        )
        # Note: Legacy authoring table mirroring removed as it's a view

    db.commit()
    db.refresh(song)
    
    # Check achievements after marking all complete
    try:
        from api.achievements import check_quality_achievements, check_wip_completion_achievements
        check_quality_achievements(db, current_user.id)
        # Check WIP completion achievements - songs become complete when all workflow steps are done
        # Only check if song is in Released status (completed WIP songs are released)
        if song.status == SongStatus.released:
            check_wip_completion_achievements(db, current_user.id)
    except Exception as ach_err:
        print(f"⚠️ Failed to check achievements: {ach_err}")
    
    return {"success": True}

@router.get("/{song_id}/wip-collaborations")
async def get_wip_collaborations(
    song_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get WIP collaborations for a song.
    Returns: List of collaborator assignments
    """
    # Check if the song exists and current user has access (owns it OR is a collaborator)
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user owns the song or is a collaborator
    can_access = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None  # User is a collaborator
    )
    
    if not can_access:
        raise HTTPException(status_code=403, detail="You don't have permission to access this song's collaborations")
    
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
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Update WIP collaborations for a song.
    request: {"assignments": [{"collaborator": "John", "field": "drums"}]}
    """
    # Check if the song exists and current user has access (owns it OR is a collaborator)
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Check if user owns the song or is a collaborator
    can_access = (
        song.user_id == current_user.id or  # User owns the song
        db.query(Collaboration).filter(
            Collaboration.song_id == song_id,
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).first() is not None  # User is a collaborator
    )
    
    if not can_access:
        raise HTTPException(status_code=403, detail="You don't have permission to update this song's collaborations")
    
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

