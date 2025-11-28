#!/usr/bin/env python3
"""
Update existing collaboration achievements to be two-sided
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Achievement

def update_collaboration_achievements():
    """Update existing collaboration achievements to be two-sided."""
    db = SessionLocal()
    try:
        # Mapping of achievement codes to new descriptions and metric types
        updates = {
            "first_collaboration_added": {
                "description": "Be added as a collaborator or add someone as a collaborator",
                "metric_type": "collaborations_total"
            },
            "five_collaborations_added": {
                "description": "Be involved in 5 collaborations (added or adding)",
                "metric_type": "collaborations_total"
            },
            "ten_collaborations_added": {
                "description": "Be involved in 10 collaborations (added or adding)", 
                "metric_type": "collaborations_total"
            },
            "twenty_five_collaborations_added": {
                "description": "Be involved in 25 collaborations (added or adding)",
                "metric_type": "collaborations_total"
            }
        }
        
        updated_count = 0
        for code, changes in updates.items():
            achievement = db.query(Achievement).filter(Achievement.code == code).first()
            if achievement:
                print(f"Updating {code}:")
                print(f"  Old description: {achievement.description}")
                print(f"  New description: {changes['description']}")
                print(f"  Old metric_type: {achievement.metric_type}")
                print(f"  New metric_type: {changes['metric_type']}")
                
                achievement.description = changes['description']
                achievement.metric_type = changes['metric_type']
                updated_count += 1
                print(f"  ✅ Updated")
            else:
                print(f"⚠️ Achievement {code} not found")
        
        db.commit()
        print(f"\n✅ Successfully updated {updated_count} collaboration achievements")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating achievements: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 Updating collaboration achievements...")
    update_collaboration_achievements()
    print("✨ Done!")