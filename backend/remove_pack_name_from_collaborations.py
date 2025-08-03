#!/usr/bin/env python3

import sqlite3
import os

def remove_pack_name_from_collaborations():
    """Remove pack_name field from pack_collaborations table and update constraints"""
    
    # Connect to the database
    db_path = "songs.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("Removing pack_name field from pack_collaborations table...")
    
    # Create a new table with the correct structure
    cursor.execute("""
        CREATE TABLE pack_collaborations_new (
            id INTEGER NOT NULL,
            pack_id INTEGER NOT NULL,
            owner_id INTEGER NOT NULL,
            collaborator_id INTEGER NOT NULL,
            created_at DATETIME,
            PRIMARY KEY (id),
            CONSTRAINT unique_pack_collaborator UNIQUE (pack_id, collaborator_id),
            FOREIGN KEY (pack_id) REFERENCES packs (id) ON DELETE CASCADE,
            FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (collaborator_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    
    # Copy data from old table to new table
    cursor.execute("""
        INSERT INTO pack_collaborations_new (id, pack_id, owner_id, collaborator_id, created_at)
        SELECT id, pack_id, owner_id, collaborator_id, created_at
        FROM pack_collaborations
        WHERE pack_id IS NOT NULL
    """)
    
    # Drop the old table
    cursor.execute("DROP TABLE pack_collaborations")
    
    # Rename the new table to the original name
    cursor.execute("ALTER TABLE pack_collaborations_new RENAME TO pack_collaborations")
    
    # Create indexes
    cursor.execute("CREATE INDEX ix_pack_collaborations_pack_id ON pack_collaborations (pack_id)")
    cursor.execute("CREATE INDEX ix_pack_collaborations_id ON pack_collaborations (id)")
    
    # Commit the changes
    conn.commit()
    
    # Verify the results
    cursor.execute("PRAGMA table_info(pack_collaborations)")
    schema = cursor.fetchall()
    print("\nNew table schema:")
    for row in schema:
        print(f"  {row[1]} {row[2]} {'NOT NULL' if row[3] else 'NULL'}")
    
    cursor.execute("SELECT COUNT(*) FROM pack_collaborations")
    count = cursor.fetchone()[0]
    print(f"\nTotal collaborations after migration: {count}")
    
    conn.close()
    print("\nMigration completed!")

if __name__ == "__main__":
    remove_pack_name_from_collaborations() 