"""
Achievements service - contains business logic for achievement operations.
"""

from typing import List, Optional, Dict, Any, Set
from sqlalchemy.orm import Session

from models import Achievement, UserAchievement, UserStats, SongStatus
from ..repositories.achievements_repository import AchievementsRepository
from ..validators.achievements_validators import (
    AchievementResponse, UserAchievementResponse, AchievementProgressSummary,
    UserStatsResponse, AchievementProgressResponse, AchievementProgressItem,
    AchievementCheckResponse, LeaderboardResponse, LeaderboardEntry,
    AchievementWithProgress
)
from api.notifications.services.notification_service import NotificationService


class AchievementsService:
    def __init__(self):
        self.repository = AchievementsRepository()

    def get_all_achievements(self, db: Session) -> List[AchievementResponse]:
        """Get all available achievements."""
        achievements = self.repository.get_all_achievements(db)
        
        return [
            AchievementResponse(
                id=a.id,
                code=a.code,
                name=a.name,
                description=a.description,
                icon=a.icon,
                category=a.category,
                points=a.points,
                rarity=a.rarity
            )
            for a in achievements
        ]
    
    def get_all_achievements_with_progress(self, db: Session, user_id: int) -> List[AchievementWithProgress]:
        """Get all achievements with progress data for the user."""
        try:
            # Get all achievements
            all_achievements = self.repository.get_all_achievements(db)
            
            # Get user's earned achievements
            earned_achievements = self.repository.get_user_achievements(db, user_id)
            earned_codes = {ua.achievement.code: ua for ua in earned_achievements}
            
            # Get user stats for progress calculation
            stats = self.update_user_stats(db, user_id)
            
            result = []
            for achievement in all_achievements:
                is_earned = achievement.code in earned_codes
                
                # Calculate progress for unearned achievements with target values
                progress = None
                if not is_earned and achievement.target_value and achievement.metric_type:
                    current_value = self._calculate_metric_value(achievement.metric_type, stats, db, user_id)
                    percentage = min((current_value / achievement.target_value) * 100, 100)
                    
                    # Add special details for alphabet collector achievement
                    details = None
                    if achievement.code == 'alphabet_collector':
                        try:
                            alphabet_details = self.repository.get_alphabet_coverage_details(db, user_id)
                            details = {
                                'missing_letters': alphabet_details['missing_letters'],
                                'found_letters': alphabet_details['found_letters']
                            }
                        except Exception as e:
                            print(f"⚠️ Error getting alphabet details: {e}")
                    
                    progress = AchievementProgressItem(
                        current=current_value,
                        target=achievement.target_value,
                        percentage=round(percentage, 1),
                        details=details
                    )
                
                # Get earned date if applicable
                earned_at = None
                if is_earned:
                    user_achievement = earned_codes[achievement.code]
                    earned_at = user_achievement.earned_at.isoformat() if user_achievement.earned_at else None
                
                result.append(AchievementWithProgress(
                    id=achievement.id,
                    code=achievement.code,
                    name=achievement.name,
                    description=achievement.description,
                    icon=achievement.icon,
                    category=achievement.category,
                    points=achievement.points,
                    rarity=achievement.rarity,
                    target_value=achievement.target_value,
                    metric_type=achievement.metric_type,
                    earned=is_earned,
                    earned_at=earned_at,
                    progress=progress
                ))
            
            return result
            
        except Exception as e:
            print(f"❌ Error getting achievements with progress: {e}")
            raise Exception("Failed to get achievements with progress")

    def get_user_achievements(self, db: Session, user_id: int) -> List[UserAchievementResponse]:
        """Get user's earned achievements."""
        user_achievements = self.repository.get_user_achievements(db, user_id)
        
        return [
            UserAchievementResponse(
                id=ua.id,
                achievement=AchievementResponse(
                    id=ua.achievement.id,
                    code=ua.achievement.code,
                    name=ua.achievement.name,
                    description=ua.achievement.description,
                    icon=ua.achievement.icon,
                    category=ua.achievement.category,
                    points=ua.achievement.points,
                    rarity=ua.achievement.rarity
                ),
                earned_at=ua.earned_at.isoformat() if ua.earned_at else None
            )
            for ua in user_achievements
        ]

    def get_user_achievement_progress(self, db: Session, user_id: int) -> AchievementProgressSummary:
        """Get user's progress on count-based achievements."""
        try:
            stats = self.update_user_stats(db, user_id)
            
            # Get all achievements
            all_achievements = self.repository.get_all_achievements(db)
            earned_codes = self.repository.get_user_achievement_codes(db, user_id)
            
            # Get dynamic progress data
            progress_data = self._get_achievement_progress_data(stats, db, user_id)
            
            progress = {}
            for achievement in all_achievements:
                progress[achievement.code] = AchievementProgressResponse(
                    earned=achievement.code in earned_codes,
                    progress=progress_data.get(achievement.code)
                )
            
            # Calculate total points
            total_points = self.repository.get_user_total_points(db, user_id)
            
            return AchievementProgressSummary(
                stats=UserStatsResponse(
                    total_songs=stats.total_songs,
                    total_released=stats.total_released,
                    total_future=stats.total_future,
                    total_future_created=stats.total_future_created,
                    total_wip=stats.total_wip,
                    total_wip_created=stats.total_wip_created,
                    total_packs=stats.total_packs,
                    total_collaborations=stats.total_collaborations,
                    total_spotify_imports=stats.total_spotify_imports,
                    total_feature_requests=stats.total_feature_requests,
                    login_streak=stats.login_streak,
                    total_points=stats.total_points
                ),
                progress=progress,
                total_points=stats.total_points
            )
        
        except Exception as e:
            print(f"❌ Error getting achievement progress: {e}")
            raise Exception("Failed to get achievement progress")

    def check_achievements(self, db: Session, user_id: int) -> AchievementCheckResponse:
        """Manually trigger achievement check for user."""
        newly_awarded = self.check_all_achievements_unified(db, user_id)
        
        return AchievementCheckResponse(
            newly_awarded=newly_awarded,
            count=len(newly_awarded)
        )

    def get_or_create_user_stats(self, db: Session, user_id: int) -> UserStats:
        """Get or create user stats record."""
        stats = self.repository.get_user_stats(db, user_id)
        if not stats:
            stats = self.repository.create_user_stats(db, user_id)
        return stats

    def update_user_stats(self, db: Session, user_id: int) -> UserStats:
        """Update cached user stats from actual data."""
        try:
            if not isinstance(user_id, int) or user_id <= 0:
                raise ValueError(f"Invalid user_id: {user_id}")
                
            stats = self.get_or_create_user_stats(db, user_id)
            
            # Count songs by status
            total_songs = self.repository.count_user_songs(db, user_id)
            total_released = self.repository.count_songs_by_status(db, user_id, SongStatus.released)
            total_future = self.repository.count_songs_by_status(db, user_id, SongStatus.future)
            total_wip = self.repository.count_songs_by_status(db, user_id, SongStatus.wip)
            
            # Count other metrics
            total_packs = self.repository.count_user_packs(db, user_id)
            total_collaborations = self.repository.count_user_collaborations(db, user_id)
            total_spotify_imports = self.repository.count_user_spotify_imports(db, user_id)
            total_feature_requests = self.repository.count_user_feature_requests(db, user_id)
            
            # Update stats
            return self.repository.update_user_stats(
                db, stats,
                total_songs=total_songs,
                total_released=total_released,
                total_future=total_future,
                total_wip=total_wip,
                total_packs=total_packs,
                total_collaborations=total_collaborations,
                total_spotify_imports=total_spotify_imports,
                total_feature_requests=total_feature_requests
            )
            
        except Exception as e:
            print(f"❌ Error updating user stats for user {user_id}: {e}")
            # Return existing stats or create minimal stats
            try:
                return self.get_or_create_user_stats(db, user_id)
            except Exception:
                # If all else fails, create a basic stats object
                return UserStats(user_id=user_id)

    def award_achievement(self, db: Session, user_id: int, achievement_code: str) -> Optional[UserAchievement]:
        """Award an achievement to a user if they don't already have it.
        
        Uses a single transaction to ensure atomicity. Handles race conditions gracefully.
        """
        try:
            # Validate inputs
            if not isinstance(user_id, int) or user_id <= 0:
                print(f"⚠️ Invalid user_id for achievement {achievement_code}: {user_id}")
                return None
                
            if not achievement_code or not isinstance(achievement_code, str):
                print(f"⚠️ Invalid achievement_code for user {user_id}: {achievement_code}")
                return None
                
            # Get achievement
            achievement = self.repository.get_achievement_by_code(db, achievement_code)
            if not achievement:
                print(f"⚠️ Achievement not found: {achievement_code}")
                return None
            
            # Validate achievement has points
            if achievement.points is None:
                print(f"⚠️ Achievement {achievement_code} has no points value, defaulting to 0")
                achievement.points = 0
            
            # Check if user already has it (optimistic check - race condition still possible)
            existing = self.repository.get_user_achievement(db, user_id, achievement.id)
            if existing:
                return None  # Already has it
            
            # Award achievement (this will handle IntegrityError if race condition occurs)
            # Don't commit yet - we want atomic transaction
            user_achievement = self.repository.create_user_achievement(db, user_id, achievement.id, commit=False)
            
            # If None returned, achievement already exists (race condition handled in repository)
            if user_achievement is None:
                return None
            
            print(f"🏆 Awarded achievement '{achievement.name}' to user {user_id}")
            
            # Update cached total points (don't commit yet)
            self.repository.update_user_total_points(db, user_id, achievement.points, commit=False)
            print(f"💰 Updated cached points for user {user_id}: +{achievement.points} points")
            
            # Single commit for atomicity - achievement and points update together
            db.commit()
            
            # Create notification for the new achievement (non-blocking, outside transaction)
            try:
                notification_service = NotificationService(db)
                notification_out = notification_service.create_achievement_notification(
                    user_id=user_id,
                    achievement_id=achievement.id,
                    achievement_name=achievement.name,
                    achievement_description=achievement.description
                )
                print(f"📢 Created notification for achievement '{achievement.name}' for user {user_id} (notification_id: {notification_out.id})")
            except Exception as e:
                print(f"⚠️ Failed to create notification for achievement '{achievement.name}': {e}")
                import traceback
                traceback.print_exc()
                # Don't fail the achievement award if notification creation fails
            
            return user_achievement
            
        except Exception as e:
            print(f"❌ Error awarding achievement {achievement_code} to user {user_id}: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            return None

    def check_metric_based_achievements(self, db: Session, user_id: int, metric_type: str):
        """Check achievements for a specific metric type using database-driven logic."""
        try:
            if not isinstance(user_id, int) or user_id <= 0:
                print(f"⚠️ Invalid user_id in check_metric_based_achievements: {user_id}")
                return
                
            # Get all achievements for this metric type that user hasn't earned yet
            unearned_achievements = self.repository.get_unearned_achievements(db, user_id, metric_type)
            
            if not unearned_achievements:
                return  # No achievements to check for this metric
            
            # Get current value for this metric
            stats = self.update_user_stats(db, user_id)
            if not stats:
                print(f"⚠️ Could not get stats for user {user_id}")
                return
                
            current_value = self._calculate_metric_value(metric_type, stats, db, user_id)
            
            # Check each achievement
            for achievement in unearned_achievements:
                if current_value >= achievement.target_value:
                    awarded = self.award_achievement(db, user_id, achievement.code)
                    if awarded:
                        print(f"🏆 Auto-awarded {achievement.name} (metric: {metric_type}, value: {current_value}/{achievement.target_value})")
                        
        except Exception as e:
            print(f"❌ Error in check_metric_based_achievements for user {user_id}, metric {metric_type}: {e}")

    def check_all_achievements_unified(self, db: Session, user_id: int) -> List[str]:
        """Check all achievements using unified database-driven logic."""
        try:
            if not isinstance(user_id, int) or user_id <= 0:
                print(f"⚠️ Invalid user_id in check_all_achievements_unified: {user_id}")
                return []
                
            # Store current achievements
            current_achievements = self.repository.get_user_achievement_codes(db, user_id)
            
            # Get all unique metric types that have unearned achievements
            metric_types = self.repository.get_all_unearned_metric_types(db, user_id)
            
            # Check achievements for each metric type
            for metric_type in metric_types:
                try:
                    self.check_metric_based_achievements(db, user_id, metric_type)
                except Exception as e:
                    print(f"⚠️ Error checking {metric_type} achievements for user {user_id}: {e}")
                    continue
            
            # Also check customization achievements (they might not be in metric_types)
            try:
                self.check_customization_achievements(db, user_id)
            except Exception as e:
                print(f"⚠️ Error checking customization achievements for user {user_id}: {e}")
            
            # Get newly awarded achievements
            try:
                new_achievements = self.repository.get_user_achievement_codes(db, user_id)
                newly_awarded = list(new_achievements - current_achievements)
                
                if newly_awarded:
                    print(f"🎉 User {user_id} earned {len(newly_awarded)} new achievements: {newly_awarded}")
                
                return newly_awarded
            
            except Exception as e:
                print(f"❌ Error getting newly awarded achievements for user {user_id}: {e}")
                return []
            
        except Exception as e:
            print(f"❌ Critical error in check_all_achievements_unified for user {user_id}: {e}")
            return []

    # Achievement checking methods (delegating to metric-based checker)
    
    def check_status_achievements(self, db: Session, user_id: int):
        """Check achievements based on song status counts."""
        self.check_metric_based_achievements(db, user_id, "total_future_created")
        # Changed: Use lifetime WIP creations instead of concurrent WIPs
        self.check_metric_based_achievements(db, user_id, "wip_creations") 
        self.check_metric_based_achievements(db, user_id, "total_released")

    def check_wip_completion_achievements(self, db: Session, user_id: int):
        """Check achievements for completing WIP songs."""
        self.check_metric_based_achievements(db, user_id, "wip_completions")
    
    def check_wip_creation_achievements(self, db: Session, user_id: int):
        """Check achievements for starting WIP songs (lifetime count)."""
        self.check_metric_based_achievements(db, user_id, "wip_creations")

    def check_pack_achievements(self, db: Session, user_id: int):
        """Check achievements based on pack counts."""
        self.check_metric_based_achievements(db, user_id, "total_packs")

    def check_collaboration_achievements(self, db: Session, user_id: int):
        """Check achievements for adding collaborators."""
        self.check_metric_based_achievements(db, user_id, "total_collaborations")

    def check_spotify_achievements(self, db: Session, user_id: int):
        """Check achievements for Spotify imports."""
        self.check_metric_based_achievements(db, user_id, "total_spotify_imports")

    def check_login_streak_achievements(self, db: Session, user_id: int):
        """Check achievements for login streaks."""
        self.check_metric_based_achievements(db, user_id, "login_streak")

    def check_feature_request_achievements(self, db: Session, user_id: int):
        """Check achievements for feature requests."""
        self.check_metric_based_achievements(db, user_id, "total_feature_requests")

    def check_social_achievements(self, db: Session, user_id: int):
        """Check achievements for being added as a collaborator."""
        self.check_metric_based_achievements(db, user_id, "collaborations_added")

    def check_diversity_achievements(self, db: Session, user_id: int):
        """Check diversity achievements."""
        self.check_metric_based_achievements(db, user_id, "unique_artists")
        self.check_metric_based_achievements(db, user_id, "unique_years")
        self.check_metric_based_achievements(db, user_id, "unique_decades")
        self.check_metric_based_achievements(db, user_id, "alphabet_coverage")

    def check_quality_achievements(self, db: Session, user_id: int):
        """Check quality achievements (song completion, pack completion)."""
        try:
            self.check_metric_based_achievements(db, user_id, "completed_songs")
            self.check_metric_based_achievements(db, user_id, "completed_packs")
        except Exception as e:
            print(f"⚠️ Error in check_quality_achievements: {e}")

    def check_album_series_achievements(self, db: Session, user_id: int):
        """Check album series achievements."""
        self.check_metric_based_achievements(db, user_id, "series_created")
        self.check_metric_based_achievements(db, user_id, "completed_series")

    
    def check_public_wip_achievements(self, db: Session, user_id: int):
        """Check achievements for public WIP songs."""
        self.check_metric_based_achievements(db, user_id, "public_wips")
    
    def check_collaboration_request_achievements(self, db: Session, user_id: int):
        """Check achievements for collaboration requests sent."""
        self.check_metric_based_achievements(db, user_id, "collab_requests_sent")
    
    def check_social_collaboration_achievements(self, db: Session, user_id: int):
        """Check achievements for total collaborations (both sending and receiving)."""
        self.check_metric_based_achievements(db, user_id, "collaborations_total")
    
    def check_customization_achievements(self, db: Session, user_id: int):
        """Check achievements for customizing user profile."""
        self.check_metric_based_achievements(db, user_id, "profile_pic")
        self.check_metric_based_achievements(db, user_id, "personal_link")
        self.check_metric_based_achievements(db, user_id, "contact_method")

    # Legacy function that delegates to unified checker
    def check_all_achievements(self, db: Session, user_id: int) -> List[str]:
        """Legacy function that delegates to unified database-driven checker."""
        return self.check_all_achievements_unified(db, user_id)

    # Private helper methods

    def _calculate_metric_value(self, metric_type: str, stats: UserStats, db: Session, user_id: int) -> int:
        """Calculate the current value for a specific metric type."""
        if metric_type == "total_future_created":
            return stats.total_future_created
        elif metric_type == "total_wip":
            return stats.total_wip
        elif metric_type == "total_released":
            return stats.total_released
        elif metric_type == "total_packs":
            return stats.total_packs
        elif metric_type == "total_collaborations":
            return stats.total_collaborations
        elif metric_type == "total_spotify_imports":
            return stats.total_spotify_imports
        elif metric_type == "total_feature_requests":
            return stats.total_feature_requests
        elif metric_type == "login_streak":
            return stats.login_streak
        elif metric_type == "wip_completions":
            return self.repository.get_wip_completion_count(db, user_id)
        elif metric_type == "wip_creations":
            return self.repository.get_wip_creation_count(db, user_id)
        elif metric_type == "completed_songs":
            return self.repository.get_completed_songs_optimized(db, user_id)
        elif metric_type == "completed_packs":
            return self.repository.get_completed_packs_optimized(db, user_id)
        elif metric_type == "collaborations_added":
            return self.repository.count_collaborations_added(db, user_id)
        elif metric_type == "bug_reports":
            return self.repository.count_bug_reports(db, user_id)
        elif metric_type == "series_created":
            return self.repository.count_series_created(db, user_id)
        elif metric_type == "completed_series":
            return self.repository.count_completed_series(db, user_id)
        elif metric_type == "public_wips":
            return self.repository.count_public_wips(db, user_id)
        elif metric_type == "collab_requests_sent":
            return self.repository.count_collab_requests_sent(db, user_id)
        elif metric_type == "collaborations_total":
            # Count both being added as collaborator AND adding others
            added = self.repository.count_collaborations_added(db, user_id)
            sent = self.repository.count_user_collaborations(db, user_id)
            return added + sent
        elif metric_type in ["unique_artists", "unique_years", "unique_decades", "alphabet_coverage"]:
            # Calculate diversity metrics
            if metric_type == "alphabet_coverage":
                return self.repository.count_alphabet_coverage(db, user_id)
            
            released_songs = self.repository.get_released_songs_for_diversity(db, user_id)
            
            if metric_type == "unique_artists":
                artists = set()
                for song in released_songs:
                    if song.artist:
                        artists.add(song.artist.lower())
                return len(artists)
            elif metric_type == "unique_years":
                years = set()
                for song in released_songs:
                    if song.year:
                        years.add(song.year)
                return len(years)
            elif metric_type == "unique_decades":
                decades = set()
                for song in released_songs:
                    if song.year:
                        decade = (song.year // 10) * 10
                        decades.add(decade)
                return len(decades)
        elif metric_type == "profile_pic":
            # Check if user has profile picture set
            return self.repository.has_profile_pic(db, user_id)
        elif metric_type == "personal_link":
            # Check if user has personal website/link set
            return self.repository.has_personal_link(db, user_id)
        elif metric_type == "contact_method":
            # Check if user has contact method set
            return self.repository.has_contact_method(db, user_id)
        
        # Unknown metric type
        print(f"⚠️ Unknown metric type: {metric_type}")
        return 0

    def _get_achievement_progress_data(self, stats: UserStats, db: Session, user_id: int) -> Dict[str, AchievementProgressItem]:
        """Calculate progress data for count-based achievements."""
        try:
            achievements_with_targets = self.repository.get_achievements_with_targets(db)
            
            progress_data = {}
            
            for achievement in achievements_with_targets:
                try:
                    current_value = self._calculate_metric_value(achievement.metric_type, stats, db, user_id)
                    percentage = min((current_value / achievement.target_value) * 100, 100) if achievement.target_value > 0 else 0
                    
                    # Add special details for alphabet collector achievement
                    details = None
                    if achievement.code == 'alphabet_collector':
                        try:
                            alphabet_details = self.repository.get_alphabet_coverage_details(db, user_id)
                            details = {
                                'missing_letters': alphabet_details['missing_letters'],
                                'found_letters': alphabet_details['found_letters']
                            }
                        except Exception as e:
                            print(f"⚠️ Error getting alphabet details: {e}")
                    
                    progress_data[achievement.code] = AchievementProgressItem(
                        current=current_value,
                        target=achievement.target_value,
                        percentage=round(percentage, 1),
                        details=details
                    )
                except Exception as e:
                    print(f"⚠️ Error calculating progress for {achievement.code}: {e}")
                    progress_data[achievement.code] = AchievementProgressItem(
                        current=0,
                        target=achievement.target_value or 1,
                        percentage=0.0
                    )
            
            return progress_data
            
        except Exception as e:
            print(f"❌ Error in _get_achievement_progress_data: {e}")
            return {}

    def get_leaderboard(self, db: Session, current_user_id: Optional[int], limit: int = 50) -> LeaderboardResponse:
        """Get leaderboard with user rankings by total achievement points."""
        try:
            # Get all users with their cached total points and achievement counts
            leaderboard_data = []
            
            # This query gets all users with their cached points and achievement count
            from sqlalchemy import func
            from models import User, UserAchievement, UserStats
            
            # Get all users with their cached stats and achievement counts
            users_query = db.query(
                User.id,
                User.username,
                func.coalesce(UserStats.total_points, 0).label('total_points'),
                func.count(UserAchievement.id).label('total_achievements')
            ).outerjoin(
                UserStats, User.id == UserStats.user_id
            ).outerjoin(
                UserAchievement, User.id == UserAchievement.user_id
            ).group_by(User.id, User.username, UserStats.total_points).all()
            
            # Convert to list and sort by points (descending), then by username (ascending)
            sorted_users = sorted(users_query, key=lambda x: (-x.total_points, x.username))
            
            # Create leaderboard entries with ranks
            current_user_rank = None
            for i, user_data in enumerate(sorted_users[:limit], 1):
                entry = LeaderboardEntry(
                    user_id=user_data.id,
                    username=user_data.username,
                    total_points=user_data.total_points,
                    total_achievements=user_data.total_achievements,
                    rank=i
                )
                leaderboard_data.append(entry)
                
                # Track current user's rank
                if current_user_id and user_data.id == current_user_id:
                    current_user_rank = i
            
            # If current user is not in top results, find their rank
            if current_user_id and current_user_rank is None:
                for i, user_data in enumerate(sorted_users, 1):
                    if user_data.id == current_user_id:
                        current_user_rank = i
                        break
            
            total_users = len(sorted_users)
            
            return LeaderboardResponse(
                leaderboard=leaderboard_data,
                current_user_rank=current_user_rank,
                total_users=total_users
            )
            
        except Exception as e:
            print(f"❌ Error getting leaderboard: {e}")
            raise Exception("Failed to get leaderboard")