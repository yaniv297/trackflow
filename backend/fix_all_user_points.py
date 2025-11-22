#!/usr/bin/env python3
"""
Script to fix points for ALL users - creates user_stats records if missing 
and calculates total_points based on existing achievements.
"""

import sqlite3
from sqlalchemy.orm import Session
from database import engine, get_db
from sqlalchemy import text

def fix_all_user_points():
    """Create user_stats records for all users with achievements and calculate their points."""
    
    print("🔄 Fixing total_points for ALL users with achievements...")
    
    with next(get_db()) as db:
        # First, get ALL users who have achievements
        users_with_achievements = db.execute(text("""
            SELECT DISTINCT ua.user_id, COUNT(ua.id) as achievement_count
            FROM user_achievements ua
            GROUP BY ua.user_id
            ORDER BY ua.user_id
        """)).fetchall()
        
        if not users_with_achievements:
            print("ℹ️ No users found with achievements")
            return
            
        print(f"📊 Found {len(users_with_achievements)} users with achievements")
        
        created_count = 0
        updated_count = 0
        
        for user_id, achievement_count in users_with_achievements:
            # Check if user_stats record exists
            existing_stats = db.execute(text("""
                SELECT user_id FROM user_stats WHERE user_id = :user_id
            """), {"user_id": user_id}).fetchone()
            
            if not existing_stats:
                # Create user_stats record
                db.execute(text("""
                    INSERT INTO user_stats (
                        user_id, total_songs, total_released, total_future, total_wip, 
                        total_packs, total_collaborations, total_spotify_imports, 
                        total_feature_requests, login_streak, total_points, 
                        last_login_date, updated_at
                    ) VALUES (
                        :user_id, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
                        datetime('now'), datetime('now')
                    )
                """), {"user_id": user_id})
                created_count += 1
                print(f"➕ Created user_stats for user {user_id}")
            
            # Calculate total points for this user from their achievements
            result = db.execute(text("""
                SELECT COALESCE(SUM(a.points), 0) as total_points
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = :user_id
            """), {"user_id": user_id}).fetchone()
            
            total_points = result[0] if result else 0
            
            # Update the user_stats table with the calculated points
            db.execute(text("""
                UPDATE user_stats 
                SET total_points = :total_points, updated_at = datetime('now')
                WHERE user_id = :user_id
            """), {"total_points": total_points, "user_id": user_id})
            
            print(f"📊 User {user_id}: {achievement_count} achievements = {total_points} points")
            updated_count += 1
        
        # Commit all changes
        db.commit()
        print(f"\n✅ Points calculation completed!")
        print(f"➕ Created {created_count} new user_stats records")
        print(f"📈 Updated {updated_count} users with calculated points")
        
        # Show final summary statistics
        stats = db.execute(text("""
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN total_points > 0 THEN 1 END) as users_with_points,
                MAX(total_points) as max_points,
                AVG(total_points) as avg_points,
                SUM(total_points) as total_points_all_users
            FROM user_stats
        """)).fetchone()
        
        if stats:
            total_users, users_with_points, max_points, avg_points, total_points_all = stats
            print(f"\n📈 Final Summary:")
            print(f"   Total users with stats: {total_users}")
            print(f"   Users with points: {users_with_points}")
            print(f"   Highest points: {max_points}")
            print(f"   Average points: {avg_points:.1f}")
            print(f"   Total points distributed: {total_points_all}")

        # Show top users
        top_users = db.execute(text("""
            SELECT user_id, total_points
            FROM user_stats 
            WHERE total_points > 0
            ORDER BY total_points DESC
            LIMIT 10
        """)).fetchall()
        
        if top_users:
            print(f"\n🏆 Top Users by Points:")
            for i, (user_id, points) in enumerate(top_users, 1):
                print(f"   #{i}: User {user_id} - {points} points")

if __name__ == "__main__":
    try:
        fix_all_user_points()
    except Exception as e:
        print(f"❌ Error during points fix: {e}")
        import traceback
        traceback.print_exc()