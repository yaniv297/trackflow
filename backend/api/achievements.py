"""
Achievements API - handles checking and awarding achievements to users.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, distinct
from database import get_db
from models import (
    Achievement, UserAchievement, UserStats, User, Song, Pack, 
    Collaboration, CollaborationType, SongStatus, ActivityLog, FeatureRequest,
    AlbumSeries
)
from sqlalchemy import text
from api.auth import get_current_active_user
from typing import List, Optional, Dict, Set
from datetime import datetime, date, timedelta
import json

router = APIRouter(prefix="/achievements", tags=["Achievements"])


def get_or_create_user_stats(db: Session, user_id: int) -> UserStats:
    """Get or create user stats record."""
    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
    if not stats:
        stats = UserStats(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats


def update_user_stats(db: Session, user_id: int):
    """Update cached user stats from actual data."""
    try:
        if not isinstance(user_id, int) or user_id <= 0:
            raise ValueError(f"Invalid user_id: {user_id}")
            
        stats = get_or_create_user_stats(db, user_id)
        
        # Count songs by status
        total_songs = db.query(Song).filter(Song.user_id == user_id).count()
        total_released = db.query(Song).filter(
            Song.user_id == user_id,
            Song.status == SongStatus.released
        ).count()
        total_future = db.query(Song).filter(
            Song.user_id == user_id,
            Song.status == SongStatus.future
        ).count()
        total_wip = db.query(Song).filter(
            Song.user_id == user_id,
            Song.status == SongStatus.wip
        ).count()
        
        # Count packs
        total_packs = db.query(Pack).filter(Pack.user_id == user_id).count()
        
        # Count collaborations (as owner)
        total_collaborations = db.query(Collaboration).join(Song).filter(
            Song.user_id == user_id,
            Collaboration.collaboration_type.in_([CollaborationType.SONG_EDIT, CollaborationType.PACK_EDIT])
        ).count()
        
        # Count Spotify imports
        total_spotify_imports = db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_type == "import_spotify"
        ).count()
        
        # Count feature requests
        total_feature_requests = db.query(FeatureRequest).filter(
            FeatureRequest.user_id == user_id
        ).count()
        
        # Update stats with validation
        stats.total_songs = max(0, total_songs)
        stats.total_released = max(0, total_released)
        stats.total_future = max(0, total_future)
        stats.total_wip = max(0, total_wip)
        stats.total_packs = max(0, total_packs)
        stats.total_collaborations = max(0, total_collaborations)
        stats.total_spotify_imports = max(0, total_spotify_imports)
        stats.total_feature_requests = max(0, total_feature_requests)
        stats.updated_at = datetime.utcnow()
        
        db.commit()
        return stats
        
    except Exception as e:
        print(f"❌ Error updating user stats for user {user_id}: {e}")
        db.rollback()
        # Return existing stats or create minimal stats
        try:
            return get_or_create_user_stats(db, user_id)
        except Exception:
            # If all else fails, create a basic stats object
            return UserStats(user_id=user_id)


def award_achievement(db: Session, user_id: int, achievement_code: str) -> Optional[UserAchievement]:
    """Award an achievement to a user if they don't already have it."""
    try:
        # Validate inputs
        if not isinstance(user_id, int) or user_id <= 0:
            print(f"⚠️ Invalid user_id for achievement {achievement_code}: {user_id}")
            return None
            
        if not achievement_code or not isinstance(achievement_code, str):
            print(f"⚠️ Invalid achievement_code for user {user_id}: {achievement_code}")
            return None
            
        # Get achievement
        achievement = db.query(Achievement).filter(Achievement.code == achievement_code).first()
        if not achievement:
            print(f"⚠️ Achievement not found: {achievement_code}")
            return None
        
        # Check if user already has it
        existing = db.query(UserAchievement).filter(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_id == achievement.id
        ).first()
        
        if existing:
            return None  # Already has it
        
        # Award achievement
        user_achievement = UserAchievement(
            user_id=user_id,
            achievement_id=achievement.id,
            earned_at=datetime.utcnow()
        )
        db.add(user_achievement)
        db.commit()
        db.refresh(user_achievement)
        
        print(f"🏆 Awarded achievement '{achievement.name}' to user {user_id}")
        return user_achievement
        
    except Exception as e:
        print(f"❌ Error awarding achievement {achievement_code} to user {user_id}: {e}")
        db.rollback()
        return None


