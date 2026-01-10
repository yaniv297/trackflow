#!/usr/bin/env python3
"""
Migration: Add community events support

This migration:
1. Adds community event fields to packs table
2. Adds event submission fields to songs table
3. Creates community_event_registrations table
4. Creates indexes for querying active events
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal, SQLALCHEMY_DATABASE_URL


def check_column_exists(db, table_name: str, column_name: str, is_postgres: bool) -> bool:
    """Check if a column exists in a table."""
    if is_postgres:
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = :table AND column_name = :column
            )
        """), {"table": table_name, "column": column_name})
        return result.scalar()
    else:
        result = db.execute(text(f"PRAGMA table_info({table_name})"))
        columns = [row[1] for row in result.fetchall()]
        return column_name in columns


def check_table_exists(db, table_name: str, is_postgres: bool) -> bool:
    """Check if a table exists."""
    if is_postgres:
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = :table
            )
        """), {"table": table_name})
        return result.scalar()
    else:
        result = db.execute(text("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name=:table
        """), {"table": table_name})
        return result.fetchone() is not None


def run_migration():
    """Add community events support to the database"""
    
    db = SessionLocal()
    is_postgres = SQLALCHEMY_DATABASE_URL.startswith("postgresql")
    
    print(f"📂 Using database: {'PostgreSQL' if is_postgres else 'SQLite'}")
    
    try:
        # ============================================
        # 1. Add community event fields to packs table
        # ============================================
        
        pack_columns = [
            ("is_community_event", "BOOLEAN DEFAULT FALSE"),
            ("event_theme", "VARCHAR(255)"),
            ("event_end_date", "TIMESTAMP" if is_postgres else "DATETIME"),
            ("event_banner_url", "VARCHAR(500)"),
            ("event_description", "TEXT"),
            ("event_organizer_id", "INTEGER REFERENCES users(id)"),
            ("event_revealed_at", "TIMESTAMP" if is_postgres else "DATETIME"),
        ]
        
        for col_name, col_type in pack_columns:
            if not check_column_exists(db, "packs", col_name, is_postgres):
                print(f"🔄 Adding {col_name} column to packs table...")
                db.execute(text(f"ALTER TABLE packs ADD COLUMN {col_name} {col_type}"))
                db.commit()
                print(f"✅ Added {col_name} column to packs")
            else:
                print(f"ℹ️ {col_name} column already exists in packs")
        
        # Create index on is_community_event
        try:
            db.execute(text("CREATE INDEX idx_pack_community_event ON packs (is_community_event)"))
            db.commit()
            print("✅ Created index idx_pack_community_event")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print("ℹ️ Index idx_pack_community_event already exists")
            else:
                print(f"⚠️ Could not create index: {e}")
        
        # ============================================
        # 2. Add event submission fields to songs table
        # ============================================
        
        song_columns = [
            ("rhythmverse_link", "VARCHAR(500)"),
            ("event_submission_description", "TEXT"),
            ("visualizer_link", "VARCHAR(500)"),
            ("preview_link", "VARCHAR(500)"),
            ("is_event_submitted", "BOOLEAN DEFAULT FALSE"),
        ]
        
        for col_name, col_type in song_columns:
            if not check_column_exists(db, "songs", col_name, is_postgres):
                print(f"🔄 Adding {col_name} column to songs table...")
                db.execute(text(f"ALTER TABLE songs ADD COLUMN {col_name} {col_type}"))
                db.commit()
                print(f"✅ Added {col_name} column to songs")
            else:
                print(f"ℹ️ {col_name} column already exists in songs")
        
        # Create index on is_event_submitted
        try:
            db.execute(text("CREATE INDEX idx_song_event_submitted ON songs (is_event_submitted)"))
            db.commit()
            print("✅ Created index idx_song_event_submitted")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                print("ℹ️ Index idx_song_event_submitted already exists")
            else:
                print(f"⚠️ Could not create index: {e}")
        
        # ============================================
        # 3. Create community_event_registrations table
        # ============================================
        
        if not check_table_exists(db, "community_event_registrations", is_postgres):
            print("🔄 Creating community_event_registrations table...")
            
            if is_postgres:
                db.execute(text("""
                    CREATE TABLE community_event_registrations (
                        id SERIAL PRIMARY KEY,
                        pack_id INTEGER NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT unique_event_registration UNIQUE (pack_id, user_id)
                    )
                """))
            else:
                db.execute(text("""
                    CREATE TABLE community_event_registrations (
                        id INTEGER PRIMARY KEY,
                        pack_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (pack_id) REFERENCES packs (id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                        UNIQUE (pack_id, user_id)
                    )
                """))
            
            # Create indexes
            db.execute(text("CREATE INDEX idx_event_reg_pack ON community_event_registrations (pack_id)"))
            db.execute(text("CREATE INDEX idx_event_reg_user ON community_event_registrations (user_id)"))
            
            db.commit()
            print("✅ Created community_event_registrations table with indexes")
        else:
            print("ℹ️ community_event_registrations table already exists")
        
        print("✅ Community events migration completed successfully")
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """Run the migration."""
    print("=" * 60)
    print("ADDING COMMUNITY EVENTS SUPPORT")
    print("=" * 60)
    
    run_migration()
    
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()

