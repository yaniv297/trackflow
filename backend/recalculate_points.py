#!/usr/bin/env python3
"""
Script to recalculate total_points for all users based on their existing achievements.
This should be run after adding the total_points column to ensure correct values.
"""

import sqlite3
from sqlalchemy.orm import Session
from database import engine, get_db
from sqlalchemy import text

def recalculate_all_user_points():
    """Recalculate total_points for all users based on their achievements."""
    
    print("🔄 Starting total_points recalculation for all users...")
    
    with next(get_db()) as db:
        # Get all users who have user_stats records
        users_with_stats = db.execute(text("""
            SELECT user_id FROM user_stats
        """)).fetchall()
        
        if not users_with_stats:
            print("ℹ️ No users found with user_stats records")
            return
            
        print(f"📊 Found {len(users_with_stats)} users with stats records")
        
        updated_count = 0
        for (user_id,) in users_with_stats:
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
                SET total_points = :total_points
                WHERE user_id = :user_id
            """), {"total_points": total_points, "user_id": user_id})
            
            if total_points > 0:
                print(f"📊 User {user_id}: {total_points} points")
                updated_count += 1
            else:
                print(f"📊 User {user_id}: 0 points (no achievements)")
        
        # Commit all changes
        db.commit()
        print(f"✅ Total points recalculation completed!")
        print(f"📈 Updated {updated_count} users with non-zero points")
        
        # Show summary statistics
        stats = db.execute(text("""
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN total_points > 0 THEN 1 END) as users_with_points,
                MAX(total_points) as max_points,
                AVG(total_points) as avg_points
            FROM user_stats
        """)).fetchone()
        
        if stats:
            total_users, users_with_points, max_points, avg_points = stats
            print(f"\n📈 Summary:")
            print(f"   Total users: {total_users}")
            print(f"   Users with points: {users_with_points}")
            print(f"   Highest points: {max_points}")
            print(f"   Average points: {avg_points:.1f}")

if __name__ == "__main__":
    try:
        recalculate_all_user_points()
    except Exception as e:
        print(f"❌ Error during recalculation: {e}")
        import traceback
        traceback.print_exc()