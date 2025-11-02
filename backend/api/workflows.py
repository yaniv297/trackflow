"""
Custom Workflows API endpoints

Handles:
- Workflow template management (admin/system)
- User workflow customization 
- Song progress tracking
- Collaboration workflow inheritance
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from database import get_db
from api.auth import get_current_active_user
from workflow_schemas import (
    UserWorkflowOut, UserWorkflowUpdate,
    SongProgressOut, SongProgressUpdate, BulkProgressUpdate,
    WorkflowSummary
)

# TODO: Import the new workflow models once they're integrated into models.py
# from models import WorkflowTemplate, WorkflowTemplateStep, UserWorkflow, UserWorkflowStep, SongProgress, Song, User

router = APIRouter(prefix="/workflows", tags=["workflows"])


# ========================================
# User Workflows
# ========================================

@router.get("/my-workflow", response_model=UserWorkflowOut)
async def get_my_workflow(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get the current user's workflow configuration (SQLite-compatible)."""
    # Ensure a workflow exists for this user
    result = db.execute(text("SELECT id, user_id, name, description, template_id, created_at, updated_at FROM user_workflows WHERE user_id = :uid"), {"uid": current_user.id}).fetchone()
    if not result:
        # Create from default template if missing
        tmpl = db.execute(text("SELECT id FROM workflow_templates WHERE is_default = 1 LIMIT 1")).fetchone()
        if not tmpl:
            raise HTTPException(status_code=500, detail="Default workflow template missing")
        db.execute(text("INSERT INTO user_workflows (user_id, name, description, template_id, created_at, updated_at) VALUES (:uid, 'My Workflow', 'Customized workflow', :tid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"), {"uid": current_user.id, "tid": tmpl[0]})
        # Copy steps
        db.execute(text("""
            INSERT INTO user_workflow_steps (workflow_id, step_name, display_name, order_index)
            SELECT (SELECT id FROM user_workflows WHERE user_id = :uid), step_name, display_name, order_index
            FROM workflow_template_steps WHERE template_id = :tid
        """), {"uid": current_user.id, "tid": tmpl[0]})
        db.commit()
        result = db.execute(text("SELECT id, user_id, name, description, template_id, created_at, updated_at FROM user_workflows WHERE user_id = :uid"), {"uid": current_user.id}).fetchone()

    workflow_id = result[0]
    steps = db.execute(text("""
        SELECT id, workflow_id, step_name, display_name, order_index
        FROM user_workflow_steps WHERE workflow_id = :wid ORDER BY order_index
    """), {"wid": workflow_id}).fetchall()

    return {
        "id": result[0],
        "user_id": result[1],
        "name": result[2],
        "description": result[3],
        "template_id": result[4],
        "created_at": result[5],
        "updated_at": result[6],
        "steps": [
            {
                "id": s[0],
                "workflow_id": s[1],
                "step_name": s[2],
                "display_name": s[3],
                "order_index": s[4],
            }
            for s in steps
        ],
    }

@router.get("/my-workflow/summary", response_model=WorkflowSummary)
async def get_my_workflow_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get a summary of the current user's workflow"""
    raise HTTPException(status_code=404, detail="Not implemented yet")

