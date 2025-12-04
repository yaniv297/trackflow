#!/usr/bin/env python3
"""
Script to fix points correctly - only counting TrackFlow releases 
(songs with released_at timestamp) + achievement points.
"""

import sqlite3
from sqlalchemy.orm import Session
from database import engine, get_db
from sqlalchemy import text

def fix_points_trackflow_only():
    """Fix points to only count achievement points + TrackFlow releases (with released_at)."""
    
    print("🔄 Fixing points: achievements + TrackFlow releases only...")
    
    with next(get_db()) as db:
        # Get all users with achievements or TrackFlow releases
        users_to_fix = db.execute(text("""
            SELECT DISTINCT u.id as user_id, u.username
            FROM users u
            LEFT JOIN user_achievements ua ON u.id = ua.user_id
            LEFT JOIN songs s ON u.id = s.user_id AND s.status = 'Released' AND s.released_at IS NOT NULL
            WHERE ua.id IS NOT NULL OR s.id IS NOT NULL
            ORDER BY u.id
        """)).fetchall()
        
        if not users_to_fix:
            print("ℹ️ No users found with achievements or TrackFlow releases")
            return
            
        print(f"📊 Found {len(users_to_fix)} users to fix")
        
        updated_count = 0
        
        for user_id, username in users_to_fix:
            # Calculate achievement points
            achievement_result = db.execute(text("""
                SELECT COALESCE(SUM(a.points), 0) as achievement_points
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = :user_id
            """), {"user_id": user_id}).fetchone()
            
            achievement_points = achievement_result[0] if achievement_result else 0
            
            # Calculate TrackFlow releases count (only songs with released_at timestamp)
            trackflow_result = db.execute(text("""
                SELECT COUNT(*) as trackflow_count
                FROM songs 
                WHERE user_id = :user_id 
                  AND status = 'Released' 
                  AND released_at IS NOT NULL
            """), {"user_id": user_id}).fetchone()
            
            trackflow_count = trackflow_result[0] if trackflow_result else 0
            release_points = trackflow_count * 10
            
            # Total points = achievement points + TrackFlow release points
            total_points = achievement_points + release_points
            
            # Update the user_stats table with the calculated points
            db.execute(text("""
                UPDATE user_stats 
                SET total_points = :total_points, updated_at = datetime('now')
                WHERE user_id = :user_id
            """), {"total_points": total_points, "user_id": user_id})
            
            print(f"📊 User {user_id} ({username}):")
            print(f"   Achievement points: {achievement_points}")
            print(f"   TrackFlow releases: {trackflow_count} × 10 = {release_points}")
            print(f"   Total: {total_points}")
            updated_count += 1
        
        # Commit all changes
        db.commit()
        print(f"\n✅ Points fixed! Updated {updated_count} users")

if __name__ == "__main__":
    try:
        fix_points_trackflow_only()
    except Exception as e:
        print(f"❌ Error during points fix: {e}")
        import traceback
        traceback.print_exc()