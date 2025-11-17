"""
Utility functions for logging user activities to the activity_logs table.
"""
from sqlalchemy.orm import Session
from models import ActivityLog
import json
from typing import Optional, Dict, Any


def log_activity(
    db: Session,
    user_id: int,
    activity_type: str,
    description: str,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log a user activity to the database.
    
    Args:
        db: Database session
        user_id: ID of the user performing the activity
        activity_type: Type of activity (e.g., "login", "create_song", "change_status", "import_spotify")
        description: Human-readable description of the activity
        metadata: Optional dictionary of additional data to store as JSON
    """
    try:
        activity = ActivityLog(
            user_id=user_id,
            activity_type=activity_type,
            description=description,
            metadata_json=json.dumps(metadata) if metadata else None
        )
        
        db.add(activity)
        db.commit()
    except Exception as e:
        # Don't fail the request if activity logging fails
        db.rollback()
        print(f"Failed to log activity: {e}")

