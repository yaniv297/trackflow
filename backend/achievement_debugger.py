#!/usr/bin/env python3
"""
Achievement Debugging Utility
Helps debug achievement issues for specific users.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User, Song, Pack, Achievement, UserAchievement, UserStats, Collaboration
from api.achievements import check_all_achievements, update_user_stats
from sqlalchemy import func


def get_user_by_username(db, username: str):
    """Get user by username."""
    return db.query(User).filter(User.username == username).first()


def show_user_achievements(db, user_id: int):
    """Show all achievements for a user."""
    achievements = db.query(Achievement, UserAchievement).join(
        UserAchievement, Achievement.id == UserAchievement.achievement_id
    ).filter(UserAchievement.user_id == user_id).order_by(
        UserAchievement.earned_at.desc()
    ).all()
    
    print(f"\n🏆 User Achievements ({len(achievements)} total):")
    print("-" * 70)
    
    if not achievements:
        print("   No achievements earned yet")
        return
    
    for achievement, user_achievement in achievements:
        earned_date = user_achievement.earned_at.strftime("%Y-%m-%d %H:%M:%S") if user_achievement.earned_at else "Unknown"
        print(f"   {achievement.icon} {achievement.name}")
        print(f"      {achievement.description}")
        print(f"      Earned: {earned_date} | Points: {achievement.points} | Rarity: {achievement.rarity}")
        print()


def show_user_stats(db, user_id: int):
    """Show detailed user statistics."""
    stats = update_user_stats(db, user_id)
    
    print(f"\n📊 User Statistics:")
    print("-" * 40)
    print(f"   Total Songs: {stats.total_songs}")
    print(f"   Released: {stats.total_released}")
    print(f"   WIP: {stats.total_wip}")
    print(f"   Future: {stats.total_future}")
    print(f"   Total Packs: {stats.total_packs}")
    print(f"   Collaborations: {stats.total_collaborations}")
    print(f"   Spotify Imports: {stats.total_spotify_imports}")
    print(f"   Feature Requests: {stats.total_feature_requests}")
    print(f"   Login Streak: {stats.login_streak}")
    
    # Additional calculated stats
    songs_by_status = db.query(Song.status, func.count(Song.id)).filter(
        Song.user_id == user_id
    ).group_by(Song.status).all()
    
    print(f"\n   Songs by Status:")
    for status, count in songs_by_status:
        print(f"      {status.value}: {count}")


def show_achievement_progress(db, user_id: int):
    """Show progress towards unearned achievements."""
    from api.achievements import _get_achievement_progress_data, get_or_create_user_stats
    
    stats = get_or_create_user_stats(db, user_id)
    
    # Get all achievements
    all_achievements = db.query(Achievement).filter(
        Achievement.target_value.isnot(None)
    ).all()
    
    # Get earned achievement codes
    earned_codes = set(
        db.query(Achievement.code)
        .join(UserAchievement)
        .filter(UserAchievement.user_id == user_id)
        .all()
    )
    earned_codes = {code[0] for code in earned_codes}
    
    # Get progress data
    progress_data = _get_achievement_progress_data(stats, db, user_id)
    
    print(f"\n🎯 Achievement Progress:")
    print("-" * 70)
    
    unearned_achievements = [a for a in all_achievements if a.code not in earned_codes]
    
    if not unearned_achievements:
        print("   All available achievements have been earned!")
        return
    
    # Group by category
    by_category = {}
    for achievement in unearned_achievements:
        category = achievement.category
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(achievement)
    
    for category, achievements in by_category.items():
        print(f"\n   {category.upper()}:")
        for achievement in achievements:
            progress = progress_data.get(achievement.code)
            if progress:
                current = progress['current']
                target = progress['target']
                percentage = int((current / target) * 100) if target > 0 else 0
                progress_bar = "█" * (percentage // 10) + "░" * (10 - percentage // 10)
                print(f"      {achievement.icon} {achievement.name}")
                print(f"         Progress: {current}/{target} [{progress_bar}] {percentage}%")
            else:
                print(f"      {achievement.icon} {achievement.name} (Special achievement)")


def check_user_achievements(db, user_id: int):
    """Check and award new achievements for a user."""
    print(f"\n🔄 Checking achievements for user {user_id}...")
    
    newly_awarded = check_all_achievements(db, user_id)
    
    if newly_awarded:
        print(f"🎉 Awarded {len(newly_awarded)} new achievements:")
        for code in newly_awarded:
            achievement = db.query(Achievement).filter(Achievement.code == code).first()
            if achievement:
                print(f"   🏆 {achievement.name} - {achievement.description}")
    else:
        print("   No new achievements awarded")


def debug_user_achievements(username: str):
    """Debug achievements for a specific user."""
    db = SessionLocal()
    
    try:
        # Get user
        user = get_user_by_username(db, username)
        if not user:
            print(f"❌ User '{username}' not found")
            return
        
        print(f"\n🔍 Debugging achievements for user: {username} (ID: {user.id})")
        print("=" * 80)
        
        # Show current achievements
        show_user_achievements(db, user.id)
        
        # Show statistics
        show_user_stats(db, user.id)
        
        # Show progress towards unearned achievements
        show_achievement_progress(db, user.id)
        
        # Check for new achievements
        check_user_achievements(db, user.id)
        
        print("\n" + "=" * 80)
        print("✅ Achievement debugging complete!")
        
    except Exception as e:
        print(f"❌ Error debugging achievements: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()


def list_all_achievements(db):
    """List all available achievements."""
    achievements = db.query(Achievement).order_by(
        Achievement.category, Achievement.points.desc()
    ).all()
    
    print(f"\n📋 All Available Achievements ({len(achievements)} total):")
    print("=" * 80)
    
    current_category = None
    for achievement in achievements:
        if achievement.category != current_category:
            current_category = achievement.category
            print(f"\n📂 {current_category.upper()}")
            print("-" * 40)
        
        target_info = ""
        if achievement.target_value and achievement.metric_type:
            target_info = f" (Target: {achievement.target_value} {achievement.metric_type})"
        
        print(f"   {achievement.icon} {achievement.name}{target_info}")
        print(f"      {achievement.description}")
        print(f"      Points: {achievement.points} | Rarity: {achievement.rarity}")
        print()


def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("🏆 Achievement Debugger")
        print("=" * 40)
        print("Usage:")
        print("  python achievement_debugger.py <username>     - Debug specific user")
        print("  python achievement_debugger.py --list         - List all achievements")
        print("  python achievement_debugger.py --test         - Run achievement tests")
        print()
        print("Examples:")
        print("  python achievement_debugger.py yaniv297")
        print("  python achievement_debugger.py --list")
        return
    
    command = sys.argv[1]
    
    if command == "--list":
        db = SessionLocal()
        try:
            list_all_achievements(db)
        finally:
            db.close()
    
    elif command == "--test":
        print("🧪 Running achievement tests...")
        from test_achievements_runner import run_all_tests
        run_all_tests()
    
    else:
        # Assume it's a username
        debug_user_achievements(command)


if __name__ == "__main__":
    main()