def check_metric_based_achievements(db: Session, user_id: int, metric_type: str):
    """Check achievements for a specific metric type using database-driven logic."""
    try:
        if not isinstance(user_id, int) or user_id <= 0:
            print(f"⚠️ Invalid user_id in check_metric_based_achievements: {user_id}")
            return
            
        # Get all achievements for this metric type that user hasn't earned yet
        unearned_achievements = db.query(Achievement).filter(
            Achievement.metric_type == metric_type,
            Achievement.target_value.isnot(None),
            ~Achievement.id.in_(
                db.query(UserAchievement.achievement_id).filter(
                    UserAchievement.user_id == user_id
                )
            )
        ).all()
        
        if not unearned_achievements:
            return  # No achievements to check for this metric
        
        # Get current value for this metric
        stats = update_user_stats(db, user_id)
        if not stats:
            print(f"⚠️ Could not get stats for user {user_id}")
            return
            
        current_value = _calculate_metric_value(metric_type, stats, db, user_id)
        
        # Check each achievement
        for achievement in unearned_achievements:
            if current_value >= achievement.target_value:
                awarded = award_achievement(db, user_id, achievement.code)
                if awarded:
                    print(f"🏆 Auto-awarded {achievement.name} (metric: {metric_type}, value: {current_value}/{achievement.target_value})")
                    
    except Exception as e:
        print(f"❌ Error in check_metric_based_achievements for user {user_id}, metric {metric_type}: {e}")


def check_status_achievements(db: Session, user_id: int):
    """Check achievements based on song status counts using database-driven logic."""
    check_metric_based_achievements(db, user_id, "total_future")
    check_metric_based_achievements(db, user_id, "total_wip") 
    check_metric_based_achievements(db, user_id, "total_released")


def check_wip_completion_achievements(db: Session, user_id: int):
    """Check achievements for completing WIP songs using database-driven logic."""
    check_metric_based_achievements(db, user_id, "wip_completions")


def check_pack_achievements(db: Session, user_id: int):
    """Check achievements based on pack counts using database-driven logic."""
    check_metric_based_achievements(db, user_id, "total_packs")


def check_collaboration_achievements(db: Session, user_id: int):
    """Check achievements for adding collaborators using database-driven logic."""
    check_metric_based_achievements(db, user_id, "total_collaborations")


def check_spotify_achievements(db: Session, user_id: int):
    """Check achievements for Spotify imports using database-driven logic."""
    check_metric_based_achievements(db, user_id, "total_spotify_imports")


def check_login_streak_achievements(db: Session, user_id: int):
    """Check achievements for login streaks using database-driven logic."""
    check_metric_based_achievements(db, user_id, "login_streak")


def check_feature_request_achievements(db: Session, user_id: int):
    """Check achievements for feature requests using database-driven logic."""
    check_metric_based_achievements(db, user_id, "total_feature_requests")


def check_social_achievements(db: Session, user_id: int):
    """Check achievements for being added as a collaborator using database-driven logic."""
    check_metric_based_achievements(db, user_id, "collaborations_added")


def check_diversity_achievements(db: Session, user_id: int):
    """Check diversity achievements using database-driven logic."""
    check_metric_based_achievements(db, user_id, "unique_artists")
    check_metric_based_achievements(db, user_id, "unique_years")
    check_metric_based_achievements(db, user_id, "unique_decades")


