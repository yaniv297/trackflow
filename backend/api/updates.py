from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Update
from schemas import UpdateOut
from typing import List, Optional
from sqlalchemy import desc

router = APIRouter(prefix="/updates", tags=["Updates"])

@router.get("", response_model=List[UpdateOut])
def get_latest_updates(
    limit: Optional[int] = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get the latest updates for the home page.
    Public endpoint - no authentication required.
    Returns updates ordered by date (most recent first).
    """
    updates = db.query(Update).options(
        joinedload(Update.author)
    ).order_by(
        desc(Update.date),
        desc(Update.created_at)
    ).limit(limit).all()
    
    result = []
    for update in updates:
        # Ensure author is loaded
        if not hasattr(update, 'author') or update.author is None:
            # Reload if not already loaded
            db.refresh(update, ["author"])
        
        result.append(UpdateOut(
            id=update.id,
            title=update.title,
            content=update.content,
            type=update.type,
            author_id=update.author_id,
            author=update.author.username if update.author else "Unknown",
            date=update.date,
            created_at=update.created_at,
            updated_at=update.updated_at
        ))
    
    return result

