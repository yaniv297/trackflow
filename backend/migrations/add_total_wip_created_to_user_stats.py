"""
Migration: Add total_wip_created column to user_stats

This migration:
1. Adds the total_wip_created column to user_stats table 
2. Populates it with estimated values for existing users based on current + released songs
"""

import sqlite3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy import text
from database import engine, get_db

def run_migration():
    """Add total_wip_created column and populate with estimated data"""
    
    # Add the column using raw SQL (SQLAlchemy doesn't handle this well for existing tables)
    connection = sqlite3.connect("songs.db")  # Updated database file name
    cursor = connection.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(user_stats)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'total_wip_created' not in columns:
            print("🔄 Adding total_wip_created column to user_stats table...")
            cursor.execute("ALTER TABLE user_stats ADD COLUMN total_wip_created INTEGER DEFAULT 0")
            connection.commit()
            print("✅ Added total_wip_created column")
        else:
            print("ℹ️ total_wip_created column already exists")
        
        # Now populate the column with estimated values using SQLAlchemy
        print("🔄 Estimating total_wip_created for existing users...")
        
        with next(get_db()) as db:
            # Get all user IDs that have user_stats records
            user_stats = db.execute(text("SELECT user_id FROM user_stats")).fetchall()
            
            for (user_id,) in user_stats:
                # Estimate total WIP creations based on current WIP + released songs
                # Conservative estimate: current WIP + 60% of released songs were probably WIP at some point
                result = db.execute(text("""
                    SELECT 
                        COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) as current_wip,
                        COALESCE(SUM(CASE WHEN status = 'Released' THEN 1 ELSE 0 END), 0) as released_count
                    FROM songs 
                    WHERE user_id = :user_id
                """), {"user_id": user_id}).fetchone()
                
                current_wip = result[0] if result else 0
                released_count = result[1] if result else 0
                
                # Conservative estimate: current WIP + 60% of released songs
                estimated_wip_created = current_wip + int(released_count * 0.6)
                
                # Update the estimated value
                db.execute(text("""
                    UPDATE user_stats 
                    SET total_wip_created = :estimated_wip_created
                    WHERE user_id = :user_id
                """), {"estimated_wip_created": estimated_wip_created, "user_id": user_id})
                
                print(f"🎯 User {user_id}: Estimated {estimated_wip_created} total WIP creations (current: {current_wip}, released: {released_count})")
            
            db.commit()
            print("✅ Populated total_wip_created estimates for all existing users")
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()