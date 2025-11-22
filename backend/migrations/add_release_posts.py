#!/usr/bin/env python3
"""
Migration: Add Release Posts table for admin-managed release content
"""

import sqlite3
import os

def migrate():
    """Add the release_posts table"""
    
    # Get database path
    db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "trackflow.db")
    
    print(f"🗃️ Connecting to database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create the release_posts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS release_posts (
                id INTEGER PRIMARY KEY,
                post_type TEXT NOT NULL,
                title TEXT NOT NULL,
                subtitle TEXT,
                description TEXT,
                cover_image_url TEXT,
                banner_image_url TEXT,
                author_id INTEGER NOT NULL,
                is_published BOOLEAN NOT NULL DEFAULT 0,
                is_featured BOOLEAN NOT NULL DEFAULT 0,
                published_at DATETIME,
                pack_id INTEGER,
                linked_song_ids TEXT,
                slug TEXT UNIQUE,
                tags TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (author_id) REFERENCES users (id),
                FOREIGN KEY (pack_id) REFERENCES packs (id)
            )
        ''')
        
        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_release_post_published ON release_posts (is_published, published_at)",
            "CREATE INDEX IF NOT EXISTS idx_release_post_featured ON release_posts (is_featured, published_at)", 
            "CREATE INDEX IF NOT EXISTS idx_release_post_type ON release_posts (post_type, published_at)",
            "CREATE INDEX IF NOT EXISTS idx_release_post_author ON release_posts (author_id)",
            "CREATE INDEX IF NOT EXISTS idx_release_post_pack ON release_posts (pack_id)",
            "CREATE INDEX IF NOT EXISTS idx_release_post_slug ON release_posts (slug)",
            "CREATE INDEX IF NOT EXISTS idx_release_post_created ON release_posts (created_at)"
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        # Commit the transaction
        conn.commit()
        
        print("✅ Release posts table created successfully")
        print("✅ Indexes created successfully")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()