def _get_user_workflow_steps(db: Session, user_id: int) -> List[str]:
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


def _get_completed_songs_optimized(db: Session, user_id: int) -> int:
    """Optimized method to count completed songs using bulk queries."""
    # Get user's workflow steps once
    required_steps = _get_user_workflow_steps(db, user_id)
    
    if not required_steps:
        return 0
    
    # Get all user songs and their completion data in bulk
    songs_with_progress = db.execute(
        text("""
            SELECT s.id, COUNT(CASE WHEN sp.is_completed = 1 THEN 1 END) as completed_count
            FROM songs s
            LEFT JOIN song_progress sp ON s.id = sp.song_id AND sp.step_name IN :steps
            WHERE s.user_id = :uid
            GROUP BY s.id
        """),
        {"uid": user_id, "steps": tuple(required_steps)}
    ).fetchall()
    
    # Count songs that have all required steps completed
    required_count = len(required_steps)
    completed_songs = sum(1 for _, completed_count in songs_with_progress if completed_count == required_count)
    
    return completed_songs


def _get_completed_packs_optimized(db: Session, user_id: int) -> int:
    """Optimized method to count completed packs using bulk queries."""
    # Get user's workflow steps once
    required_steps = _get_user_workflow_steps(db, user_id)
    
    if not required_steps:
        return 0
    
    # Get all packs and songs completion data in bulk
    pack_completion_data = db.execute(
        text("""
            SELECT p.id as pack_id, s.id as song_id, s.user_id,
                   COUNT(CASE WHEN sp.is_completed = 1 THEN 1 END) as completed_count,
                   COUNT(s.id) as total_songs_in_pack
            FROM packs p
            LEFT JOIN songs s ON s.pack_id = p.id
            LEFT JOIN song_progress sp ON s.id = sp.song_id AND sp.step_name IN :steps
            WHERE p.user_id = :uid
            GROUP BY p.id, s.id, s.user_id
        """),
        {"uid": user_id, "steps": tuple(required_steps)}
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


def _is_song_fully_completed(db: Session, song_id: int, user_id: int) -> bool:
    """Check if a song has all required workflow steps completed."""
    # Get user's workflow steps
    required_steps = _get_user_workflow_steps(db, user_id)
    
    # Check if all steps are completed
    completed_steps = db.execute(
        text("""
            SELECT step_name
            FROM song_progress
            WHERE song_id = :sid AND is_completed = 1
        """),
        {"sid": song_id}
    ).fetchall()
    
    completed_step_names = {row[0] for row in completed_steps}
    return all(step in completed_step_names for step in required_steps)


def check_quality_achievements(db: Session, user_id: int):
    """Check quality achievements (song completion, pack completion) with optimized queries."""
    try:
        # Use optimized methods for bulk operations
        completed_songs = _get_completed_songs_optimized(db, user_id)
        completed_packs = _get_completed_packs_optimized(db, user_id)
        
        # Check quality achievements using database-driven logic
        check_metric_based_achievements(db, user_id, "completed_songs")
        check_metric_based_achievements(db, user_id, "completed_packs")
            
    except Exception as e:
        print(f"⚠️ Error in check_quality_achievements: {e}")
        # Fall back to the original method if optimized version fails
        check_metric_based_achievements(db, user_id, "completed_songs")


def check_album_series_achievements(db: Session, user_id: int):
    """Check album series achievements using database-driven logic."""
    check_metric_based_achievements(db, user_id, "series_created")
    check_metric_based_achievements(db, user_id, "completed_series")


def check_bug_report_achievements(db: Session, user_id: int):
    """Check achievements for bug reports using database-driven logic."""
    check_metric_based_achievements(db, user_id, "bug_reports")


def check_all_achievements_unified(db: Session, user_id: int) -> List[str]:
    """Check all achievements using unified database-driven logic."""
    try:
        if not isinstance(user_id, int) or user_id <= 0:
            print(f"⚠️ Invalid user_id in check_all_achievements_unified: {user_id}")
            return []
            
        # Store current achievements
        current_achievements = set(
            db.query(Achievement.code)
            .join(UserAchievement)
            .filter(UserAchievement.user_id == user_id)
            .all()
        )
        current_achievements = {code[0] for code in current_achievements}
        
        # Get all unique metric types that have unearned achievements
        metric_types = db.query(Achievement.metric_type).filter(
            Achievement.metric_type.isnot(None),
            Achievement.target_value.isnot(None),
            ~Achievement.id.in_(
                db.query(UserAchievement.achievement_id).filter(
                    UserAchievement.user_id == user_id
                )
            )
        ).distinct().all()
        
        # Check achievements for each metric type
        for (metric_type,) in metric_types:
            try:
                check_metric_based_achievements(db, user_id, metric_type)
            except Exception as e:
                print(f"⚠️ Error checking {metric_type} achievements for user {user_id}: {e}")
                continue
        
        # Get newly awarded achievements
        try:
            new_achievements = set(
                db.query(Achievement.code)
                .join(UserAchievement)
                .filter(UserAchievement.user_id == user_id)
                .all()
            )
            new_achievements = {code[0] for code in new_achievements}
            
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


def check_all_achievements(db: Session, user_id: int) -> List[str]:
    """Legacy function that delegates to unified database-driven checker."""
    return check_all_achievements_unified(db, user_id)


# API Endpoints

@router.get("/")
def get_all_achievements(db: Session = Depends(get_db)):
    """Get all available achievements."""
    achievements = db.query(Achievement).order_by(
        Achievement.category, Achievement.points.desc()
    ).all()
    
    return [
        {
            "id": a.id,
            "code": a.code,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "category": a.category,
            "points": a.points,
            "rarity": a.rarity
        }
        for a in achievements
    ]


@router.get("/me")
def get_my_achievements(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get current user's earned achievements."""
    user_achievements = db.query(UserAchievement).join(Achievement).filter(
        UserAchievement.user_id == current_user.id
    ).order_by(UserAchievement.earned_at.desc()).all()
    
    return [
        {
            "id": ua.id,
            "achievement": {
                "id": ua.achievement.id,
                "code": ua.achievement.code,
                "name": ua.achievement.name,
                "description": ua.achievement.description,
                "icon": ua.achievement.icon,
                "category": ua.achievement.category,
                "points": ua.achievement.points,
                "rarity": ua.achievement.rarity
            },
            "earned_at": ua.earned_at.isoformat() if ua.earned_at else None
        }
        for ua in user_achievements
    ]


def _get_wip_completion_count(db: Session, user_id: int) -> int:
    """Get the count of WIP completions for progress calculation."""
    try:
        wip_completion_count = db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_type == "change_status",
            ActivityLog.metadata_json.like('%"from":"In Progress"%'),
            ActivityLog.metadata_json.like('%"to":"Released"%')
        ).count()
        
        if wip_completion_count == 0:
            released_count = db.query(Song).filter(
                Song.user_id == user_id,
                Song.status == SongStatus.released
            ).count()
            wip_completion_count = max(1, int(released_count * 0.7)) if released_count > 0 else 0
        
        return wip_completion_count
    
    except Exception as e:
        print(f"⚠️ Error getting WIP completion count: {e}")
        released_count = db.query(Song).filter(
            Song.user_id == user_id,
            Song.status == SongStatus.released
        ).count()
        return released_count


def _calculate_metric_value(metric_type: str, stats: UserStats, db: Session, user_id: int) -> int:
    """Calculate the current value for a specific metric type."""
    if metric_type == "total_future":
        return stats.total_future
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
        return _get_wip_completion_count(db, user_id)
    elif metric_type == "completed_songs":
        return _get_completed_songs_optimized(db, user_id)
    elif metric_type == "completed_packs":
        return _get_completed_packs_optimized(db, user_id)
    elif metric_type == "collaborations_added":
        return db.query(Collaboration).filter(
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).count()
    elif metric_type == "bug_reports":
        return db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_type == "create_bug_report"
        ).count()
    elif metric_type == "series_created":
        user_packs = db.query(Pack).filter(Pack.user_id == user_id).all()
        pack_ids = [pack.id for pack in user_packs]
        if not pack_ids:
            return 0
        return db.query(AlbumSeries).filter(AlbumSeries.pack_id.in_(pack_ids)).count()
    elif metric_type == "completed_series":
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
    elif metric_type in ["unique_artists", "unique_years", "unique_decades"]:
        # Calculate diversity metrics
        released_songs = db.query(Song).filter(
            Song.user_id == user_id,
            Song.status == SongStatus.released
        ).all()
        
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
    
    # Unknown metric type
    print(f"⚠️ Unknown metric type: {metric_type}")
    return 0


