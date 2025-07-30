#!/usr/bin/env python3

import sqlite3
import os

def create_song_pack_collaborations():
    """Create new table for song-level pack collaborations"""
    
    # Connect to the database
    db_path = "songs.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Creating song_pack_collaborations table...")
    
    # Create the new table
    cursor.execute("""
        CREATE TABLE song_pack_collaborations (
            id INTEGER NOT NULL,
            pack_id INTEGER NOT NULL,
            song_id INTEGER NOT NULL,
            owner_id INTEGER NOT NULL,
            collaborator_id INTEGER NOT NULL,
            can_edit BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            CONSTRAINT unique_song_pack_collaborator UNIQUE (pack_id, song_id, collaborator_id),
            FOREIGN KEY (pack_id) REFERENCES packs (id) ON DELETE CASCADE,
            FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
            FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (collaborator_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX ix_song_pack_collaborations_pack_id ON song_pack_collaborations (pack_id)")
    cursor.execute("CREATE INDEX ix_song_pack_collaborations_song_id ON song_pack_collaborations (song_id)")
    cursor.execute("CREATE INDEX ix_song_pack_collaborations_collaborator_id ON song_pack_collaborations (collaborator_id)")
    
    # Commit the changes
    conn.commit()
    
    # Verify the results
    cursor.execute("PRAGMA table_info(song_pack_collaborations)")
    schema = cursor.fetchall()
    print("\nNew table schema:")
    for row in schema:
        print(f"  {row[1]} {row[2]} {'NOT NULL' if row[3] else 'NULL'}")
    
    conn.close()
    print("\nMigration completed!")

if __name__ == "__main__":
    create_song_pack_collaborations() 