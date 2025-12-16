"""
Achievements API validation schemas.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class AchievementResponse(BaseModel):
    id: int
    code: str
    name: str
    description: str
    icon: str
    category: str
    points: int
    rarity: str
    target_value: Optional[int] = None
    metric_type: Optional[str] = None


class UserAchievementResponse(BaseModel):
    id: int
    achievement: AchievementResponse
    earned_at: Optional[str] = None


class AchievementProgressItem(BaseModel):
    current: int
    target: int
    percentage: float
    details: Optional[dict] = None  # For additional achievement-specific info


class AchievementProgressResponse(BaseModel):
    earned: bool
    progress: Optional[AchievementProgressItem] = None


class AchievementWithProgress(BaseModel):
    id: int
    code: str
    name: str
    description: str
    icon: str
    category: str
    points: int
    rarity: str
    target_value: Optional[int] = None
    metric_type: Optional[str] = None
    earned: bool
    earned_at: Optional[str] = None
    progress: Optional[AchievementProgressItem] = None


class UserStatsResponse(BaseModel):
    total_songs: int
    total_released: int
    total_future: int
    total_future_created: int
    total_wip: int
    total_wip_created: int
    total_packs: int
    total_collaborations: int
    total_spotify_imports: int
    total_feature_requests: int
    login_streak: int
    total_points: int


class AchievementProgressSummary(BaseModel):
    stats: UserStatsResponse
    progress: Dict[str, AchievementProgressResponse]
    total_points: int


class AchievementCheckResponse(BaseModel):
    newly_awarded: List[str]
    count: int


class LeaderboardEntry(BaseModel):
    user_id: int
    username: str
    total_points: int
    total_achievements: int
    rank: int


class LeaderboardResponse(BaseModel):
    leaderboard: List[LeaderboardEntry]
    current_user_rank: Optional[int] = None
    total_users: int


class PointsBreakdown(BaseModel):
    achievement_points: int
    release_points: int
    released_songs_count: int
    total_points: int
    breakdown: Dict[str, Any]


class AchievementsWithProgressResponse(BaseModel):
    achievements: List[AchievementWithProgress]
    points_breakdown: PointsBreakdown