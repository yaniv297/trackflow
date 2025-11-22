#!/usr/bin/env python3
"""
Script to refine achievements:
1. Add back just one simple bug achievement: "Report 1 bug"
2. Remove 2 of the priority achievements, keep just 2
"""

from sqlalchemy.orm import Session
from database import engine, get_db
from sqlalchemy import text

def refine_achievements():
    """Refine the achievements - add simple bug achievement, reduce priority achievements."""
    
    print("🔄 Refining achievements system...")
    
    with next(get_db()) as db:
        
        # 1. Add back one simple bug achievement
        print("\n➕ Adding simple bug report achievement...")
        
        bug_achievement = {
            "code": "bug_reporter",
            "name": "Bug Reporter",
            "description": "Report your first bug to help improve TrackFlow",
            "icon": "🐛",
            "category": "quality",
            "points": 20,
            "rarity": "common"
        }
        
        # Check if achievement already exists
        existing = db.execute(text("""
            SELECT id FROM achievements WHERE code = :code
        """), {"code": bug_achievement["code"]}).fetchone()
        
        if not existing:
            db.execute(text("""
                INSERT INTO achievements (code, name, description, icon, category, points, rarity, created_at)
                VALUES (:code, :name, :description, :icon, :category, :points, :rarity, datetime('now'))
            """), bug_achievement)
            print(f"   Added: {bug_achievement['code']} - {bug_achievement['name']} ({bug_achievement['points']} points)")
        else:
            print(f"   Already exists: {bug_achievement['code']}")
        
        # 2. Remove 2 priority achievements, keep the simple ones
        print("\n🗑️ Removing excess priority achievements...")
        
        # Keep: priority_setter and pack_organizer
        # Remove: high_priority_user and workflow_master
        achievements_to_remove = ["high_priority_user", "workflow_master"]
        
        for code in achievements_to_remove:
            achievement = db.execute(text("""
                SELECT id, name FROM achievements WHERE code = :code
            """), {"code": code}).fetchone()
            
            if achievement:
                achievement_id, name = achievement
                print(f"   Removing: {code} - {name}")
                
                # Remove user achievements first (foreign key constraint)
                user_count = db.execute(text("""
                    SELECT COUNT(*) FROM user_achievements WHERE achievement_id = :achievement_id
                """), {"achievement_id": achievement_id}).scalar()
                
                if user_count > 0:
                    print(f"     (Had {user_count} users with this achievement)")
                    db.execute(text("""
                        DELETE FROM user_achievements WHERE achievement_id = :achievement_id
                    """), {"achievement_id": achievement_id})
                
                # Remove the achievement
                db.execute(text("""
                    DELETE FROM achievements WHERE id = :achievement_id
                """), {"achievement_id": achievement_id})
            else:
                print(f"   Not found: {code}")
        
        # Commit all changes
        db.commit()
        print("\n✅ Achievement refinements completed!")
        
        # Show final summary
        total_achievements = db.execute(text("""
            SELECT COUNT(*) FROM achievements
        """)).scalar()
        
        # Show the organization category specifically
        organization_achievements = db.execute(text("""
            SELECT code, name, points FROM achievements 
            WHERE category = 'organization'
            ORDER BY points
        """)).fetchall()
        
        print(f"\n📊 Achievement Summary:")
        print(f"   Total achievements: {total_achievements}")
        print(f"\n📋 Organization achievements (priority-related):")
        for code, name, points in organization_achievements:
            print(f"     - {name} ({points} pts) - {code}")
        
        # Show bug-related achievements
        bug_achievements = db.execute(text("""
            SELECT code, name, points FROM achievements 
            WHERE category = 'quality' AND (code LIKE '%bug%' OR name LIKE '%bug%')
            ORDER BY points
        """)).fetchall()
        
        print(f"\n🐛 Bug-related achievements:")
        for code, name, points in bug_achievements:
            print(f"     - {name} ({points} pts) - {code}")

if __name__ == "__main__":
    try:
        refine_achievements()
    except Exception as e:
        print(f"❌ Error refining achievements: {e}")
        import traceback
        traceback.print_exc()