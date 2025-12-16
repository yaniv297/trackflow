#!/usr/bin/env python3
"""
One-time migration script to recalculate achievements and populate user_stats from authoritative data.

This script:
1. Recalculates achievements for all users based on historical data
2. Populates user_stats table with computed values
3. Ensures total_points matches achievement totals (excluding runtime release bonuses)

Usage:
    python backend/tools/migrate_achievements_and_stats.py [--dry-run] [--user-id USER_ID] [--verbose]

Options:
    --dry-run    Show what would be done without making changes
    --user-id    Process only a specific user ID
    --verbose    Show detailed logging for each user
"""

import sys
import os
import argparse
from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Set
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import (
    User, Song, Pack, Achievement, UserAchievement, UserStats,
    Collaboration, CollaborationType, SongStatus, ActivityLog, FeatureRequest,
    AlbumSeries
)
from api.achievements.repositories.achievements_repository import AchievementsRepository
from api.achievements.services.achievements_service import AchievementsService


class MigrationStats:
    """Track migration statistics."""
    def __init__(self):
        self.users_processed = 0
        self.achievements_awarded = 0
        self.stats_created = 0
        self.stats_updated = 0
        self.errors = []
        self.anomalies = []
    
    def summary(self) -> str:
        """Get summary of migration statistics."""
        lines = [
            "\n" + "="*60,
            "MIGRATION SUMMARY",
            "="*60,
            f"Users processed: {self.users_processed}",
            f"Achievements awarded: {self.achievements_awarded}",
            f"Stats rows created: {self.stats_created}",
            f"Stats rows updated: {self.stats_updated}",
        ]
        if self.errors:
            lines.append(f"Errors: {len(self.errors)}")
        if self.anomalies:
            lines.append(f"Anomalies: {len(self.anomalies)}")
        lines.append("="*60)
        return "\n".join(lines)


def calculate_login_streak(last_login_at: Optional[datetime], current_streak: int = 0) -> int:
    """
    Calculate login streak from last_login_at.
    
    Logic matches update_login_streak():
    - If last_login_at is None: streak = 1 (first login)
    - If last_login_at is today: streak unchanged
    - If last_login_at is yesterday: streak = current_streak + 1
    - If last_login_at > 1 day ago: streak = 1
    """
    if last_login_at is None:
        return 1
    
    today = date.today()
    
    # Convert datetime to date if needed
    if isinstance(last_login_at, datetime):
        last_login_date = last_login_at.date()
    else:
        last_login_date = last_login_at
    
    if last_login_date == today:
        # Already logged in today - don't change streak
        return current_streak
    elif last_login_date == today - timedelta(days=1):
        # Logged in yesterday - increment streak
        return current_streak + 1
    else:
        # More than 1 day ago - reset streak to 1
        return 1


def calculate_metric_value(
    metric_type: str,
    stats: UserStats,
    db: Session,
    user_id: int,
    repo: AchievementsRepository
) -> int:
    """
    Calculate metric value for achievement checking.
    Mirrors AchievementsService._calculate_metric_value()
    """
    if metric_type == "total_future_created":
        return stats.total_future_created or 0
    elif metric_type == "total_wip":
        return stats.total_wip or 0
    elif metric_type == "total_released":
        return stats.total_released or 0
    elif metric_type == "total_packs":
        return stats.total_packs or 0
    elif metric_type == "total_collaborations":
        return stats.total_collaborations or 0
    elif metric_type == "total_spotify_imports":
        return stats.total_spotify_imports or 0
    elif metric_type == "total_feature_requests":
        return stats.total_feature_requests or 0
    elif metric_type == "login_streak":
        return stats.login_streak or 0
    elif metric_type == "wip_completions":
        return repo.get_wip_completion_count(db, user_id)
    elif metric_type == "wip_creations":
        return stats.total_wip_created or 0
    elif metric_type == "completed_songs":
        return repo.get_completed_songs_optimized(db, user_id)
    elif metric_type == "completed_packs":
        return repo.get_completed_packs_optimized(db, user_id)
    elif metric_type == "collaborations_added":
        return repo.count_collaborations_added(db, user_id)
    elif metric_type == "bug_reports":
        # Count bug reports from activity_logs
        return db.query(ActivityLog).filter(
            ActivityLog.user_id == user_id,
            ActivityLog.activity_type == "create_bug_report"
        ).count()
    elif metric_type == "series_created":
        return repo.count_series_created(db, user_id)
    elif metric_type == "completed_series":
        return repo.count_completed_series(db, user_id)
    elif metric_type == "public_wips":
        return repo.count_public_wips(db, user_id)
    elif metric_type == "collab_requests_sent":
        return repo.count_collab_requests_sent(db, user_id)
    elif metric_type == "collaborations_total":
        added = repo.count_collaborations_added(db, user_id)
        sent = repo.count_user_collaborations(db, user_id)
        return added + sent
    elif metric_type == "alphabet_coverage":
        return repo.count_alphabet_coverage(db, user_id)
    elif metric_type in ["unique_artists", "unique_years", "unique_decades"]:
        released_songs = repo.get_released_songs_for_diversity(db, user_id)
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
        return repo.has_profile_pic(db, user_id)
    elif metric_type == "personal_link":
        return repo.has_personal_link(db, user_id)
    elif metric_type == "contact_method":
        return repo.has_contact_method(db, user_id)
    
    # Unknown metric type
    return 0


