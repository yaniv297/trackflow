#!/usr/bin/env python3
"""
Migration: add packs.album_series_id and migrate from songs.album_series_id to packs.
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
        # 1) Add column if not exists (SQLite-compatible)
        print("Adding album_series_id to packs (if not exists)...")
        if not column_exists(conn, "packs", "album_series_id"):
            conn.execute(text("ALTER TABLE packs ADD COLUMN album_series_id INTEGER;"))
        # 2) Create index
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_packs_album_series ON packs(album_series_id);"
        ))
        # 3) Migrate: for each pack, if songs have same non-null album_series_id, set pack.album_series_id
        print("Migrating album_series_id from songs to packs...")
        packs = conn.execute(text("SELECT id FROM packs")).fetchall()
        updated = 0
        for (pack_id,) in packs:
            rows = conn.execute(text(
                "SELECT DISTINCT album_series_id FROM songs WHERE pack_id = :pid AND album_series_id IS NOT NULL"
            ), {"pid": pack_id}).fetchall()
            ids = [r[0] for r in rows]
            if len(ids) == 1:
                conn.execute(text(
                    "UPDATE packs SET album_series_id = :asid WHERE id = :pid"
                ), {"asid": ids[0], "pid": pack_id})
                updated += 1
        conn.commit()
        print(f"Updated {updated} packs with album_series_id.")

if __name__ == "__main__":
    try:
        migrate()
        print("✅ Migration completed.")
    except Exception as e:
        print("❌ Migration failed:", e)
        sys.exit(1) 