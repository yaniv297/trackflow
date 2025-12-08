"""Pack completion analysis routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from api.auth import get_current_active_user
from ..schemas import PackCompletionResponse
from ..services.pack_completion_service import PackCompletionService

router = APIRouter()


@router.get("/near-completion", response_model=List[PackCompletionResponse])
def get_packs_near_completion(
    limit: int = Query(3, le=10),
    threshold: int = Query(70, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get packs that are close to completion for the current user."""
    completion_service = PackCompletionService(db)
    return completion_service.get_packs_near_completion(
        current_user.id, 
        limit, 
        threshold
    )