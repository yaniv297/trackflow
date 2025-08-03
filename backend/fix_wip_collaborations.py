#!/usr/bin/env python3
import sqlite3
import os

def fix_wip_collaborations():
    """Fix the WipCollaboration table structure."""
    db_path = "./songs.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='wip_collaborations'")
        if not cursor.fetchone():
            print("✅ wip_collaborations table doesn't exist, will be created with correct structure")
            return True
        
        # Check current structure
        cursor.execute("PRAGMA table_info(wip_collaborations)")
        columns = {column[1]: column[2] for column in cursor.fetchall()}
        
        print(f"Current wip_collaborations columns: {columns}")
        
        # Check if we need to fix the structure
        needs_fix = 'collaborator_id' in columns and 'collaborator' not in columns
        
        if needs_fix:
            print("🔧 Fixing wip_collaborations table structure...")
            
            # Create new table with correct structure
            cursor.execute("""
                CREATE TABLE wip_collaborations_new (
                    id INTEGER PRIMARY KEY,
                    song_id INTEGER NOT NULL,
                    collaborator VARCHAR NOT NULL,
                    field VARCHAR NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (song_id) REFERENCES songs (id)
                )
            """)
            
            # Migrate data if any exists (convert collaborator_id to username)
            cursor.execute("SELECT COUNT(*) FROM wip_collaborations")
            count = cursor.fetchone()[0]
            
            if count > 0:
                print(f"📦 Migrating {count} existing records...")
                
                # Get existing data with user lookup
                cursor.execute("""
                    SELECT wc.id, wc.song_id, u.username, wc.field, wc.created_at
                    FROM wip_collaborations wc
                    LEFT JOIN users u ON wc.collaborator_id = u.id
                """)
                
                rows = cursor.fetchall()
                
                # Insert into new table
                for row in rows:
                    cursor.execute("""
                        INSERT INTO wip_collaborations_new (id, song_id, collaborator, field, created_at)
                        VALUES (?, ?, ?, ?, ?)
                    """, (row[0], row[1], row[2] or f"user_{row[0]}", row[3], row[4]))
                
                print(f"✅ Migrated {len(rows)} records")
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE wip_collaborations")
            cursor.execute("ALTER TABLE wip_collaborations_new RENAME TO wip_collaborations")
            
            conn.commit()
            print("✅ wip_collaborations table structure fixed!")
        else:
            print("✅ wip_collaborations table structure is already correct")
        
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("🔧 Fixing WipCollaboration table structure...")
    success = fix_wip_collaborations()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("💥 Migration failed!") 