def recalculate_achievements_for_user(
    db: Session,
    user_id: int,
    repo: AchievementsRepository,
    stats: UserStats,
    dry_run: bool = False,
    verbose: bool = False
) -> int:
    """
    Recalculate and award achievements for a user.
    Returns number of achievements awarded.
    """
    awarded_count = 0
    
    # Get all achievements
    all_achievements = repo.get_all_achievements(db)
    
    # Get user's existing achievements
    existing_achievements = repo.get_user_achievement_codes(db, user_id)
    
    # Special handling: Award "Welcome Aboard" to all users who don't have it
    welcome_achievement = next((a for a in all_achievements if a.code == "welcome_aboard"), None)
    if welcome_achievement and "welcome_aboard" not in existing_achievements:
        if verbose:
            print(f"  🏆 Would award: Welcome Aboard! (special achievement for all users)")
        
        if not dry_run:
            user_achievement = repo.create_user_achievement(
                db, user_id, welcome_achievement.id, commit=False
            )
            
            if user_achievement:
                repo.update_user_total_points(
                    db, user_id, welcome_achievement.points, commit=False
                )
                awarded_count += 1
                if verbose:
                    print(f"  ✅ Awarded: Welcome Aboard! (+{welcome_achievement.points} points)")
            else:
                if verbose:
                    print(f"  ⚠️ Welcome Aboard already exists (race condition)")
    
    # Filter to achievements with metric types and target values
    metric_achievements = [
        a for a in all_achievements
        if a.metric_type and a.target_value is not None
    ]
    
    for achievement in metric_achievements:
        # Skip if user already has this achievement
        if achievement.code in existing_achievements:
            continue
        
        # Calculate current metric value
        try:
            current_value = calculate_metric_value(
                achievement.metric_type,
                stats,
                db,
                user_id,
                repo
            )
            
            # Check if user qualifies
            if current_value >= achievement.target_value:
                if verbose:
                    print(f"  🏆 Would award: {achievement.name} (metric: {achievement.metric_type}, value: {current_value}/{achievement.target_value})")
                
                if not dry_run:
                    # Award achievement (without notification)
                    user_achievement = repo.create_user_achievement(
                        db, user_id, achievement.id, commit=False
                    )
                    
                    if user_achievement:
                        # Update total_points (achievement points only, no release bonus)
                        repo.update_user_total_points(
                            db, user_id, achievement.points, commit=False
                        )
                        awarded_count += 1
                        if verbose:
                            print(f"  ✅ Awarded: {achievement.name} (+{achievement.points} points)")
                    else:
                        # Race condition - achievement already exists
                        if verbose:
                            print(f"  ⚠️ Achievement {achievement.name} already exists (race condition)")
            elif verbose and achievement.metric_type == "completed_packs":
                # Debug logging for completed_packs to help diagnose Pack Master issue
                print(f"  ℹ️  {achievement.name}: {current_value} < {achievement.target_value} (not qualified)")
        except Exception as e:
            print(f"  ❌ Error checking achievement {achievement.code} for user {user_id}: {e}")
            import traceback
            traceback.print_exc()
    
    return awarded_count