def _get_achievement_progress_data(stats: UserStats, db: Session, user_id: int):
    """Calculate progress data for count-based achievements dynamically from database."""
    try:
        # Get all achievements with target values
        achievements_with_targets = db.query(Achievement).filter(
            Achievement.target_value.isnot(None),
            Achievement.metric_type.isnot(None)
        ).all()
        
        progress_data = {}
        
        # Calculate progress for each achievement based on its stored metric type and target
        for achievement in achievements_with_targets:
            try:
                current_value = _calculate_metric_value(achievement.metric_type, stats, db, user_id)
                progress_data[achievement.code] = {
                    "current": current_value,
                    "target": achievement.target_value
                }
            except Exception as e:
                print(f"⚠️ Error calculating progress for {achievement.code}: {e}")
                # Set to 0 as fallback
                progress_data[achievement.code] = {
                    "current": 0,
                    "target": achievement.target_value or 1
                }
        
        return progress_data
        
    except Exception as e:
        print(f"❌ Error in _get_achievement_progress_data: {e}")
        return {}


@router.get("/me/progress")
def get_my_achievement_progress(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get user's progress on count-based achievements."""
    try:
        stats = update_user_stats(db, current_user.id)
        
        # Get all achievements
        all_achievements = db.query(Achievement).all()
        earned_codes = set(
            db.query(Achievement.code)
            .join(UserAchievement)
            .filter(UserAchievement.user_id == current_user.id)
            .all()
        )
        earned_codes = {code[0] for code in earned_codes}
        
        # Get dynamic progress data
        progress_data = _get_achievement_progress_data(stats, db, current_user.id)
        
        progress = {}
        for achievement in all_achievements:
            progress[achievement.code] = {
                "earned": achievement.code in earned_codes,
                "progress": progress_data.get(achievement.code)  # None for non-count-based achievements
            }
        
        # Calculate total points safely
        total_points = 0
        user_achievements = db.query(Achievement.points).join(UserAchievement).filter(
            UserAchievement.user_id == current_user.id
        ).all()
        total_points = sum(point[0] for point in user_achievements)
        
        return {
            "stats": {
                "total_songs": stats.total_songs,
                "total_released": stats.total_released,
                "total_future": stats.total_future,
                "total_wip": stats.total_wip,
                "total_packs": stats.total_packs,
                "total_collaborations": stats.total_collaborations,
                "total_spotify_imports": stats.total_spotify_imports,
                "total_feature_requests": stats.total_feature_requests,
                "login_streak": stats.login_streak
            },
            "progress": progress,
            "total_points": total_points
        }
    
    except Exception as e:
        print(f"❌ Error getting achievement progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to get achievement progress")


@router.post("/check")
def check_achievements(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Manually trigger achievement check for current user."""
    newly_awarded = check_all_achievements(db, current_user.id)
    
    return {
        "newly_awarded": newly_awarded,
        "count": len(newly_awarded)
    }

