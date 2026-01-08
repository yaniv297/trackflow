"""
Migration: Add update_status column to songs table
- Allows released songs to appear simultaneously in Future Plans/WIP for update tracking
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

def run_migration():
    """Run the migration to add update_status column."""
    print("🔄 Running update_status migration...")
    
    with engine.connect() as conn:
        # Check if we're using PostgreSQL or SQLite
        is_postgres = "postgresql" in str(engine.url)
        
        # Add update_status column to songs table if it doesn't exist
        try:
            if is_postgres:
                # PostgreSQL - check if column exists first
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='songs' AND column_name='update_status'
                """))
                if result.fetchone() is None:
                    conn.execute(text("""
                        ALTER TABLE songs ADD COLUMN update_status VARCHAR(50)
                    """))
                    conn.execute(text("""
                        CREATE INDEX IF NOT EXISTS idx_songs_update_status ON songs(update_status)
                    """))
                    print("✅ Added update_status column to songs table")
                else:
                    print("ℹ️ update_status column already exists")
            else:
                # SQLite - try to add column, ignore error if exists
                try:
                    conn.execute(text("""
                        ALTER TABLE songs ADD COLUMN update_status VARCHAR(50)
                    """))
                    print("✅ Added update_status column to songs table")
                    # Create index for SQLite
                    try:
                        conn.execute(text("""
                            CREATE INDEX idx_songs_update_status ON songs(update_status)
                        """))
                    except Exception:
                        pass  # Index might already exist
                except Exception as e:
                    if "duplicate column" in str(e).lower():
                        print("ℹ️ update_status column already exists")
                    else:
                        raise
            conn.commit()
        except Exception as e:
            print(f"⚠️ Error adding update_status column: {e}")
            conn.rollback()
    
    print("✅ update_status migration completed")


if __name__ == "__main__":
    run_migration()