def compute_user_stats(
    db: Session,
    user_id: int,
    repo: AchievementsRepository,
    dry_run: bool = False,
    verbose: bool = False
) -> Optional[UserStats]:
    """
    Compute and populate user_stats for a user.
    Returns the UserStats object.
    """
    # Get or create user_stats
    stats = repo.get_user_stats(db, user_id)
    stats_created = False
    
    if not stats:
        if dry_run:
            # For dry-run, create a temporary stats object for computation
            # but don't persist it
            stats = UserStats(user_id=user_id)
            stats_created = True
            if verbose:
                print(f"  Would create user_stats for user {user_id}")
        else:
            stats = repo.create_user_stats(db, user_id, commit=False)
            stats_created = True
    
    # Compute all stats fields using authoritative queries
    
    # Song counts
    total_songs = repo.count_user_songs(db, user_id)
    total_released = repo.count_songs_by_status(db, user_id, SongStatus.released)
    total_future = repo.count_songs_by_status(db, user_id, SongStatus.future)
    total_wip = repo.count_songs_by_status(db, user_id, SongStatus.wip)
    
    # Other counts
    total_packs = repo.count_user_packs(db, user_id)
    total_collaborations = repo.count_user_collaborations(db, user_id)
    total_spotify_imports = repo.count_user_spotify_imports(db, user_id)
    total_feature_requests = repo.count_user_feature_requests(db, user_id)
    
    # Login streak and last login date
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        if verbose:
            print(f"  ⚠️ User {user_id} not found")
        return None
    
    last_login_at = user.last_login_at
    current_streak = stats.login_streak or 0
    login_streak = calculate_login_streak(last_login_at, current_streak)
    
    # Approximations for lifetime counters
    # total_future_created: Count songs currently in Future Plans (conservative)
    total_future_created = total_future
    
    # total_wip_created: Count current WIP + released songs (released songs must have been WIP)
    total_wip_created = total_wip + total_released
    
    # Recalculate total_points from achievements (achievement points only, no release bonus)
    total_points = repo.get_user_total_points(db, user_id)
    
    if verbose:
        print(f"  Stats for user {user_id}:")
        print(f"    total_songs: {total_songs}")
        print(f"    total_released: {total_released}")
        print(f"    total_future: {total_future}")
        print(f"    total_wip: {total_wip}")
        print(f"    total_packs: {total_packs}")
        print(f"    total_collaborations: {total_collaborations}")
        print(f"    total_spotify_imports: {total_spotify_imports}")
        print(f"    total_feature_requests: {total_feature_requests}")
        print(f"    login_streak: {login_streak}")
        print(f"    last_login_date: {last_login_at}")
        print(f"    total_future_created: {total_future_created} (approximated)")
        print(f"    total_wip_created: {total_wip_created} (approximated)")
        print(f"    total_points: {total_points}")
    
    # Set values on stats object (needed for achievement checking, even in dry-run)
    stats.total_songs = total_songs
    stats.total_released = total_released
    stats.total_future = total_future
    stats.total_wip = total_wip
    stats.total_packs = total_packs
    stats.total_collaborations = total_collaborations
    stats.total_spotify_imports = total_spotify_imports
    stats.total_feature_requests = total_feature_requests
    stats.login_streak = login_streak
    stats.last_login_date = last_login_at
    stats.total_future_created = total_future_created
    stats.total_wip_created = total_wip_created
    stats.total_points = total_points
    stats.updated_at = datetime.utcnow()
    
    if not dry_run:
        # Update stats in database
        # Note: last_login_date is set directly (not through update_user_stats) because
        # update_user_stats applies max(0, value) which doesn't work for datetime fields
        repo.update_user_stats(
            db, stats,
            total_songs=total_songs,
            total_released=total_released,
            total_future=total_future,
            total_wip=total_wip,
            total_packs=total_packs,
            total_collaborations=total_collaborations,
            total_spotify_imports=total_spotify_imports,
            total_feature_requests=total_feature_requests,
            login_streak=login_streak,
            total_future_created=total_future_created,
            total_wip_created=total_wip_created,
            total_points=total_points,
            commit=False
        )
        # Set last_login_date directly (datetime field, can't use max(0, value))
        stats.last_login_date = last_login_at
    
    return (stats, stats_created)


def process_user(
    db: Session,
    user_id: int,
    repo: AchievementsRepository,
    dry_run: bool = False,
    verbose: bool = False,
    migration_stats: Optional[MigrationStats] = None
) -> Dict:
    """
    Process a single user: recalculate achievements and compute stats.
    Returns dict with processing results.
    """
    result = {
        "user_id": user_id,
        "achievements_awarded": 0,
        "stats_created": False,
        "stats_updated": False,
        "errors": []
    }
    
    try:
        if verbose:
            print(f"\n📊 Processing user {user_id}...")
        
        # First, compute stats (needed for achievement checking)
        stats_result = compute_user_stats(db, user_id, repo, dry_run, verbose)
        
        if stats_result is None:
            result["errors"].append("Could not compute stats")
            return result
        
        stats, stats_created = stats_result
        
        if not dry_run:
            if stats_created:
                result["stats_created"] = True
                if migration_stats:
                    migration_stats.stats_created += 1
            else:
                result["stats_updated"] = True
                if migration_stats:
                    migration_stats.stats_updated += 1
        
        # Recalculate achievements
        awarded_count = recalculate_achievements_for_user(
            db, user_id, repo, stats, dry_run, verbose
        )
        result["achievements_awarded"] = awarded_count
        
        if not dry_run and migration_stats:
            migration_stats.achievements_awarded += awarded_count
        
        if verbose:
            print(f"  ✅ User {user_id} processed: {awarded_count} achievements awarded")
        
    except Exception as e:
        error_msg = f"Error processing user {user_id}: {e}"
        result["errors"].append(error_msg)
        print(f"  ❌ {error_msg}")
        import traceback
        traceback.print_exc()
        if migration_stats:
            migration_stats.errors.append(error_msg)
    
    return result


