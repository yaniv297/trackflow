#!/usr/bin/env python3
"""
Script to remove the duplicate 'account_created' achievement and migrate users to 'welcome_aboard'.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Achievement, UserAchievement

def remove_duplicate():
    """Remove account_created achievement and migrate users to welcome_aboard."""
    db = SessionLocal()
    try:
        print("🔧 Removing duplicate 'account_created' achievement...")
        
        # Get both achievements
        account_created = db.query(Achievement).filter(Achievement.code == "account_created").first()
        welcome_aboard = db.query(Achievement).filter(Achievement.code == "welcome_aboard").first()
        
        if not account_created:
            print("✅ No 'account_created' achievement found. Nothing to do.")
            return
        
        if not welcome_aboard:
            print("❌ 'welcome_aboard' achievement not found!")
            print("   Run: python tools/seed_achievements.py first")
            return
        
        print(f"📊 Found 'account_created' (ID: {account_created.id})")
        print(f"📊 Found 'welcome_aboard' (ID: {welcome_aboard.id})")
        
        # Get users with account_created
        users_with_account_created = db.query(UserAchievement).filter(
            UserAchievement.achievement_id == account_created.id
        ).all()
        
        print(f"👥 Found {len(users_with_account_created)} users with 'account_created' achievement")
        
        # Migrate users to welcome_aboard
        migrated_count = 0
        removed_count = 0
        
        for ua in users_with_account_created:
            # Check if user already has welcome_aboard
            existing = db.query(UserAchievement).filter(
                UserAchievement.user_id == ua.user_id,
                UserAchievement.achievement_id == welcome_aboard.id
            ).first()
            
            if existing:
                # User already has welcome_aboard, just remove the duplicate
                print(f"   User {ua.user_id}: Already has welcome_aboard, removing duplicate account_created")
                db.delete(ua)
                removed_count += 1
            else:
                # Migrate: change achievement_id to welcome_aboard
                print(f"   User {ua.user_id}: Migrating from account_created to welcome_aboard")
                ua.achievement_id = welcome_aboard.id
                migrated_count += 1
        
        db.commit()
        print(f"\n✅ Migration complete:")
        print(f"   Migrated: {migrated_count} users")
        print(f"   Removed duplicates: {removed_count} users")
        
        # Delete the account_created achievement
        print(f"\n🗑️  Deleting 'account_created' achievement...")
        db.delete(account_created)
        db.commit()
        print(f"✅ Deleted 'account_created' achievement (ID: {account_created.id})")
        
        # Verify
        remaining = db.query(Achievement).filter(Achievement.code == "account_created").first()
        if remaining:
            print("⚠️  WARNING: account_created still exists after deletion!")
        else:
            print("✅ Verified: account_created has been removed")
        
        # Check welcome_aboard user count
        welcome_users = db.query(UserAchievement).filter(
            UserAchievement.achievement_id == welcome_aboard.id
        ).count()
        print(f"📊 Users with welcome_aboard: {welcome_users}")
        
        print("\n✨ Done!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Starting duplicate removal...")
    remove_duplicate()
    print("✨ Complete!")

