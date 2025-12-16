from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from schemas import AuthoringOut
from api.data_access import get_authoring_by_song_id
from models import (
    Song,
    WipCollaboration,
    Authoring,
    Collaboration,
    CollaborationType,
    SongStatus,
    User,
    NotificationType,
)
from api.notifications.services.notification_service import NotificationService
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
            -- Postgres uses real booleans; filter only completed steps
            AND sp.is_completed IS TRUE
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

    # Track which steps transitioned from incomplete → complete for collaboration notifications
    step_names = list(updates.keys())
    existing_status = {}
    if step_names:
        # Fetch existing completion state for these steps
        placeholders = ",".join([f":step_{i}" for i in range(len(step_names))])
        params = {"song_id": song.id}
        for i, name in enumerate(step_names):
            params[f"step_{i}"] = name
        rows = db.execute(
            text(
                f"""
                SELECT step_name, is_completed
                FROM song_progress
                WHERE song_id = :song_id AND step_name IN ({placeholders})
                """
            ),
            params,
        ).fetchall()
        for row in rows:
            existing_status[row.step_name] = bool(row.is_completed)

    newly_completed_steps = []

    # Upsert into song_progress
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

        # Track transitions from incomplete → complete for collaboration notifications
        if is_completed and not existing_status.get(step_name, False):
            newly_completed_steps.append(step_name)
        # Note: Legacy authoring table mirroring removed as it's a view
    
    db.commit()
    db.refresh(song)
    
    # Invalidate completion cache for this song
    try:
        from services.completion_cache import invalidate_song_cache
        invalidate_song_cache(song_id)
    except Exception as e:
        # Don't fail the request if cache invalidation fails
        print(f"⚠️ Failed to invalidate cache for song {song_id}: {e}")

    # Collaboration authoring notifications:
    # Notify other collaborators when a part is newly authored/completed on a collaboration song.
    if newly_completed_steps:
        try:
            notification_service = NotificationService(db)
            actor_name = getattr(current_user, "display_name", None) or current_user.username
            # Send one notification per completed step for clarity
            for step_name in newly_completed_steps:
                pretty_step = step_name.replace("_", " ").title()
                title = f"Authoring progress on {song.title}"
                message = f"{actor_name} authored {pretty_step} on '{song.title}'"
                notification_service.notify_song_collaborators(
                    song_id=song.id,
                    actor_user_id=current_user.id,
                    notification_type=NotificationType.COLLAB_SONG_PROGRESS,
                    title=title,
                    message=message,
                )
        except Exception as e:
            print(f"⚠️ Failed to notify collaborators about authoring progress: {e}")
    
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
    
    # Snapshot existing assignments for this song (for change detection / messaging)
    previous_assignments = db.query(WipCollaboration).filter(
        WipCollaboration.song_id == song_id
    ).all()
    prev_map = {}
    for collab in previous_assignments:
        prev_map.setdefault(collab.collaborator, set()).add(collab.field)
    
    # Delete existing WIP collaborations for this song
    db.query(WipCollaboration).filter(
        WipCollaboration.song_id == song_id
    ).delete()
    
    # Add new WIP collaborations
    new_map = {}
    for assignment in assignments:
        collaborator_name = assignment["collaborator"]
        field_name = assignment["field"]
        wip_collab = WipCollaboration(
            song_id=song_id,
            collaborator=collaborator_name,
            field=field_name
        )
        db.add(wip_collab)
        new_map.setdefault(collaborator_name, set()).add(field_name)
    
    db.commit()

    # Only notify for WIP collaboration songs
    if song.status == SongStatus.wip:
        try:
            notification_service = NotificationService(db)
            actor_name = getattr(current_user, "display_name", None) or current_user.username

            # Build a human-readable summary of the current assignments
            collaborator_users = (
                db.query(User)
                .filter(User.username.in_(list(new_map.keys())))
                .all()
            )
            username_to_display = {
                u.username: (u.display_name or u.username) for u in collaborator_users
            }

            parts_segments = []
            for username, fields in new_map.items():
                if username not in username_to_display:
                    continue
                pretty_fields = ", ".join(sorted(f.replace("_", " ").title() for f in fields))
                parts_segments.append(f"{pretty_fields} to {username_to_display[username]}")

            if parts_segments:
                summary = "; ".join(parts_segments)
                title = f"Collaboration split updated on {song.title}"
                message = f"{actor_name} updated collaboration assignments on '{song.title}': {summary}"
                notification_service.notify_song_collaborators(
                    song_id=song.id,
                    actor_user_id=current_user.id,
                    notification_type=NotificationType.COLLAB_WIP_ASSIGNMENTS,
                    title=title,
                    message=message,
                )
        except Exception as e:
            print(f"⚠️ Failed to notify collaborators about WIP collaboration changes: {e}")

    return {"message": "WIP collaborations updated successfully"}

