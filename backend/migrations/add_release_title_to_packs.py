"""
Migration: Add release_title column to packs table

This migration adds:
- release_title column to packs table (nullable String field for the release post title)
"""

import sqlite3
import sys
import os
from datetime import datetime

# Add the parent directory to the path to import database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import engine, get_db
except ImportError:
    print("❌ Could not import database module. Make sure you're running from the backend directory.")
    sys.exit(1)

def main():
    # Get the database URL from the engine
    db_url = str(engine.url)
    
    if db_url.startswith('sqlite'):
        # Extract the database file path
        db_path = db_url.replace('sqlite:///', '')
        
        print(f"🔄 Connecting to database: {db_path}")
        
        # Connect to SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            # Check and add release_title column to packs table
            cursor.execute("PRAGMA table_info(packs)")
            pack_columns = [column[1] for column in cursor.fetchall()]
            
            if 'release_title' not in pack_columns:
                print("🔄 Adding release_title column to packs table...")
                cursor.execute("ALTER TABLE packs ADD COLUMN release_title TEXT")
                print("✅ Added release_title column to packs")
            else:
                print("ℹ️ release_title column already exists in packs table")
                
            # Commit the changes
            conn.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
        
        return True
    else:
        print(f"❌ Unsupported database type: {db_url}")
        return False

if __name__ == "__main__":
    main()