def verify_migration(db: Session, verbose: bool = False) -> Dict:
    """
    Verify migration results.
    Returns dict with verification results.
    """
    verification = {
        "all_users_have_stats": True,
        "points_match": True,
        "sample_checks": [],
        "issues": []
    }
    
    # Check 1: All users have user_stats rows
    users_without_stats = db.query(User.id).outerjoin(UserStats).filter(
        UserStats.user_id.is_(None)
    ).all()
    
    if users_without_stats:
        verification["all_users_have_stats"] = False
        verification["issues"].append(f"{len(users_without_stats)} users without user_stats")
        if verbose:
            print(f"⚠️ Found {len(users_without_stats)} users without user_stats")
    
    # Check 2: total_points matches achievement sums
    repo = AchievementsRepository()
    users_with_mismatch = []
    
    all_users = db.query(User.id).all()
    for (user_id,) in all_users[:100]:  # Sample first 100 users
        stats = repo.get_user_stats(db, user_id)
        if stats:
            calculated_points = repo.get_user_total_points(db, user_id)
            if stats.total_points != calculated_points:
                users_with_mismatch.append({
                    "user_id": user_id,
                    "stored": stats.total_points,
                    "calculated": calculated_points
                })
                verification["points_match"] = False
    
    if users_with_mismatch:
        verification["issues"].append(f"{len(users_with_mismatch)} users with points mismatch")
        if verbose:
            print(f"⚠️ Found {len(users_with_mismatch)} users with points mismatch:")
            for mismatch in users_with_mismatch[:10]:  # Show first 10
                print(f"  User {mismatch['user_id']}: stored={mismatch['stored']}, calculated={mismatch['calculated']}")
    
    verification["sample_checks"] = {
        "users_checked": min(100, len(all_users)),
        "users_with_mismatch": len(users_with_mismatch)
    }
    
    return verification


def main():
    parser = argparse.ArgumentParser(
        description="Recalculate achievements and populate user_stats from authoritative data"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes"
    )
    parser.add_argument(
        "--user-id",
        type=int,
        help="Process only a specific user ID"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed logging for each user"
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only run verification checks, don't migrate"
    )
    
    args = parser.parse_args()
    
    db = SessionLocal()
    repo = AchievementsRepository()
    migration_stats = MigrationStats()
    
    try:
        if args.verify_only:
            print("🔍 Running verification checks only...\n")
            verification = verify_migration(db, args.verbose)
            print("\nVerification Results:")
            print(f"  All users have stats: {verification['all_users_have_stats']}")
            print(f"  Points match: {verification['points_match']}")
            if verification['issues']:
                print(f"  Issues found: {len(verification['issues'])}")
                for issue in verification['issues']:
                    print(f"    - {issue}")
            return
        
        if args.dry_run:
            print("🔍 DRY RUN MODE - No changes will be made\n")
        
        # Get users to process
        if args.user_id:
            users = db.query(User.id).filter(User.id == args.user_id).all()
            if not users:
                print(f"❌ User {args.user_id} not found")
                return
        else:
            users = db.query(User.id).all()
        
        print(f"🚀 Starting migration for {len(users)} user(s)...\n")
        
        # Process each user
        for (user_id,) in users:
            result = process_user(
                db, user_id, repo, args.dry_run, args.verbose, migration_stats
            )
            migration_stats.users_processed += 1
            
            # Commit after each user (for idempotency and progress tracking)
            if not args.dry_run:
                try:
                    db.commit()
                except Exception as e:
                    print(f"❌ Error committing for user {user_id}: {e}")
                    db.rollback()
        
        # Print summary
        print(migration_stats.summary())
        
        # Run verification
        if not args.dry_run:
            print("\n🔍 Running verification checks...\n")
            verification = verify_migration(db, args.verbose)
            print("\nVerification Results:")
            print(f"  All users have stats: {verification['all_users_have_stats']}")
            print(f"  Points match: {verification['points_match']}")
            if verification['issues']:
                print(f"  Issues found: {len(verification['issues'])}")
                for issue in verification['issues']:
                    print(f"    - {issue}")
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()

