"""
Migration: Add missing columns to production database

Missing columns identified:
1. packs.rv_release_time - TIMESTAMP (RhythmVerse server release time for community events)
2. songs.update_status - VARCHAR(50) (Song update status tracking)

Run with:
    python -m migrations.add_missing_columns_2026_01
"""

import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from database import engine, SQLALCHEMY_DATABASE_URL


def run_migration():
    """Add missing columns to production database."""
    
    is_postgres = SQLALCHEMY_DATABASE_URL.startswith("postgresql")
    
    print(f"🔄 Running migration on {'PostgreSQL' if is_postgres else 'SQLite'}...")
    print(f"   Database: {SQLALCHEMY_DATABASE_URL[:50]}...")
    
    with engine.connect() as conn:
        # Check and add packs.rv_release_time
        print("\n📦 Checking packs.rv_release_time...")
        try:
            if is_postgres:
                # Check if column exists in PostgreSQL
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'packs' AND column_name = 'rv_release_time'
                """))
                exists = result.fetchone() is not None
            else:
                # Check if column exists in SQLite
                result = conn.execute(text("PRAGMA table_info(packs)"))
                columns = [row[1] for row in result.fetchall()]
                exists = 'rv_release_time' in columns
            
            if not exists:
                print("   ➕ Adding packs.rv_release_time column...")
                conn.execute(text("""
                    ALTER TABLE packs ADD COLUMN rv_release_time TIMESTAMP NULL
                """))
                conn.commit()
                print("   ✅ Added packs.rv_release_time")
            else:
                print("   ✓ Column already exists")
        except Exception as e:
            print(f"   ⚠️ Error: {e}")
        
        # Check and add songs.update_status
        print("\n🎵 Checking songs.update_status...")
        try:
            if is_postgres:
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'songs' AND column_name = 'update_status'
                """))
                exists = result.fetchone() is not None
            else:
                result = conn.execute(text("PRAGMA table_info(songs)"))
                columns = [row[1] for row in result.fetchall()]
                exists = 'update_status' in columns
            
            if not exists:
                print("   ➕ Adding songs.update_status column...")
                conn.execute(text("""
                    ALTER TABLE songs ADD COLUMN update_status VARCHAR(50) NULL
                """))
                conn.commit()
                print("   ✅ Added songs.update_status")
            else:
                print("   ✓ Column already exists")
        except Exception as e:
            print(f"   ⚠️ Error: {e}")
    
    print("\n✅ Migration complete!")


if __name__ == "__main__":
    run_migration()

