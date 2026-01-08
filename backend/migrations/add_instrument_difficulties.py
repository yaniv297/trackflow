"""
Migration: Add instrument difficulties feature
- Adds show_instrument_difficulties column to users table
- Creates song_difficulties table for storing instrument difficulty ratings
"""

from sqlalchemy import text
from database import engine

def run_migration():
    """Run the migration to add instrument difficulties feature."""
    print("🔄 Running instrument difficulties migration...")
    
    with engine.connect() as conn:
        # Check if we're using PostgreSQL or SQLite
        is_postgres = "postgresql" in str(engine.url)
        
        # 1. Add show_instrument_difficulties column to users table if it doesn't exist
        try:
            if is_postgres:
                # PostgreSQL - check if column exists first
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='show_instrument_difficulties'
                """))
                if result.fetchone() is None:
                    conn.execute(text("""
                        ALTER TABLE users ADD COLUMN show_instrument_difficulties BOOLEAN DEFAULT TRUE
                    """))
                    print("✅ Added show_instrument_difficulties column to users table")
                else:
                    print("ℹ️ show_instrument_difficulties column already exists")
            else:
                # SQLite - try to add column, ignore error if exists
                try:
                    conn.execute(text("""
                        ALTER TABLE users ADD COLUMN show_instrument_difficulties BOOLEAN DEFAULT TRUE
                    """))
                    print("✅ Added show_instrument_difficulties column to users table")
                except Exception as e:
                    if "duplicate column" in str(e).lower():
                        print("ℹ️ show_instrument_difficulties column already exists")
                    else:
                        raise
            conn.commit()
        except Exception as e:
            print(f"⚠️ Error adding show_instrument_difficulties column: {e}")
        
        # 2. Create song_difficulties table if it doesn't exist
        try:
            if is_postgres:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS song_difficulties (
                        id SERIAL PRIMARY KEY,
                        song_id INTEGER NOT NULL REFERENCES songs(id),
                        instrument VARCHAR(50) NOT NULL,
                        difficulty INTEGER,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(song_id, instrument)
                    )
                """))
                # Create index if not exists
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_song_difficulty_lookup 
                    ON song_difficulties(song_id, instrument)
                """))
            else:
                # SQLite
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS song_difficulties (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        song_id INTEGER NOT NULL REFERENCES songs(id),
                        instrument VARCHAR(50) NOT NULL,
                        difficulty INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(song_id, instrument)
                    )
                """))
                # Create index
                try:
                    conn.execute(text("""
                        CREATE INDEX idx_song_difficulty_lookup 
                        ON song_difficulties(song_id, instrument)
                    """))
                except Exception:
                    pass  # Index might already exist
            
            conn.commit()
            print("✅ Created song_difficulties table")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("ℹ️ song_difficulties table already exists")
            else:
                print(f"⚠️ Error creating song_difficulties table: {e}")
    
    print("✅ Instrument difficulties migration completed")


if __name__ == "__main__":
    run_migration()

