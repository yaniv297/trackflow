"""
Migration: Add content rating feature
- Adds show_content_rating column to users table (default FALSE - feature is opt-in)
- Adds content_rating column to songs table (nullable VARCHAR)

Content rating values:
- NULL: Not rated
- 'family_friendly': Family Friendly - suitable for all ages
- 'supervision': Supervision Recommended - may contain mild themes
- 'mature': Mature - contains explicit content
"""

from sqlalchemy import text
from database import engine


def run_migration():
    """Run the migration to add content rating feature."""
    print("🔄 Running content rating migration...")
    
    with engine.connect() as conn:
        # Check if we're using PostgreSQL or SQLite
        is_postgres = "postgresql" in str(engine.url)
        
        # 1. Add show_content_rating column to users table if it doesn't exist
        try:
            if is_postgres:
                # PostgreSQL - check if column exists first
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='show_content_rating'
                """))
                if result.fetchone() is None:
                    conn.execute(text("""
                        ALTER TABLE users ADD COLUMN show_content_rating BOOLEAN DEFAULT FALSE
                    """))
                    print("✅ Added show_content_rating column to users table (default: FALSE)")
                else:
                    print("ℹ️ show_content_rating column already exists in users table")
            else:
                # SQLite - try to add column, ignore error if exists
                try:
                    conn.execute(text("""
                        ALTER TABLE users ADD COLUMN show_content_rating BOOLEAN DEFAULT FALSE
                    """))
                    print("✅ Added show_content_rating column to users table (default: FALSE)")
                except Exception as e:
                    if "duplicate column" in str(e).lower():
                        print("ℹ️ show_content_rating column already exists in users table")
                    else:
                        raise
            conn.commit()
        except Exception as e:
            print(f"⚠️ Error adding show_content_rating column to users: {e}")
        
        # 2. Add content_rating column to songs table if it doesn't exist
        try:
            if is_postgres:
                # PostgreSQL - check if column exists first
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='songs' AND column_name='content_rating'
                """))
                if result.fetchone() is None:
                    conn.execute(text("""
                        ALTER TABLE songs ADD COLUMN content_rating VARCHAR(50)
                    """))
                    print("✅ Added content_rating column to songs table")
                else:
                    print("ℹ️ content_rating column already exists in songs table")
            else:
                # SQLite - try to add column, ignore error if exists
                try:
                    conn.execute(text("""
                        ALTER TABLE songs ADD COLUMN content_rating VARCHAR(50)
                    """))
                    print("✅ Added content_rating column to songs table")
                except Exception as e:
                    if "duplicate column" in str(e).lower():
                        print("ℹ️ content_rating column already exists in songs table")
                    else:
                        raise
            conn.commit()
        except Exception as e:
            print(f"⚠️ Error adding content_rating column to songs: {e}")
    
    print("✅ Content rating migration completed")


if __name__ == "__main__":
    run_migration()

