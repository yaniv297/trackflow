#!/usr/bin/env python3
"""Migration script to convert pack strings to proper packs table with foreign keys"""
import sqlite3
import os
from pathlib import Path
from collections import defaultdict

def migrate_to_packs_table():
    db_path = Path(__file__).parent / "songs.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔄 Starting migration to packs table...")
        
        # Step 1: Check if pack_id column exists in songs table
        cursor.execute("PRAGMA table_info(songs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'pack_id' not in columns:
            print("🎵 Adding pack_id column to songs table...")
            cursor.execute("ALTER TABLE songs ADD COLUMN pack_id INTEGER")
            cursor.execute("CREATE INDEX ix_songs_pack_id ON songs (pack_id)")
        else:
            print("✅ pack_id column already exists in songs table")
        
        # Step 2: Get all unique pack names and their owners
        print("🔍 Collecting existing pack data...")
        cursor.execute("""
            SELECT DISTINCT pack, user_id 
            FROM songs 
            WHERE pack IS NOT NULL AND pack != '' AND user_id IS NOT NULL
        """)
        pack_data = cursor.fetchall()
        
        # Group by pack name to find the most common owner (or first one)
        pack_owners = defaultdict(list)
        for pack_name, user_id in pack_data:
            if pack_name:  # Skip empty packs
                pack_owners[pack_name].append(user_id)
        
        # Step 3: Insert packs into the existing table
        print("💾 Inserting packs into table...")
        pack_id_map = {}  # Map pack_name -> pack_id
        for pack_name, user_ids in pack_owners.items():
            # Check if pack already exists
            cursor.execute("SELECT id FROM packs WHERE name = ?", (pack_name,))
            existing = cursor.fetchone()
            
            if existing:
                pack_id = existing[0]
                print(f"  Pack already exists: {pack_name} (ID: {pack_id})")
            else:
                # Use the first user_id as the owner (most common case)
                owner_id = user_ids[0]
                cursor.execute("""
                    INSERT INTO packs (name, user_id, created_at, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (pack_name, owner_id))
                pack_id = cursor.lastrowid
                print(f"  Created pack: {pack_name} (ID: {pack_id})")
            
            pack_id_map[pack_name] = pack_id
        
        # Step 4: Update songs to use pack_id
        print("🔄 Updating songs with pack_id...")
        for pack_name, pack_id in pack_id_map.items():
            cursor.execute("""
                UPDATE songs 
                SET pack_id = ? 
                WHERE pack = ?
            """, (pack_id, pack_name))
            print(f"  Updated songs for pack: {pack_name}")
        
        # Step 5: Check if pack_collaborations table needs updating
        cursor.execute("PRAGMA table_info(pack_collaborations)")
        collab_columns = [column[1] for column in cursor.fetchall()]
        
        if 'pack_id' not in collab_columns:
            print("👥 Adding pack_id column to pack_collaborations table...")
            cursor.execute("ALTER TABLE pack_collaborations ADD COLUMN pack_id INTEGER")
            
            # Update existing pack collaborations
            cursor.execute("SELECT id, pack_name FROM pack_collaborations")
            collaborations = cursor.fetchall()
            
            for collab_id, pack_name in collaborations:
                if pack_name in pack_id_map:
                    pack_id = pack_id_map[pack_name]
                    cursor.execute("""
                        UPDATE pack_collaborations 
                        SET pack_id = ? 
                        WHERE id = ?
                    """, (pack_id, collab_id))
                    print(f"  Updated collaboration for pack: {pack_name}")
        else:
            print("✅ pack_id column already exists in pack_collaborations table")
        
        conn.commit()
        print("✅ Migration completed successfully!")
        print(f"📊 Processed {len(pack_id_map)} packs")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_to_packs_table() 