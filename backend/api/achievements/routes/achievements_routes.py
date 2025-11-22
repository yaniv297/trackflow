"""
Achievements API routes - handles HTTP requests for achievement operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from api.auth import get_current_active_user, get_optional_user
from ..services.achievements_service import AchievementsService
from ..validators.achievements_validators import (
    AchievementResponse, UserAchievementResponse, AchievementProgressSummary,
    AchievementCheckResponse, LeaderboardResponse
)


router = APIRouter(prefix="/achievements", tags=["Achievements"])
achievements_service = AchievementsService()


@router.get("/", response_model=List[AchievementResponse])
def get_all_achievements(db: Session = Depends(get_db)):
    """Get all available achievements."""
    try:
        return achievements_service.get_all_achievements(db)
    except Exception as e:
        print(f"❌ Error getting all achievements: {e}")
        raise HTTPException(status_code=500, detail="Failed to get achievements")


@router.get("/me", response_model=List[UserAchievementResponse])
def get_my_achievements(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get current user's earned achievements."""
    try:
        return achievements_service.get_user_achievements(db, current_user.id)
    except Exception as e:
        print(f"❌ Error getting user achievements: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user achievements")


@router.get("/me/progress", response_model=AchievementProgressSummary)
def get_my_achievement_progress(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get user's progress on count-based achievements."""
    try:
        return achievements_service.get_user_achievement_progress(db, current_user.id)
    except Exception as e:
        print(f"❌ Error getting achievement progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to get achievement progress")


@router.post("/check", response_model=AchievementCheckResponse)
def check_achievements(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Manually trigger achievement check for current user."""
    try:
        return achievements_service.check_achievements(db, current_user.id)
    except Exception as e:
        print(f"❌ Error checking achievements: {e}")
        raise HTTPException(status_code=500, detail="Failed to check achievements")


@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    request: Request,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get achievement points leaderboard. Works for both authenticated and unauthenticated users."""
    try:
        # Manually check for authentication without requiring it
        current_user_id = None
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            try:
                current_user = get_optional_user(request, db)
                if current_user:
                    current_user_id = current_user.id
            except Exception:
                # If auth check fails, just continue without user
                pass
        
        return achievements_service.get_leaderboard(db, current_user_id, limit)
    except Exception as e:
        print(f"❌ Error getting leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to get leaderboard")