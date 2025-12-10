#!/usr/bin/env python3
"""
One-time script to award Welcome Aboard achievement to all existing users who don't have it.
This is needed because the achievement was added after some users already registered.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User, Achievement, UserAchievement
from api.achievements.services.achievements_service import AchievementsService

def award_welcome_aboard_to_all():
    """Award Welcome Aboard achievement to all users who don't have it."""
    db = SessionLocal()
    try:
        # Get the Welcome Aboard achievement
        welcome_achievement = db.query(Achievement).filter(Achievement.code == "welcome_aboard").first()
        if not welcome_achievement:
            print("❌ Welcome Aboard achievement not found in database!")
            print("   Run: python tools/seed_achievements.py")
            return
        
        print(f"✅ Found achievement: {welcome_achievement.name}")
        
        # Get all users
        all_users = db.query(User).all()
        print(f"📊 Found {len(all_users)} total users")
        
        # Get users who already have the achievement
        users_with_achievement = db.query(UserAchievement.user_id).filter(
            UserAchievement.achievement_id == welcome_achievement.id
        ).all()
        users_with_achievement_ids = {uid[0] for uid in users_with_achievement}
        
        print(f"✅ {len(users_with_achievement_ids)} users already have Welcome Aboard")
        
        # Find users who need the achievement
        users_needing_achievement = [u for u in all_users if u.id not in users_with_achievement_ids]
        print(f"🎯 {len(users_needing_achievement)} users need Welcome Aboard achievement")
        
        if not users_needing_achievement:
            print("✨ All users already have Welcome Aboard!")
            return
        
        # Award achievement to each user
        achievements_service = AchievementsService()
        awarded_count = 0
        failed_count = 0
        
        for user in users_needing_achievement:
            try:
                result = achievements_service.award_achievement(db, user.id, "welcome_aboard")
                if result:
                    print(f"  ✅ Awarded to {user.username} (ID: {user.id})")
                    awarded_count += 1
                else:
                    print(f"  ⚠️  Could not award to {user.username} (ID: {user.id}) - may have been awarded concurrently")
            except Exception as e:
                print(f"  ❌ Error awarding to {user.username} (ID: {user.id}): {e}")
                failed_count += 1
        
        print(f"\n🎉 Summary:")
        print(f"   ✅ Awarded: {awarded_count}")
        print(f"   ❌ Failed: {failed_count}")
        print(f"   📊 Total processed: {len(users_needing_achievement)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Awarding Welcome Aboard achievement to existing users...")
    award_welcome_aboard_to_all()
    print("✨ Done!")

