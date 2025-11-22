"""
Migration: Add total_points column to user_stats and populate with existing data

This migration:
1. Adds the total_points column to user_stats table 
2. Populates it with calculated values for existing users
"""

import sqlite3
from sqlalchemy.orm import Session
from database import engine, get_db

def run_migration():
    """Add total_points column and populate with existing data"""
    
    # Add the column using raw SQL (SQLAlchemy doesn't handle this well for existing tables)
    connection = sqlite3.connect("database.db")
    cursor = connection.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(user_stats)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'total_points' not in columns:
            print("🔄 Adding total_points column to user_stats table...")
            cursor.execute("ALTER TABLE user_stats ADD COLUMN total_points INTEGER DEFAULT 0")
            connection.commit()
            print("✅ Added total_points column")
        else:
            print("ℹ️ total_points column already exists")
        
        # Now populate the column with calculated values using SQLAlchemy
        print("🔄 Populating total_points for existing users...")
        
        with next(get_db()) as db:
            # Get all user IDs that have user_stats records
            user_stats = db.execute("SELECT user_id FROM user_stats").fetchall()
            
            for (user_id,) in user_stats:
                # Calculate total points for this user
                result = db.execute("""
                    SELECT COALESCE(SUM(a.points), 0) as total_points
                    FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.user_id = ?
                """, (user_id,)).fetchone()
                
                total_points = result[0] if result else 0
                
                # Update the cached value
                db.execute("""
                    UPDATE user_stats 
                    SET total_points = ?
                    WHERE user_id = ?
                """, (total_points, user_id))
                
                print(f"📊 User {user_id}: {total_points} points")
            
            db.commit()
            print("✅ Populated total_points for all existing users")
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()