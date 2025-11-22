#!/usr/bin/env python3
"""
Script to update achievements:
1. Remove all "report x bugs" achievements
2. Consolidate duplicate release achievements
3. Add new priority-related achievements
"""

from sqlalchemy.orm import Session
from database import engine, get_db
from sqlalchemy import text

def update_achievements():
    """Update the achievements system with better achievements."""
    
    print("🔄 Updating achievements system...")
    
    with next(get_db()) as db:
        
        # 1. Remove all bug report achievements
        print("\n🗑️ Removing bug report achievements...")
        bug_achievements = db.execute(text("""
            SELECT id, code, name FROM achievements 
            WHERE code LIKE '%bug%' OR name LIKE '%bug%' OR description LIKE '%bug%'
        """)).fetchall()
        
        if bug_achievements:
            for achievement_id, code, name in bug_achievements:
                print(f"   Removing: {code} - {name}")
                
                # Remove user achievements first (foreign key constraint)
                db.execute(text("""
                    DELETE FROM user_achievements WHERE achievement_id = :achievement_id
                """), {"achievement_id": achievement_id})
                
                # Remove the achievement
                db.execute(text("""
                    DELETE FROM achievements WHERE id = :achievement_id
                """), {"achievement_id": achievement_id})
        
        # 2. Check for duplicate release achievements and remove one
        print("\n🔄 Checking for duplicate release achievements...")
        release_achievements = db.execute(text("""
            SELECT id, code, name, description FROM achievements 
            WHERE (code LIKE '%first%release%' OR code LIKE '%first%wip%') 
            AND (name LIKE '%first%' AND (name LIKE '%release%' OR name LIKE '%WIP%'))
        """)).fetchall()
        
        if len(release_achievements) > 1:
            print(f"   Found {len(release_achievements)} similar release achievements:")
            for achievement_id, code, name, desc in release_achievements:
                print(f"     - {code}: {name}")
            
            # Keep the "first_release" one, remove others
            for achievement_id, code, name, desc in release_achievements:
                if 'wip' in code.lower() and 'first' in code.lower():
                    print(f"   Removing duplicate: {code} - {name}")
                    
                    # Remove user achievements first
                    user_count = db.execute(text("""
                        SELECT COUNT(*) FROM user_achievements WHERE achievement_id = :achievement_id
                    """), {"achievement_id": achievement_id}).scalar()
                    
                    if user_count > 0:
                        print(f"     (Had {user_count} users with this achievement)")
                        # Transfer to first_release achievement if it exists
                        first_release = db.execute(text("""
                            SELECT id FROM achievements WHERE code = 'first_release'
                        """)).fetchone()
                        
                        if first_release:
                            # Move user achievements to the main release achievement
                            db.execute(text("""
                                UPDATE user_achievements 
                                SET achievement_id = :new_id 
                                WHERE achievement_id = :old_id
                                AND NOT EXISTS (
                                    SELECT 1 FROM user_achievements ua2 
                                    WHERE ua2.user_id = user_achievements.user_id 
                                    AND ua2.achievement_id = :new_id
                                )
                            """), {"new_id": first_release[0], "old_id": achievement_id})
                            
                            # Remove any remaining duplicates
                            db.execute(text("""
                                DELETE FROM user_achievements WHERE achievement_id = :achievement_id
                            """), {"achievement_id": achievement_id})
                    
                    # Remove the duplicate achievement
                    db.execute(text("""
                        DELETE FROM achievements WHERE id = :achievement_id
                    """), {"achievement_id": achievement_id})
        
        # 3. Add new priority-related achievements
        print("\n➕ Adding new priority-related achievements...")
        
        new_achievements = [
            {
                "code": "priority_setter",
                "name": "Priority Setter",
                "description": "Set priority on your first pack to help organize your workflow",
                "icon": "📋",
                "category": "organization",
                "points": 15,
                "rarity": "common"
            },
            {
                "code": "high_priority_user",
                "name": "High Priority User", 
                "description": "Set 5 packs to High or Urgent priority",
                "icon": "⚡",
                "category": "organization",
                "points": 25,
                "rarity": "uncommon"
            },
            {
                "code": "pack_organizer",
                "name": "Pack Organizer",
                "description": "Use all 5 priority levels (Someday, Low, Medium, High, Urgent)",
                "icon": "📊",
                "category": "organization", 
                "points": 50,
                "rarity": "rare"
            },
            {
                "code": "workflow_master",
                "name": "Workflow Master",
                "description": "Have 10 or more packs with different priority levels set",
                "icon": "🎯",
                "category": "organization",
                "points": 75,
                "rarity": "epic"
            }
        ]
        
        for ach in new_achievements:
            # Check if achievement already exists
            existing = db.execute(text("""
                SELECT id FROM achievements WHERE code = :code
            """), {"code": ach["code"]}).fetchone()
            
            if not existing:
                db.execute(text("""
                    INSERT INTO achievements (code, name, description, icon, category, points, rarity, created_at)
                    VALUES (:code, :name, :description, :icon, :category, :points, :rarity, datetime('now'))
                """), ach)
                print(f"   Added: {ach['code']} - {ach['name']} ({ach['points']} points)")
            else:
                print(f"   Skipped: {ach['code']} - already exists")
        
        # Commit all changes
        db.commit()
        print("\n✅ Achievement updates completed!")
        
        # Show final summary
        total_achievements = db.execute(text("""
            SELECT COUNT(*) FROM achievements
        """)).scalar()
        
        by_category = db.execute(text("""
            SELECT category, COUNT(*) as count
            FROM achievements 
            GROUP BY category
            ORDER BY count DESC
        """)).fetchall()
        
        print(f"\n📊 Achievement Summary:")
        print(f"   Total achievements: {total_achievements}")
        print(f"   By category:")
        for category, count in by_category:
            print(f"     - {category}: {count}")

if __name__ == "__main__":
    try:
        update_achievements()
    except Exception as e:
        print(f"❌ Error updating achievements: {e}")
        import traceback
        traceback.print_exc()