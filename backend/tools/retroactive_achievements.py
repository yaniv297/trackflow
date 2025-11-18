#!/usr/bin/env python3
"""
Retroactive Achievement Checker
This script checks all users' existing work and awards achievements they should have earned
based on their song counts, packs, collaborations, etc.

Run this script when:
1. New achievements are added to the system
2. Users have existing work but missing achievements
3. After data migrations or imports

Usage:
    python tools/retroactive_achievements.py [user_id]
    
If user_id is provided, only check that specific user.
If no user_id is provided, check all users.
"""

import sys
import os
from typing import List, Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User, Achievement, UserAchievement
from api.achievements import (
    update_user_stats, check_all_achievements_unified, 
    award_achievement, _calculate_metric_value, get_or_create_user_stats
)
from sqlalchemy import func


def check_user_retroactive_achievements(db_session, user_id: int, verbose: bool = True) -> List[str]:
    """
    Check and award all achievements for a specific user based on their existing data.
    Returns list of newly awarded achievement codes.
    """
    try:
        # Get user info
        user = db_session.query(User).filter(User.id == user_id).first()
        if not user:
            if verbose:
                print(f"❌ User {user_id} not found")
            return []
        
        if verbose:
            print(f"\n🔍 Checking achievements for user: {user.username} (ID: {user_id})")
        
        # Get current achievement count
        current_achievements = db_session.query(UserAchievement).filter(
            UserAchievement.user_id == user_id
        ).count()
        
        if verbose:
            print(f"📊 Current achievements: {current_achievements}")
        
        # Update user stats first
        if verbose:
            print("📈 Updating user statistics...")
        stats = update_user_stats(db_session, user_id)
        
        if verbose:
            print(f"   📋 Songs: {stats.total_songs} (Released: {stats.total_released}, WIP: {stats.total_wip}, Future: {stats.total_future})")
            print(f"   📦 Packs: {stats.total_packs}")
            print(f"   🤝 Collaborations: {stats.total_collaborations}")
            print(f"   🎧 Spotify imports: {stats.total_spotify_imports}")
            print(f"   💡 Feature requests: {stats.total_feature_requests}")
            print(f"   🔥 Login streak: {stats.login_streak}")
        
        # Run the comprehensive achievement checker
        if verbose:
            print("🏆 Running achievement checks...")
        newly_awarded = check_all_achievements_unified(db_session, user_id)
        
        # Get final achievement count
        final_achievements = db_session.query(UserAchievement).filter(
            UserAchievement.user_id == user_id
        ).count()
        
        if verbose:
            print(f"✅ Final achievements: {final_achievements}")
            print(f"🎉 Newly awarded: {len(newly_awarded)} achievements")
            if newly_awarded:
                for code in newly_awarded:
                    achievement = db_session.query(Achievement).filter(Achievement.code == code).first()
                    if achievement:
                        print(f"   🏆 {achievement.name} (+{achievement.points} pts)")
        
        return newly_awarded
        
    except Exception as e:
        print(f"❌ Error checking achievements for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return []


def check_all_users_retroactive_achievements(db_session, limit: Optional[int] = None, verbose: bool = True) -> dict:
    """
    Check all users for missing achievements.
    Returns dict with user_id -> newly_awarded_codes mapping.
    """
    try:
        # Get all users
        query = db_session.query(User).order_by(User.id)
        if limit:
            query = query.limit(limit)
        
        users = query.all()
        
        if verbose:
            print(f"🔍 Checking achievements for {len(users)} users...")
        
        results = {}
        total_awarded = 0
        
        for i, user in enumerate(users, 1):
            if verbose:
                print(f"\n[{i}/{len(users)}]", end=" ")
            
            newly_awarded = check_user_retroactive_achievements(db_session, user.id, verbose=verbose)
            results[user.id] = newly_awarded
            total_awarded += len(newly_awarded)
            
            if not verbose and newly_awarded:
                # Brief output when not verbose
                print(f"🏆 {user.username}: {len(newly_awarded)} new achievements")
        
        if verbose:
            print(f"\n🎉 Summary: {total_awarded} achievements awarded across {len(users)} users")
        
        return results
        
    except Exception as e:
        print(f"❌ Error in bulk achievement check: {e}")
        import traceback
        traceback.print_exc()
        return {}


def get_user_stats_summary(db_session, user_id: int) -> dict:
    """Get a summary of user's current stats for debugging purposes."""
    try:
        stats = get_or_create_user_stats(db_session, user_id)
        
        # Calculate additional metrics that aren't stored in stats
        from api.achievements import (
            _get_wip_completion_count, _get_completed_songs_optimized, 
            _get_completed_packs_optimized, _calculate_metric_value
        )
        
        summary = {
            "basic_stats": {
                "total_songs": stats.total_songs,
                "total_released": stats.total_released, 
                "total_wip": stats.total_wip,
                "total_future": stats.total_future,
                "total_packs": stats.total_packs,
                "total_collaborations": stats.total_collaborations,
                "total_spotify_imports": stats.total_spotify_imports,
                "total_feature_requests": stats.total_feature_requests,
                "login_streak": stats.login_streak,
            },
            "calculated_metrics": {
                "wip_completions": _calculate_metric_value("wip_completions", stats, db_session, user_id),
                "completed_songs": _calculate_metric_value("completed_songs", stats, db_session, user_id),
                "completed_packs": _calculate_metric_value("completed_packs", stats, db_session, user_id),
                "collaborations_added": _calculate_metric_value("collaborations_added", stats, db_session, user_id),
                "bug_reports": _calculate_metric_value("bug_reports", stats, db_session, user_id),
                "series_created": _calculate_metric_value("series_created", stats, db_session, user_id),
                "completed_series": _calculate_metric_value("completed_series", stats, db_session, user_id),
                "unique_artists": _calculate_metric_value("unique_artists", stats, db_session, user_id),
                "unique_years": _calculate_metric_value("unique_years", stats, db_session, user_id),
                "unique_decades": _calculate_metric_value("unique_decades", stats, db_session, user_id),
            }
        }
        
        return summary
        
    except Exception as e:
        print(f"❌ Error getting stats summary for user {user_id}: {e}")
        return {}


def show_missing_achievements(db_session, user_id: int):
    """Show which achievements a user is missing and why."""
    try:
        user = db_session.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"❌ User {user_id} not found")
            return
            
        print(f"\n📊 Missing Achievement Analysis for {user.username} (ID: {user_id})")
        print("=" * 60)
        
        # Get earned achievements
        earned_codes = set(
            code[0] for code in db_session.query(Achievement.code)
            .join(UserAchievement)
            .filter(UserAchievement.user_id == user_id)
            .all()
        )
        
        # Get all achievements
        all_achievements = db_session.query(Achievement).order_by(
            Achievement.category, Achievement.points
        ).all()
        
        # Get user stats
        stats_summary = get_user_stats_summary(db_session, user_id)
        
        print(f"\n📈 Current Stats:")
        for category, values in stats_summary.items():
            print(f"  {category}:")
            for metric, value in values.items():
                print(f"    {metric}: {value}")
        
        print(f"\n🏆 Achievement Analysis:")
        
        by_category = {}
        for achievement in all_achievements:
            if achievement.category not in by_category:
                by_category[achievement.category] = []
            by_category[achievement.category].append(achievement)
        
        for category, achievements in by_category.items():
            print(f"\n📂 {category.upper()}")
            earned_in_category = 0
            total_in_category = len(achievements)
            
            for achievement in achievements:
                is_earned = achievement.code in earned_codes
                if is_earned:
                    earned_in_category += 1
                    status = "✅ EARNED"
                else:
                    status = "❌ MISSING"
                    
                print(f"  {status} {achievement.name} (+{achievement.points}pts)")
                print(f"    📝 {achievement.description}")
                
                if achievement.metric_type and achievement.target_value:
                    # Get current value for this metric
                    stats = get_or_create_user_stats(db_session, user_id)
                    current_value = _calculate_metric_value(achievement.metric_type, stats, db_session, user_id)
                    progress = f"{current_value}/{achievement.target_value}"
                    
                    if is_earned:
                        print(f"    📊 Progress: {progress} ✓")
                    else:
                        remaining = max(0, achievement.target_value - current_value)
                        print(f"    📊 Progress: {progress} (need {remaining} more)")
                
                print()
            
            print(f"    Category Summary: {earned_in_category}/{total_in_category} earned")
        
        total_earned = len(earned_codes)
        total_available = len(all_achievements)
        total_points = sum(
            point[0] for point in db_session.query(Achievement.points)
            .join(UserAchievement)
            .filter(UserAchievement.user_id == user_id)
            .all()
        )
        
        print(f"\n📋 Overall Summary:")
        print(f"  🏆 Total Achievements: {total_earned}/{total_available}")
        print(f"  ⭐ Total Points: {total_points}")
        print(f"  📈 Completion Rate: {(total_earned/total_available*100):.1f}%")
        
    except Exception as e:
        print(f"❌ Error analyzing missing achievements: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main function to handle command line arguments and run the appropriate check."""
    if len(sys.argv) > 1:
        try:
            user_id = int(sys.argv[1])
            action = sys.argv[2] if len(sys.argv) > 2 else "check"
        except (ValueError, IndexError):
            print("Usage: python tools/retroactive_achievements.py [user_id] [action]")
            print("  user_id: specific user to check (optional)")
            print("  action: 'check' (default), 'analyze', or 'stats'")
            print("\nIf no user_id provided, checks all users.")
            return
    else:
        user_id = None
        action = "check"
    
    db = SessionLocal()
    try:
        if user_id:
            if action == "analyze":
                show_missing_achievements(db, user_id)
            elif action == "stats":
                stats = get_user_stats_summary(db, user_id)
                user = db.query(User).filter(User.id == user_id).first()
                print(f"\n📊 Stats for {user.username if user else f'User {user_id}'}:")
                for category, values in stats.items():
                    print(f"  {category}:")
                    for metric, value in values.items():
                        print(f"    {metric}: {value}")
            else:  # check
                check_user_retroactive_achievements(db, user_id, verbose=True)
        else:
            # Check all users
            print("🚀 Starting retroactive achievement check for all users...")
            check_all_users_retroactive_achievements(db, verbose=False)
            
    except KeyboardInterrupt:
        print("\n⏹️  Process interrupted by user")
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()