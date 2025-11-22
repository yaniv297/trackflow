"""
Migration: Add released_at field to songs and packs tables

This migration:
1. Adds the released_at column to songs table 
2. Adds the released_at column to packs table
3. Populates existing released songs/packs with current timestamp
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
    print("Note: Running without SQLAlchemy imports - using direct SQLite only")
    get_db = None

def run_migration():
    """Add released_at columns and populate with existing data"""
    
    # Add the columns using raw SQL
    connection = sqlite3.connect("songs.db")
    cursor = connection.cursor()
    
    try:
        # Check and add released_at to songs table
        cursor.execute("PRAGMA table_info(songs)")
        song_columns = [column[1] for column in cursor.fetchall()]
        
        if 'released_at' not in song_columns:
            print("🔄 Adding released_at column to songs table...")
            cursor.execute("ALTER TABLE songs ADD COLUMN released_at TIMESTAMP NULL")
            connection.commit()
            print("✅ Added released_at column to songs")
        else:
            print("ℹ️ released_at column already exists in songs table")
        
        # Check and add released_at to packs table
        cursor.execute("PRAGMA table_info(packs)")
        pack_columns = [column[1] for column in cursor.fetchall()]
        
        if 'released_at' not in pack_columns:
            print("🔄 Adding released_at column to packs table...")
            cursor.execute("ALTER TABLE packs ADD COLUMN released_at TIMESTAMP NULL")
            connection.commit()
            print("✅ Added released_at column to packs")
        else:
            print("ℹ️ released_at column already exists in packs table")
        
        # Populate existing released songs with current timestamp
        print("🔄 Populating released_at for existing released songs...")
        current_time = datetime.utcnow().isoformat()
        
        cursor.execute("""
            UPDATE songs 
            SET released_at = ?
            WHERE status = 'Released' AND released_at IS NULL
        """, (current_time,))
        
        released_songs_updated = cursor.rowcount
        print(f"📊 Updated {released_songs_updated} released songs")
        
        # Note: Not updating packs automatically since pack release status is more complex
        # and would need to be determined based on business logic
        
        connection.commit()
        print("✅ Migration completed successfully")
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()