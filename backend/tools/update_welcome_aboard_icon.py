#!/usr/bin/env python3
"""
Script to update the Welcome Aboard achievement icon to a more intuitive emoji.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Achievement

def update_icon():
    """Update Welcome Aboard achievement icon."""
    db = SessionLocal()
    try:
        print("🔧 Updating Welcome Aboard achievement icon...")
        
        welcome_achievement = db.query(Achievement).filter(Achievement.code == "welcome_aboard").first()
        
        if not welcome_achievement:
            print("❌ Welcome Aboard achievement not found!")
            return
        
        old_icon = welcome_achievement.icon
        welcome_achievement.icon = "👋"  # Waving hand - more intuitive for "Welcome"
        
        db.commit()
        
        print(f"✅ Updated icon:")
        print(f"   {old_icon} → {welcome_achievement.icon}")
        print("\n✨ Done!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_icon()
