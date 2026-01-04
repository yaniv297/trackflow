#!/usr/bin/env python3
"""
Migration script to fix the Welcome Aboard achievement issue.

This script:
1. Updates the existing Welcome Aboard achievement to correct values (category='activity', points=5)
2. Adjusts user points if they were awarded the wrong version (10 points instead of 5)
3. Ensures there are no duplicate achievements
4. Migrates any users who might have the wrong achievement

Run this script once to fix the database.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import User, Achievement, UserAchievement, UserStats
from sqlalchemy import text

def fix_welcome_aboard_achievement():
    """Fix the Welcome Aboard achievement in the database."""
    db = SessionLocal()
    try:
        print("🔧 Fixing Welcome Aboard achievement...")
        
        # Step 1: Find the Welcome Aboard achievement
        welcome_achievement = db.query(Achievement).filter(Achievement.code == "welcome_aboard").first()
        
        if not welcome_achievement:
            print("❌ Welcome Aboard achievement not found in database!")
            print("   Run: python tools/seed_achievements.py first")
            return
        
        print(f"✅ Found achievement: {welcome_achievement.name}")
        print(f"   Current category: {welcome_achievement.category}")
        print(f"   Current points: {welcome_achievement.points}")
        
        # Check if it needs fixing
        needs_fix = False
        if welcome_achievement.category != "activity":
            print(f"   ⚠️  Category is '{welcome_achievement.category}', should be 'activity'")
            needs_fix = True
        if welcome_achievement.points != 5:
            print(f"   ⚠️  Points is {welcome_achievement.points}, should be 5")
            needs_fix = True
        
        if not needs_fix:
            print("✅ Achievement already has correct values!")
        else:
            # Step 2: Get all users who have this achievement
            users_with_achievement = db.query(UserAchievement.user_id).filter(
                UserAchievement.achievement_id == welcome_achievement.id
            ).all()
            user_ids = [uid[0] for uid in users_with_achievement]
            print(f"📊 Found {len(user_ids)} users with Welcome Aboard achievement")
            
            # Step 3: Calculate point adjustments needed
            point_difference = welcome_achievement.points - 5  # How many points to subtract
            if point_difference > 0:
                print(f"💰 Need to adjust {len(user_ids)} users' points by -{point_difference} points each")
            
            # Step 4: Update the achievement
            print("\n🔄 Updating achievement...")
            old_category = welcome_achievement.category
            old_points = welcome_achievement.points
            
            welcome_achievement.category = "activity"
            welcome_achievement.points = 5
            
            db.commit()
            print(f"✅ Updated achievement:")
            print(f"   Category: {old_category} → {welcome_achievement.category}")
            print(f"   Points: {old_points} → {welcome_achievement.points}")
            
            # Step 5: Adjust user points if needed
            if point_difference > 0 and user_ids:
                print(f"\n💰 Adjusting user points...")
                adjusted_count = 0
                
                for user_id in user_ids:
                    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
                    if stats:
                        old_total = stats.total_points
                        # Subtract the difference (e.g., if they got 10 but should have 5, subtract 5)
                        stats.total_points = max(0, stats.total_points - point_difference)
                        new_total = stats.total_points
                        
                        if old_total != new_total:
                            adjusted_count += 1
                            print(f"   User {user_id}: {old_total} → {new_total} points")
                
                db.commit()
                print(f"✅ Adjusted points for {adjusted_count} users")
            
            # Step 6: Check for any duplicate achievements (shouldn't exist due to unique constraint, but check anyway)
            print("\n🔍 Checking for duplicate achievements...")
            all_welcome_achievements = db.query(Achievement).filter(
                Achievement.code == "welcome_aboard"
            ).all()
            
            if len(all_welcome_achievements) > 1:
                print(f"⚠️  WARNING: Found {len(all_welcome_achievements)} achievements with code 'welcome_aboard'!")
                print("   This should not be possible due to unique constraint.")
                print("   Keeping the first one and removing duplicates...")
                
                # Keep the first one (which we just fixed)
                for dup in all_welcome_achievements[1:]:
                    # Check if any users have this duplicate
                    dup_user_achievements = db.query(UserAchievement).filter(
                        UserAchievement.achievement_id == dup.id
                    ).all()
                    
                    if dup_user_achievements:
                        print(f"   ⚠️  Duplicate achievement {dup.id} has {len(dup_user_achievements)} user associations!")
                        print(f"      Migrating users to correct achievement...")
                        
                        # Migrate users to the correct achievement
                        for ua in dup_user_achievements:
                            # Check if user already has the correct achievement
                            existing = db.query(UserAchievement).filter(
                                UserAchievement.user_id == ua.user_id,
                                UserAchievement.achievement_id == welcome_achievement.id
                            ).first()
                            
                            if not existing:
                                # Migrate: update the achievement_id
                                ua.achievement_id = welcome_achievement.id
                                print(f"      Migrated user {ua.user_id} to correct achievement")
                            else:
                                # User already has correct achievement, remove duplicate
                                db.delete(ua)
                                print(f"      Removed duplicate for user {ua.user_id}")
                    
                    # Delete the duplicate achievement
                    db.delete(dup)
                    print(f"   🗑️  Removed duplicate achievement {dup.id}")
                
                db.commit()
                print("✅ Duplicate achievements cleaned up")
            else:
                print("✅ No duplicate achievements found")
        
        # Final verification
        print("\n✅ Verification:")
        final_achievement = db.query(Achievement).filter(Achievement.code == "welcome_aboard").first()
        if final_achievement:
            print(f"   Code: {final_achievement.code}")
            print(f"   Name: {final_achievement.name}")
            print(f"   Category: {final_achievement.category} {'✅' if final_achievement.category == 'activity' else '❌'}")
            print(f"   Points: {final_achievement.points} {'✅' if final_achievement.points == 5 else '❌'}")
            
            user_count = db.query(UserAchievement).filter(
                UserAchievement.achievement_id == final_achievement.id
            ).count()
            print(f"   Users with achievement: {user_count}")
        
        print("\n✨ Migration complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Starting Welcome Aboard achievement fix...")
    fix_welcome_aboard_achievement()
    print("✨ Done!")



