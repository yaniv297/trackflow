"""
Add auto_spotify_fetch_enabled column to users table
This allows users to disable automatic Spotify metadata fetching

Usage:
  Local:  python migrations/add_auto_spotify_fetch_setting.py
  Production: DATABASE_URL=your_postgres_url python migrations/add_auto_spotify_fetch_setting.py
"""

import sys
import os
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("❌ ERROR: DATABASE_URL environment variable not set!")
        print("Set it with: export DATABASE_URL='your_database_url'")
        return 1
    
    engine = create_engine(db_url)
    is_sqlite = 'sqlite' in db_url.lower()
    is_postgres = 'postgres' in db_url.lower()
    
    print(f"🗄️  Database: {'SQLite' if is_sqlite else 'PostgreSQL' if is_postgres else 'Unknown'}")
    print(f"📍 URL: {db_url[:50]}...")
    print()
    print("Adding auto_spotify_fetch_enabled column to users table...")
    
    try:
        with engine.begin() as conn:
            # Check if column already exists
            column_exists = False
            if is_postgres:
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='auto_spotify_fetch_enabled'
                """))
                if result.fetchone():
                    column_exists = True
            elif is_sqlite:
                # Check if column exists in SQLite
                cols = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                col_names = {row[1] for row in cols}
                if "auto_spotify_fetch_enabled" in col_names:
                    column_exists = True
            
            if column_exists:
                print("⚠️  Column auto_spotify_fetch_enabled already exists, skipping...")
                return 0
            
            # Add column with default value True (to maintain current behavior)
            if is_sqlite:
                conn.execute(text("ALTER TABLE users ADD COLUMN auto_spotify_fetch_enabled BOOLEAN DEFAULT 1"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_spotify_fetch_enabled BOOLEAN DEFAULT TRUE"))
            
            print("✅ Added auto_spotify_fetch_enabled column")
            print()
            print("🎉 Migration complete!")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(migrate())

