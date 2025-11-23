"""
Migration: Add release metadata fields to songs and packs tables

This migration adds:
1. release_description column to songs table 
2. release_download_link column to songs table
3. release_youtube_url column to songs table
4. release_description column to packs table
5. release_download_link column to packs table
6. release_youtube_url column to packs table
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
            # Check and add release metadata columns to songs table
            cursor.execute("PRAGMA table_info(songs)")
            song_columns = [column[1] for column in cursor.fetchall()]
            
            if 'release_description' not in song_columns:
                print("🔄 Adding release_description column to songs table...")
                cursor.execute("ALTER TABLE songs ADD COLUMN release_description TEXT")
                print("✅ Added release_description column to songs")
            else:
                print("ℹ️ release_description column already exists in songs table")
                
            if 'release_download_link' not in song_columns:
                print("🔄 Adding release_download_link column to songs table...")
                cursor.execute("ALTER TABLE songs ADD COLUMN release_download_link TEXT")
                print("✅ Added release_download_link column to songs")
            else:
                print("ℹ️ release_download_link column already exists in songs table")
                
            if 'release_youtube_url' not in song_columns:
                print("🔄 Adding release_youtube_url column to songs table...")
                cursor.execute("ALTER TABLE songs ADD COLUMN release_youtube_url TEXT")
                print("✅ Added release_youtube_url column to songs")
            else:
                print("ℹ️ release_youtube_url column already exists in songs table")
            
            # Check and add release metadata columns to packs table
            cursor.execute("PRAGMA table_info(packs)")
            pack_columns = [column[1] for column in cursor.fetchall()]
            
            if 'release_description' not in pack_columns:
                print("🔄 Adding release_description column to packs table...")
                cursor.execute("ALTER TABLE packs ADD COLUMN release_description TEXT")
                print("✅ Added release_description column to packs")
            else:
                print("ℹ️ release_description column already exists in packs table")
                
            if 'release_download_link' not in pack_columns:
                print("🔄 Adding release_download_link column to packs table...")
                cursor.execute("ALTER TABLE packs ADD COLUMN release_download_link TEXT")
                print("✅ Added release_download_link column to packs")
            else:
                print("ℹ️ release_download_link column already exists in packs table")
                
            if 'release_youtube_url' not in pack_columns:
                print("🔄 Adding release_youtube_url column to packs table...")
                cursor.execute("ALTER TABLE packs ADD COLUMN release_youtube_url TEXT")
                print("✅ Added release_youtube_url column to packs")
            else:
                print("ℹ️ release_youtube_url column already exists in packs table")
                
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