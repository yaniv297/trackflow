"""
Migration: Add irrelevant steps feature to song_progress
- Adds is_irrelevant column to song_progress table
- This allows users to mark certain workflow steps as "N/A" for specific songs
  (e.g., a song without Keys/Pro Keys parts)
- Irrelevant steps are excluded from completion percentage calculations
"""

from sqlalchemy import text
from database import engine


def run_migration():
    """Run the migration to add irrelevant steps feature."""
    print("🔄 Running irrelevant steps migration...")
    
    with engine.connect() as conn:
        # Check if we're using PostgreSQL or SQLite
        is_postgres = "postgresql" in str(engine.url)
        
        # Add is_irrelevant column to song_progress table if it doesn't exist
        try:
            if is_postgres:
                # PostgreSQL - check if column exists first
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='song_progress' AND column_name='is_irrelevant'
                """))
                if result.fetchone() is None:
                    conn.execute(text("""
                        ALTER TABLE song_progress ADD COLUMN is_irrelevant BOOLEAN DEFAULT FALSE
                    """))
                    print("✅ Added is_irrelevant column to song_progress table")
                else:
                    print("ℹ️ is_irrelevant column already exists")
            else:
                # SQLite - try to add column, ignore error if exists
                try:
                    conn.execute(text("""
                        ALTER TABLE song_progress ADD COLUMN is_irrelevant BOOLEAN DEFAULT FALSE
                    """))
                    print("✅ Added is_irrelevant column to song_progress table")
                except Exception as e:
                    if "duplicate column" in str(e).lower():
                        print("ℹ️ is_irrelevant column already exists")
                    else:
                        raise
            conn.commit()
        except Exception as e:
            print(f"⚠️ Error adding is_irrelevant column: {e}")
    
    print("✅ Irrelevant steps migration completed")


if __name__ == "__main__":
    run_migration()

