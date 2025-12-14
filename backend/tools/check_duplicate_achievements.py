#!/usr/bin/env python3
"""
Script to check for duplicate Welcome Aboard achievements in the database.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Achievement, UserAchievement

def check_duplicates():
    """Check for duplicate Welcome Aboard achievements."""
    db = SessionLocal()
    try:
        print("🔍 Checking for duplicate Welcome Aboard achievements...")
        
        # Check all achievements with "welcome" in the name or code
        all_welcome = db.query(Achievement).filter(
            (Achievement.code.like("%welcome%")) | 
            (Achievement.name.like("%Welcome%"))
        ).all()
        
        print(f"\n📊 Found {len(all_welcome)} achievement(s) with 'welcome' in name/code:")
        for ach in all_welcome:
            print(f"\n   ID: {ach.id}")
            print(f"   Code: {ach.code}")
            print(f"   Name: {ach.name}")
            print(f"   Category: {ach.category}")
            print(f"   Points: {ach.points}")
            print(f"   Description: {ach.description}")
            
            # Count users with this achievement
            user_count = db.query(UserAchievement).filter(
                UserAchievement.achievement_id == ach.id
            ).count()
            print(f"   Users with this achievement: {user_count}")
        
        # Check specifically for welcome_aboard code
        welcome_aboard = db.query(Achievement).filter(
            Achievement.code == "welcome_aboard"
        ).all()
        
        if len(welcome_aboard) > 1:
            print(f"\n⚠️  WARNING: Found {len(welcome_aboard)} achievements with code 'welcome_aboard'!")
            print("   This should not be possible due to unique constraint.")
        elif len(welcome_aboard) == 1:
            print(f"\n✅ Found exactly 1 achievement with code 'welcome_aboard'")
            ach = welcome_aboard[0]
            print(f"   ID: {ach.id}, Category: {ach.category}, Points: {ach.points}")
        else:
            print(f"\n❌ No achievement found with code 'welcome_aboard'")
        
        # Check for similar names
        similar_names = db.query(Achievement).filter(
            Achievement.name == "Welcome Aboard!"
        ).all()
        
        if len(similar_names) > 1:
            print(f"\n⚠️  WARNING: Found {len(similar_names)} achievements with name 'Welcome Aboard!'")
            print("   These might have different codes:")
            for ach in similar_names:
                print(f"      Code: {ach.code}, ID: {ach.id}, Category: {ach.category}, Points: {ach.points}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_duplicates()
