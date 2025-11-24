from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from api.auth import get_current_active_user
from services.suggestions_service import SuggestionsService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/suggestions")
def get_dashboard_suggestions(
    limit: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Return unified dashboard suggestions (songs + packs)."""
    service = SuggestionsService(db, current_user)
    return service.get_suggestions(limit=limit)

