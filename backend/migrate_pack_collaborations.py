#!/usr/bin/env python3
"""
Migration script to add pack_collaborations table
"""

import sqlite3
import os
from pathlib import Path

def migrate_pack_collaborations():
    """Add pack_collaborations table to the database"""
    
    # Get the database path
    db_path = Path(__file__).parent / "songs.db"
    
    if not db_path.exists():
        print(f"Database file not found at {db_path}")
        return
    
    print(f"Migrating database at {db_path}")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if the table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='pack_collaborations'
        """)
        
        if cursor.fetchone():
            print("✅ pack_collaborations table already exists")
            return
        
        # Create the pack_collaborations table
        cursor.execute("""
            CREATE TABLE pack_collaborations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pack_name VARCHAR NOT NULL,
                owner_id INTEGER NOT NULL,
                collaborator_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (collaborator_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE (pack_name, collaborator_id)
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX ix_pack_collaborations_id ON pack_collaborations (id)")
        cursor.execute("CREATE INDEX ix_pack_collaborations_pack_name ON pack_collaborations (pack_name)")
        cursor.execute("CREATE INDEX ix_pack_collaborations_owner_id ON pack_collaborations (owner_id)")
        cursor.execute("CREATE INDEX ix_pack_collaborations_collaborator_id ON pack_collaborations (collaborator_id)")
        
        # Commit the changes
        conn.commit()
        print("✅ pack_collaborations table created successfully")
        
    except Exception as e:
        print(f"❌ Error creating pack_collaborations table: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_pack_collaborations() 