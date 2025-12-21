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
    AchievementCheckResponse, LeaderboardResponse, AchievementWithProgress,
    AchievementsWithProgressResponse, PointsBreakdown
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


@router.get("/with-progress", response_model=List[AchievementWithProgress])
def get_achievements_with_progress(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get all achievements with progress data for current user."""
    try:
        return achievements_service.get_all_achievements_with_progress(db, current_user.id)
    except Exception as e:
        print(f"❌ Error getting achievements with progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to get achievements with progress")


@router.get("/with-progress-and-breakdown", response_model=AchievementsWithProgressResponse)
def get_achievements_with_progress_and_breakdown(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get all achievements with progress data and points breakdown for current user (optimized single call)."""
    try:
        user_id = current_user.id
        
        # Get achievements
        achievements = achievements_service.get_all_achievements_with_progress(db, user_id)
        
        # Get points breakdown efficiently from repository layer
        points_data = achievements_service.repository.get_points_breakdown_optimized(db, user_id)
        
        points_breakdown = PointsBreakdown(
            achievement_points=points_data["achievement_points"],
            release_points=points_data["release_points"],
            released_songs_count=points_data["released_songs_count"],
            total_points=points_data["total_points"],
            breakdown=points_data["breakdown"]
        )
        
        return AchievementsWithProgressResponse(
            achievements=achievements,
            points_breakdown=points_breakdown
        )
    except Exception as e:
        print(f"❌ Error getting achievements with progress and breakdown: {e}")
        raise HTTPException(status_code=500, detail="Failed to get achievements with progress and breakdown")


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


@router.get("/points")
def get_my_points(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get current user's total achievement points (lightweight endpoint for top nav)."""
    try:
        from models import UserStats
        user_stats = db.query(UserStats).filter(UserStats.user_id == current_user.id).first()
        total_points = user_stats.total_points if user_stats else 0
        return {"total_points": total_points}
    except Exception as e:
        print(f"❌ Error getting user points: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user points")


@router.get("/info")
def get_achievement_info():
    """Get general information about the achievement and points system."""
    return {
        "point_system": {
            "achievements": {
                "description": "Earn points by unlocking achievements",
                "categories": ["milestone_released", "milestone_future", "milestone_wip", "quality", "social", "diversity"]
            },
            "release_bonus": {
                "points": 10,
                "description": "Earn 10 points for every song you release",
                "note": "Immediate reward on song release, regardless of achievements"
            }
        },
        "tips": [
            "Release more songs to earn points faster",
            "Unlock achievements for bonus points",
            "Check your progress in the Stats section"
        ]
    }

@router.get("/points-breakdown")
def get_points_breakdown(db: Session = Depends(get_db), current_user=Depends(get_current_active_user)):
    """Get detailed points breakdown for the current user."""
    try:
        user_id = current_user.id
        
        # Get points breakdown from repository layer (optimized)
        points_data = achievements_service.repository.get_points_breakdown_optimized(db, user_id)
        return points_data
        
    except Exception as e:
        print(f"❌ Error getting points breakdown: {e}")
        raise HTTPException(status_code=500, detail="Failed to get points breakdown")