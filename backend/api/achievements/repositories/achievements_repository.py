"""
Achievements repository - handles data access for achievement operations.
"""

from typing import List, Optional, Set, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, text, distinct
from datetime import datetime

from models import (
    Achievement, UserAchievement, UserStats, User, Song, Pack, 
    Collaboration, CollaborationType, SongStatus, ActivityLog, FeatureRequest,
    AlbumSeries
)


class AchievementsRepository:
    
    def get_all_achievements(self, db: Session) -> List[Achievement]:
        """Get all achievements ordered by category and points."""
        return db.query(Achievement).order_by(
            Achievement.category, Achievement.points.desc()
        ).all()
    
    def get_user_achievements(self, db: Session, user_id: int) -> List[UserAchievement]:
        """Get all user achievements with achievement data."""
        return db.query(UserAchievement).join(Achievement).filter(
            UserAchievement.user_id == user_id
        ).order_by(UserAchievement.earned_at.desc()).all()
    
    def get_achievement_by_code(self, db: Session, code: str) -> Optional[Achievement]:
        """Get achievement by code."""
        return db.query(Achievement).filter(Achievement.code == code).first()
    
    def get_user_achievement(self, db: Session, user_id: int, achievement_id: int) -> Optional[UserAchievement]:
        """Check if user already has a specific achievement."""
        return db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement_id
        ).first()
    
    def create_user_achievement(self, db: Session, user_id: int, achievement_id: int) -> UserAchievement:
        """Award achievement to user."""
        user_achievement = UserAchievement(
            user_id=user_id,
            achievement_id=achievement_id,
            earned_at=datetime.utcnow()
        )
        db.add(user_achievement)
        db.commit()
        db.refresh(user_achievement)
        return user_achievement
    
    def get_user_stats(self, db: Session, user_id: int) -> Optional[UserStats]:
        """Get user stats record."""
        return db.query(UserStats).filter(UserStats.user_id == user_id).first()
    
    def create_user_stats(self, db: Session, user_id: int) -> UserStats:
        """Create new user stats record."""
        stats = UserStats(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
        return stats
    
    def update_user_stats(self, db: Session, stats: UserStats, **kwargs) -> UserStats:
        """Update user stats with new values."""
        for key, value in kwargs.items():
            if hasattr(stats, key):
                setattr(stats, key, max(0, value))  # Ensure non-negative values
        
        stats.updated_at = datetime.utcnow()
        db.commit()
        return stats
    
    def count_songs_by_status(self, db: Session, user_id: int, status: SongStatus) -> int:
        """Count user songs by status."""
        return db.query(Song).filter(
            Song.user_id == user_id,
            Song.status == status
        ).count()
    
    def count_user_songs(self, db: Session, user_id: int) -> int:
        """Count total user songs."""
        return db.query(Song).filter(Song.user_id == user_id).count()
    
    def count_user_packs(self, db: Session, user_id: int) -> int:
        """Count user packs."""
        return db.query(Pack).filter(Pack.user_id == user_id).count()
    
    def count_user_collaborations(self, db: Session, user_id: int) -> int:
        """Count collaborations where user is owner."""
        return db.query(Collaboration).join(Song).filter(
            Song.user_id == user_id,
            Collaboration.collaboration_type.in_([CollaborationType.SONG_EDIT, CollaborationType.PACK_EDIT])
        ).count()
    
    def count_user_spotify_imports(self, db: Session, user_id: int) -> int:
        """Count user Spotify imports."""
        return db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_type == "import_spotify"
        ).count()
    
    def count_user_feature_requests(self, db: Session, user_id: int) -> int:
        """Count user feature requests."""
        return db.query(FeatureRequest).filter(
            FeatureRequest.user_id == user_id
        ).count()
    
    def get_unearned_achievements(self, db: Session, user_id: int, metric_type: str) -> List[Achievement]:
        """Get unearned achievements for a specific metric type."""
        return db.query(Achievement).filter(
            Achievement.metric_type == metric_type,
            Achievement.target_value.isnot(None),
            ~Achievement.id.in_(
                db.query(UserAchievement.achievement_id).filter(
                    UserAchievement.user_id == user_id
                )
            )
        ).all()
    
    def get_all_unearned_metric_types(self, db: Session, user_id: int) -> List[str]:
        """Get all metric types that have unearned achievements."""
        metric_types = db.query(Achievement.metric_type).filter(
            Achievement.metric_type.isnot(None),
            Achievement.target_value.isnot(None),
            ~Achievement.id.in_(
                db.query(UserAchievement.achievement_id).filter(
                    UserAchievement.user_id == user_id
                )
            )
        ).distinct().all()
        
        return [metric_type[0] for metric_type in metric_types]
    
    def get_user_achievement_codes(self, db: Session, user_id: int) -> Set[str]:
        """Get set of achievement codes user has earned."""
        codes = db.query(Achievement.code).join(UserAchievement).filter(
            UserAchievement.user_id == user_id
        ).all()
        return {code[0] for code in codes}
    
    def get_achievements_with_targets(self, db: Session) -> List[Achievement]:
        """Get all achievements that have target values."""
        return db.query(Achievement).filter(
            Achievement.target_value.isnot(None),
            Achievement.metric_type.isnot(None)
        ).all()
    
    def get_user_total_points(self, db: Session, user_id: int) -> int:
        """Get total achievement points for user."""
        user_achievements = db.query(Achievement.points).join(UserAchievement).filter(
            UserAchievement.user_id == user_id
        ).all()
        return sum(point[0] for point in user_achievements)
    
    def get_wip_completion_count(self, db: Session, user_id: int) -> int:
        """Get count of WIP completions from activity log."""
        wip_completion_count = db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_type == "change_status",
            ActivityLog.metadata_json.like('%"from":"In Progress"%'),
            ActivityLog.metadata_json.like('%"to":"Released"%')
        ).count()
        
        # Fallback estimation if no activity log data
        if wip_completion_count == 0:
            released_count = self.count_songs_by_status(db, user_id, SongStatus.released)
            wip_completion_count = max(1, int(released_count * 0.7)) if released_count > 0 else 0
        
        return wip_completion_count
    
    def count_collaborations_added(self, db: Session, user_id: int) -> int:
        """Count times user was added as collaborator."""
        return db.query(Collaboration).filter(
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).count()
    
    def count_bug_reports(self, db: Session, user_id: int) -> int:
        """Count user bug reports."""
        return db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_type == "create_bug_report"
        ).count()
    
    def count_series_created(self, db: Session, user_id: int) -> int:
        """Count album series created by user."""
        user_packs = db.query(Pack).filter(Pack.user_id == user_id).all()
        pack_ids = [pack.id for pack in user_packs]
        if not pack_ids:
            return 0
        return db.query(AlbumSeries).filter(AlbumSeries.pack_id.in_(pack_ids)).count()
    
    def count_completed_series(self, db: Session, user_id: int) -> int:
        """Count completed album series by user."""
        user_packs = db.query(Pack).filter(Pack.user_id == user_id).all()
        pack_ids = [pack.id for pack in user_packs]
        if not pack_ids:
            return 0
        
        user_series = db.query(AlbumSeries).filter(AlbumSeries.pack_id.in_(pack_ids)).all()
        completed_series = 0
        for series in user_series:
            series_songs = db.query(Song).filter(Song.album_series_id == series.id).all()
            if series_songs and all(song.status == SongStatus.released for song in series_songs):
                completed_series += 1
        return completed_series
    
    def get_released_songs_for_diversity(self, db: Session, user_id: int) -> List[Song]:
        """Get released songs for diversity metrics calculation."""
        return db.query(Song).filter(
            Song.user_id == user_id,
            Song.status == SongStatus.released
        ).all()
    
    def get_user_workflow_steps(self, db: Session, user_id: int) -> List[str]:
        """Get user's workflow steps, with fallback to default."""
        rows = db.execute(
            text("""
                SELECT uws.step_name
                FROM user_workflows uw
                JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
                WHERE uw.user_id = :uid
                ORDER BY uws.order_index
            """),
            {"uid": user_id}
        ).fetchall()
        
        if not rows:
            # Fallback to legacy list if no workflow
            return [
                "demucs", "midi", "tempo_map", "fake_ending", "drums", "bass", "guitar",
                "vocals", "harmonies", "pro_keys", "keys", "animations", "drum_fills", "overdrive", "compile"
            ]
        else:
            return [r[0] for r in rows]
    
    def get_completed_songs_optimized(self, db: Session, user_id: int) -> int:
        """Get count of fully completed songs using optimized bulk queries."""
        required_steps = self.get_user_workflow_steps(db, user_id)
        
        if not required_steps:
            return 0
        
        # Create IN clause for SQLite compatibility
        steps_placeholders = ','.join(f':step{i}' for i in range(len(required_steps)))
        step_params = {f'step{i}': step for i, step in enumerate(required_steps)}
        
        # Get all user songs and their completion data in bulk
        songs_with_progress = db.execute(
            text(f"""
                SELECT s.id, COUNT(CASE WHEN sp.is_completed = 1 THEN 1 END) as completed_count
                FROM songs s
                LEFT JOIN song_progress sp ON s.id = sp.song_id AND sp.step_name IN ({steps_placeholders})
                WHERE s.user_id = :uid
                GROUP BY s.id
            """),
            {"uid": user_id, **step_params}
        ).fetchall()
        
        # Count songs that have all required steps completed
        required_count = len(required_steps)
        completed_songs = sum(1 for _, completed_count in songs_with_progress if completed_count == required_count)
        
        return completed_songs
    
    def get_completed_packs_optimized(self, db: Session, user_id: int) -> int:
        """Get count of fully completed packs using optimized bulk queries."""
        required_steps = self.get_user_workflow_steps(db, user_id)
        
        if not required_steps:
            return 0
        
        # Create IN clause for SQLite compatibility
        steps_placeholders = ','.join(f':step{i}' for i in range(len(required_steps)))
        step_params = {f'step{i}': step for i, step in enumerate(required_steps)}
        
        # Get all packs and songs completion data in bulk
        pack_completion_data = db.execute(
            text(f"""
                SELECT p.id as pack_id, s.id as song_id, s.user_id,
                       COUNT(CASE WHEN sp.is_completed = 1 THEN 1 END) as completed_count,
                       COUNT(s.id) as total_songs_in_pack
                FROM packs p
                LEFT JOIN songs s ON s.pack_id = p.id
                LEFT JOIN song_progress sp ON s.id = sp.song_id AND sp.step_name IN ({steps_placeholders})
                WHERE p.user_id = :uid
                GROUP BY p.id, s.id, s.user_id
            """),
            {"uid": user_id, **step_params}
        ).fetchall()
        
        # Group by pack and check completion
        pack_data = {}
        required_count = len(required_steps)
        
        for pack_id, song_id, song_user_id, completed_count, _ in pack_completion_data:
            if song_id is None:  # Pack has no songs
                continue
                
            if pack_id not in pack_data:
                pack_data[pack_id] = {"total_songs": 0, "completed_songs": 0}
            
            pack_data[pack_id]["total_songs"] += 1
            if completed_count == required_count:
                pack_data[pack_id]["completed_songs"] += 1
        
        # Count packs where all songs are completed
        completed_packs = 0
        for pack_id, data in pack_data.items():
            if data["total_songs"] > 0 and data["completed_songs"] == data["total_songs"]:
                completed_packs += 1
        
        return completed_packs
    
    def update_user_total_points(self, db: Session, user_id: int, points_to_add: int) -> None:
        """Update user's cached total points by adding the given points."""
        try:
            stats = self.get_user_stats(db, user_id)
            if not stats:
                stats = self.create_user_stats(db, user_id)
            
            stats.total_points = (stats.total_points or 0) + points_to_add
            stats.updated_at = datetime.utcnow()
            db.commit()
            
        except Exception as e:
            print(f"❌ Error updating total points for user {user_id}: {e}")
            db.rollback()
    
    def recalculate_user_total_points(self, db: Session, user_id: int) -> int:
        """Recalculate and update user's total points from scratch."""
        try:
            # Calculate actual points from achievements
            actual_points = self.get_user_total_points(db, user_id)
            
            # Update cached value
            stats = self.get_user_stats(db, user_id)
            if not stats:
                stats = self.create_user_stats(db, user_id)
            
            stats.total_points = actual_points
            stats.updated_at = datetime.utcnow()
            db.commit()
            
            return actual_points
            
        except Exception as e:
            print(f"❌ Error recalculating total points for user {user_id}: {e}")
            db.rollback()
            return 0