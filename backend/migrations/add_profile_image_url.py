"""
Migration: Add profile image URL field to users

This migration:
1. Adds profile_image_url column to users table
"""

import sqlite3
import sys
import os

# Add the parent directory to the path to import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import engine, get_db
except ImportError:
    # Fallback for running standalone
    pass

def run_migration():
    """Add profile_image_url field to users table"""
    
    # Connect to the songs.db database file in the backend directory
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "songs.db")
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()
    
    try:
        print("Starting migration: Add profile image URL field to users...")
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'profile_image_url' not in column_names:
            print("Adding profile_image_url column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN profile_image_url TEXT")
            print("✓ Added profile_image_url column")
        else:
            print("✓ profile_image_url column already exists")
        
        # Commit the changes
        connection.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()