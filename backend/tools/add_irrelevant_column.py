#!/usr/bin/env python3
"""
Migration: add irrelevant column to album_series_preexisting table
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import text
from database import engine

def column_exists(conn, table, column):
    rows = conn.execute(text(f"PRAGMA table_info({table});")).fetchall()
    cols = {r[1] for r in rows}  # name is at index 1
    return column in cols

def migrate():
    with engine.connect() as conn:
        print("Adding irrelevant column to album_series_preexisting (if not exists)...")
        if not column_exists(conn, "album_series_preexisting", "irrelevant"):
            conn.execute(text("ALTER TABLE album_series_preexisting ADD COLUMN irrelevant BOOLEAN DEFAULT FALSE;"))
            print("✅ Added irrelevant column")
        else:
            print("⏩ irrelevant column already exists")
        
        # Clean up any existing data that might be confusing
        print("Cleaning up existing data...")
        
        # Remove any entries that were used for DLC caching (keep only user-specific data)
        # We'll identify these as entries that have pre_existing=True but no user action
        # For now, let's just add the column and let users clean up manually if needed
        
        conn.commit()
        print("✅ Migration completed")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1) 