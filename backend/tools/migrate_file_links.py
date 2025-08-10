#!/usr/bin/env python3
"""
Migration script to add file_links table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from sqlalchemy import text

def migrate_file_links():
    """Add file_links table to database"""
    
    # SQL to create the file_links table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS file_links (
        id SERIAL PRIMARY KEY,
        song_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        file_url VARCHAR NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """
    
    # Create indexes for better performance
    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS idx_filelink_song_id ON file_links(song_id);",
        "CREATE INDEX IF NOT EXISTS idx_filelink_user_id ON file_links(user_id);",
        "CREATE INDEX IF NOT EXISTS idx_filelink_created_at ON file_links(created_at);",
        "CREATE INDEX IF NOT EXISTS idx_filelink_song_created ON file_links(song_id, created_at);"
    ]
    
    try:
        with engine.connect() as conn:
            print("Creating file_links table...")
            conn.execute(text(create_table_sql))
            
            print("Creating indexes...")
            for index_sql in create_indexes_sql:
                conn.execute(text(index_sql))
            
            conn.commit()
            print("✅ file_links table and indexes created successfully!")
            
    except Exception as e:
        print(f"❌ Error creating file_links table: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Starting file_links table migration...")
    success = migrate_file_links()
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        sys.exit(1) 