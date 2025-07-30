#!/usr/bin/env python3
"""Migration script to link album series to their corresponding packs"""
import sqlite3
import os
from pathlib import Path

def migrate_album_series_packs():
    db_path = Path(__file__).parent / "songs.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔄 Starting album series to packs migration...")
        
        # Step 1: Add pack_id column to album_series table
        print("📦 Adding pack_id column to album_series table...")
        cursor.execute("ALTER TABLE album_series ADD COLUMN pack_id INTEGER")
        
        # Step 2: Get all album series and their pack names
        print("🔍 Collecting album series data...")
        cursor.execute("""
            SELECT id, album_name, artist_name 
            FROM album_series
        """)
        album_series = cursor.fetchall()
        
        # Step 3: For each album series, find the corresponding pack
        print("🔗 Linking album series to packs...")
        for series_id, album_name, artist_name in album_series:
            # Try to find a pack that matches the album series name
            # Look for packs that contain the album name or artist name
            cursor.execute("""
                SELECT id, name FROM packs 
                WHERE name LIKE ? OR name LIKE ?
            """, (f"%{album_name}%", f"%{artist_name}%"))
            
            matching_packs = cursor.fetchall()
            
            if matching_packs:
                # Use the first matching pack
                pack_id = matching_packs[0][0]
                pack_name = matching_packs[0][1]
                cursor.execute("""
                    UPDATE album_series 
                    SET pack_id = ? 
                    WHERE id = ?
                """, (pack_id, series_id))
                print(f"  Linked album series '{album_name}' to pack '{pack_name}' (ID: {pack_id})")
            else:
                print(f"  ⚠️  No matching pack found for album series '{album_name}'")
        
        # Step 4: Create index for better performance
        print("📊 Creating index...")
        cursor.execute("CREATE INDEX ix_album_series_pack_id ON album_series (pack_id)")
        
        conn.commit()
        print("✅ Album series to packs migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_album_series_packs() 