@router.get("/user/{user_id}/workflow-fields")
async def get_user_workflow_fields(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get workflow fields for a specific user (for collaborator songs)"""
    # Get the user's workflow steps
    steps = db.execute(text("""
        SELECT uws.step_name, uws.display_name, uws.order_index
        FROM user_workflows uw
        JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
        WHERE uw.user_id = :uid
        ORDER BY uws.order_index
    """), {"uid": user_id}).fetchall()
    
    if not steps:
        # If no custom workflow, return empty array
        return {"authoringFields": []}
    
    # Extract just the step names
    authoring_fields = [step[0] for step in steps]
    
    return {"authoringFields": authoring_fields}

@router.put("/my-workflow", response_model=UserWorkflowOut)
async def update_my_workflow(
    workflow_update: UserWorkflowUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Update the current user's workflow configuration using raw SQL.
    Principle enforced: Songs already Released remain finished. When new steps are
    introduced, they are auto-marked complete in song_progress for released songs.
    """
    wf = db.execute(text("SELECT id FROM user_workflows WHERE user_id = :uid"), {"uid": current_user.id}).fetchone()
    if not wf:
        raise HTTPException(status_code=404, detail="No workflow found")
    wid = wf[0]

    # Previous set of step_names for delta detection
    prior_steps = db.execute(text("SELECT step_name FROM user_workflow_steps WHERE workflow_id = :wid"), {"wid": wid}).fetchall()
    prior_names = {row[0] for row in prior_steps}

    # Update basic fields
    if workflow_update.name is not None or getattr(workflow_update, 'description', None) is not None:
        db.execute(text("""
            UPDATE user_workflows
            SET name = COALESCE(:name, name),
                description = COALESCE(:desc, description),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :wid
        """), {"name": workflow_update.name, "desc": getattr(workflow_update, 'description', None), "wid": wid})

    # Replace steps if provided
    new_names = None
    if workflow_update.steps is not None:
        db.execute(text("DELETE FROM user_workflow_steps WHERE workflow_id = :wid"), {"wid": wid})
        for step in workflow_update.steps:
            db.execute(text("""
                INSERT INTO user_workflow_steps
                (workflow_id, step_name, display_name, order_index)
                VALUES (:wid, :step_name, :display_name, :order_index)
            """), {
                "wid": wid,
                "step_name": step.step_name,
                "display_name": step.display_name,
                "order_index": step.order_index,
            })
        new_names = {s.step_name for s in workflow_update.steps}
    db.commit()

    # Add new steps to WIP songs only (bulk insert)
    if new_names is not None:
        added = list(new_names - prior_names)
        if added:
            # Simpler, faster approach using COUNT
            prior_count = len(prior_names)
            
            for step in added:
                # Songs with all prior steps complete → mark new step complete
                db.execute(text("""
                    INSERT INTO song_progress (song_id, step_name, is_completed, completed_at, created_at, updated_at)
                    SELECT s.id, :step, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    FROM songs s
                    WHERE s.user_id = :uid AND s.status = 'In Progress'
                    AND (SELECT COUNT(*) FROM song_progress sp WHERE sp.song_id = s.id AND sp.is_completed = TRUE) >= :prior_count
                    ON CONFLICT(song_id, step_name) DO UPDATE SET
                        is_completed = TRUE,
                        completed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                """), {"uid": current_user.id, "step": step, "prior_count": prior_count})
                
                # All other WIP songs → mark new step incomplete
                db.execute(text("""
                    INSERT INTO song_progress (song_id, step_name, is_completed, created_at, updated_at)
                    SELECT s.id, :step, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    FROM songs s
                    WHERE s.user_id = :uid AND s.status = 'In Progress'
                    AND (SELECT COUNT(*) FROM song_progress sp WHERE sp.song_id = s.id AND sp.is_completed = TRUE) < :prior_count
                    ON CONFLICT(song_id, step_name) DO NOTHING
                """), {"uid": current_user.id, "step": step, "prior_count": prior_count})

    db.commit()
    
    # Return updated workflow
    return await get_my_workflow(db, current_user)

@router.post("/reset-to-default", response_model=UserWorkflowOut)
async def reset_to_default(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Reset user's workflow to the default template using raw SQL."""
    wf = db.execute(text("SELECT id FROM user_workflows WHERE user_id = :uid"), {"uid": current_user.id}).fetchone()
    if not wf:
        raise HTTPException(status_code=404, detail="No workflow found")
    wid = wf[0]

    tmpl = db.execute(text("SELECT id FROM workflow_templates WHERE is_default = 1 LIMIT 1")).fetchone()
    if not tmpl:
        raise HTTPException(status_code=500, detail="Default workflow template missing")

    db.execute(text("DELETE FROM user_workflow_steps WHERE workflow_id = :wid"), {"wid": wid})
    db.execute(text("""
        INSERT INTO user_workflow_steps (workflow_id, step_name, display_name, order_index)
        SELECT :wid, step_name, display_name, order_index
        FROM workflow_template_steps WHERE template_id = :tid
        ORDER BY order_index
    """), {"wid": wid, "tid": tmpl[0]})
    db.execute(text("UPDATE user_workflows SET template_id = :tid, updated_at = CURRENT_TIMESTAMP WHERE id = :wid"), {"tid": tmpl[0], "wid": wid})
    db.commit()

    return await get_my_workflow(db, current_user)

# ========================================
# Song Progress Tracking
# ========================================

@router.get("/songs/{song_id}/progress", response_model=List[SongProgressOut])
async def get_song_progress(
    song_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get progress for a specific song based on the owner's workflow.
    Ensures a row exists for every step in the owner's workflow.
    """
    # Owner of the song
    owner = db.execute(text("SELECT user_id FROM songs WHERE id = :sid"), {"sid": song_id}).fetchone()
    if not owner:
        raise HTTPException(status_code=404, detail="Song not found")
    owner_id = owner[0]

    # Steps from owner's workflow
    steps = db.execute(text(
        """
        SELECT uws.step_name
        FROM user_workflows uw
        JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
        WHERE uw.user_id = :uid
        ORDER BY uws.order_index
        """
    ), {"uid": owner_id}).fetchall()
    step_names = [s[0] for s in steps]

    # Ensure progress rows exist for each step
    for step in step_names:
        db.execute(text(
            """
            INSERT INTO song_progress (song_id, step_name, is_completed, created_at, updated_at)
            VALUES (:sid, :step, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(song_id, step_name) DO NOTHING
            """
        ), {"sid": song_id, "step": step})
    db.commit()

    # Return all progress rows for this song for the steps
    rows = db.execute(text(
        """
        SELECT id, song_id, step_name, is_completed, completed_at, created_at, updated_at
        FROM song_progress WHERE song_id = :sid AND step_name IN (%s)
        ORDER BY step_name
        """ % (",".join([":s%d" % i for i in range(len(step_names))]) if step_names else "'__none__'")),
        {**{"sid": song_id}, **{f"s{i}": n for i, n in enumerate(step_names)}}
    ).fetchall()

    return [
        {
            "id": r[0],
            "song_id": r[1],
            "step_name": r[2],
            "is_completed": bool(r[3]),
            "completed_at": r[4],
            "created_at": r[5],
            "updated_at": r[6],
        }
        for r in rows
    ]

@router.get("/songs/progress/bulk")
async def get_bulk_song_progress(
    song_ids: str,  # Comma-separated list of song IDs
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get progress for multiple songs at once to reduce API calls.
    
    Args:
        song_ids: Comma-separated list of song IDs (e.g., "1,2,3,4,5")
    
    Returns:
        Dict mapping song_id to progress map {step_name: is_completed}
    """
    if not song_ids:
        return {}
    
    try:
        ids = [int(id.strip()) for id in song_ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid song_ids format")
    
    if not ids or len(ids) > 500:  # Limit to 500 songs per request
        return {}
    
    # Fetch all progress for these songs in one query
    placeholders = ",".join([f":id{i}" for i in range(len(ids))])
    params = {f"id{i}": song_id for i, song_id in enumerate(ids)}
    
    rows = db.execute(text(f"""
        SELECT song_id, step_name, is_completed
        FROM song_progress
        WHERE song_id IN ({placeholders})
    """), params).fetchall()
    
    # Group by song_id
    result = {}
    for r in rows:
        song_id = r[0]
        if song_id not in result:
            result[song_id] = {}
        result[song_id][r[1]] = bool(r[2])  # step_name -> is_completed
    
    # Ensure all requested songs are in the result (even if no progress)
    for song_id in ids:
        if song_id not in result:
            result[song_id] = {}
    
    return result

@router.put("/songs/{song_id}/progress/{step_name}")
async def update_song_progress(
    song_id: int,
    step_name: str,
    progress_update: SongProgressUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Update progress for a specific step of a song"""
    raise HTTPException(status_code=501, detail="Not implemented yet")

@router.post("/songs/{song_id}/progress/bulk")
async def bulk_update_song_progress(
    song_id: int,
    bulk_update: BulkProgressUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Update multiple progress steps for a song at once"""
    raise HTTPException(status_code=501, detail="Not implemented yet")

# ========================================
# Helper Functions
# ========================================

def create_user_workflow_from_template(db: Session, user_id: int, template_id: int):
    """Helper function to create a user workflow from a template"""
    # TODO: Implement when models are ready
    pass

def get_user_workflow_steps(db: Session, user_id: int):
    """Helper function to get a user's current workflow steps"""
    # TODO: Implement when models are ready
    pass

def ensure_song_progress_exists(db: Session, song_id: int, owner_workflow_id: int):
    """Helper function to ensure progress records exist for all workflow steps"""
    # TODO: Implement when models are ready
    pass
