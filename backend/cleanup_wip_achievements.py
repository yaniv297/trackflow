#!/usr/bin/env python3
"""
Remove excessive WIP achievements and update Fireworks Master
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Achievement, UserAchievement

def cleanup_wip_achievements():
    """Remove excessive WIP achievements and update Fireworks Master."""
    db = SessionLocal()
    try:
        # Achievements to remove (encouraging too many WIPs)
        achievements_to_remove = [
            "productivity_master",  # Start 100 WIP songs
            "work_legend",         # Start 250 WIP songs
            "master_finisher",     # Complete 50 WIP songs (will be replaced by fireworks_master)
            "completion_legend",   # Complete 100 WIP songs
        ]
        
        removed_count = 0
        for code in achievements_to_remove:
            # First remove any user achievements for this achievement
            achievement = db.query(Achievement).filter(Achievement.code == code).first()
            if achievement:
                user_achievements = db.query(UserAchievement).filter(
                    UserAchievement.achievement_id == achievement.id
                ).all()
                
                if user_achievements:
                    print(f"⚠️  Found {len(user_achievements)} user achievements for '{code}' - removing them")
                    for ua in user_achievements:
                        db.delete(ua)
                
                # Remove the achievement itself
                db.delete(achievement)
                removed_count += 1
                print(f"❌ Removed achievement: {achievement.name} ({code})")
        
        # Update Fireworks Master achievement
        fireworks_achievement = db.query(Achievement).filter(Achievement.code == "fireworks_master").first()
        if fireworks_achievement:
            print(f"\n🎇 Updating Fireworks Master:")
            print(f"  Old target: {fireworks_achievement.target_value}")
            print(f"  New target: 50")
            
            fireworks_achievement.target_value = 50
            fireworks_achievement.description = "Complete 50 WIP songs"
            print(f"  ✅ Updated Fireworks Master to require 50 completions")
        else:
            print(f"⚠️ Fireworks Master achievement not found - will be created by seeder")
        
        db.commit()
        print(f"\n✅ Successfully removed {removed_count} excessive WIP achievements")
        print(f"✅ Updated Fireworks Master achievement")
        print(f"📊 Total achievements remaining: {db.query(Achievement).count()}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error cleaning up achievements: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🧹 Cleaning up excessive WIP achievements...")
    cleanup_wip_achievements()
    print("✨ Done!")