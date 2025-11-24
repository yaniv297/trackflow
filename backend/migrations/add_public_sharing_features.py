"""
Migration: Add public sharing features

This migration:
1. Adds default_public_sharing column to users table
2. Adds is_public column to songs table  
3. Creates collaboration_requests table
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
    """Add public sharing features to the database"""
    
    # Add the columns using raw SQL (SQLAlchemy doesn't handle this well for existing tables)
    # Connect to the songs.db database file in the backend directory
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "songs.db")
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()
    
    try:
        # Check if user default_public_sharing column already exists
        cursor.execute("PRAGMA table_info(users)")
        user_columns = [column[1] for column in cursor.fetchall()]
        
        if 'default_public_sharing' not in user_columns:
            print("🔄 Adding default_public_sharing column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN default_public_sharing BOOLEAN DEFAULT 0")
            connection.commit()
            print("✅ Added default_public_sharing column to users")
        else:
            print("ℹ️ default_public_sharing column already exists in users")
            
        # Check if song is_public column already exists
        cursor.execute("PRAGMA table_info(songs)")
        song_columns = [column[1] for column in cursor.fetchall()]
        
        if 'is_public' not in song_columns:
            print("🔄 Adding is_public column to songs table...")
            cursor.execute("ALTER TABLE songs ADD COLUMN is_public BOOLEAN DEFAULT 0")
            connection.commit()
            print("✅ Added is_public column to songs")
        else:
            print("ℹ️ is_public column already exists in songs")
            
        # Check if collaboration_requests table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='collaboration_requests'")
        table_exists = cursor.fetchone() is not None
        
        if not table_exists:
            print("🔄 Creating collaboration_requests table...")
            cursor.execute("""
                CREATE TABLE collaboration_requests (
                    id INTEGER PRIMARY KEY,
                    song_id INTEGER NOT NULL,
                    requester_id INTEGER NOT NULL,
                    owner_id INTEGER NOT NULL,
                    message TEXT NOT NULL,
                    requested_parts TEXT,
                    status VARCHAR DEFAULT 'pending',
                    owner_response TEXT,
                    assigned_parts TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    responded_at DATETIME,
                    FOREIGN KEY (song_id) REFERENCES songs (id),
                    FOREIGN KEY (requester_id) REFERENCES users (id),
                    FOREIGN KEY (owner_id) REFERENCES users (id),
                    UNIQUE (song_id, requester_id)
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX idx_collab_req_song ON collaboration_requests (song_id)")
            cursor.execute("CREATE INDEX idx_collab_req_requester ON collaboration_requests (requester_id)")
            cursor.execute("CREATE INDEX idx_collab_req_owner ON collaboration_requests (owner_id)")
            cursor.execute("CREATE INDEX idx_collab_req_status ON collaboration_requests (status)")
            cursor.execute("CREATE INDEX idx_collab_req_created ON collaboration_requests (created_at)")
            cursor.execute("CREATE INDEX idx_songs_is_public ON songs (is_public)")
            
            connection.commit()
            print("✅ Created collaboration_requests table with indexes")
        else:
            print("ℹ️ collaboration_requests table already exists")
            
        print("✅ Public sharing migration completed successfully")
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        connection.rollback()
        raise
    finally:
        connection.close()

if __name__ == "__main__":
    run_migration()