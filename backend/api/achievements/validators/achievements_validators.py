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


class UserAchievementResponse(BaseModel):
    id: int
    achievement: AchievementResponse
    earned_at: Optional[str] = None


class AchievementProgressItem(BaseModel):
    current: int
    target: int


class AchievementProgressResponse(BaseModel):
    earned: bool
    progress: Optional[AchievementProgressItem] = None


class UserStatsResponse(BaseModel):
    total_songs: int
    total_released: int
    total_future: int
    total_wip: int
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