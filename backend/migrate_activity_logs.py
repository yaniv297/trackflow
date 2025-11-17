#!/usr/bin/env python3
"""
Standalone migration script to create activity_logs table.
Safe to run multiple times - it's idempotent.

Usage:
    python migrate_activity_logs.py [DATABASE_URL]

Or set DATABASE_URL environment variable.
"""

import sys
import os
from sqlalchemy import create_engine, text

def migrate_activity_logs(database_url):
    """Create activity_logs table if it doesn't exist"""
    
    print(f"Connecting to database...")
    engine = create_engine(database_url, connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {})
    
    try:
        with engine.begin() as conn:
            # Check if table exists
            if database_url.startswith("sqlite"):
                table_exists = conn.execute(
                    text("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'")
                ).fetchone()
            else:
                # PostgreSQL
                table_exists = conn.execute(
                    text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs'")
                ).fetchone()
            
            if table_exists:
                print("✅ activity_logs table already exists")
                
                # Check columns
                if database_url.startswith("sqlite"):
                    cols = conn.execute(text("PRAGMA table_info(activity_logs)")).fetchall()
                    col_names = {row[1] for row in cols}
                    
                    # If metadata column exists but metadata_json doesn't, rename it
                    if "metadata" in col_names and "metadata_json" not in col_names:
                        print("Renaming metadata column to metadata_json...")
                        conn.execute(text("ALTER TABLE activity_logs RENAME COLUMN metadata TO metadata_json"))
                        print("✅ Renamed metadata column to metadata_json")
                    else:
                        print("✅ Column structure is correct")
                else:
                    # PostgreSQL - check if metadata_json column exists
                    col_check = conn.execute(
                        text("""
                            SELECT column_name 
                            FROM information_schema.columns 
                            WHERE table_name = 'activity_logs' 
                            AND column_name IN ('metadata', 'metadata_json')
                        """)
                    ).fetchall()
                    col_names = {row[0] for row in col_check}
                    
                    if "metadata" in col_names and "metadata_json" not in col_names:
                        print("Renaming metadata column to metadata_json...")
                        conn.execute(text("ALTER TABLE activity_logs RENAME COLUMN metadata TO metadata_json"))
                        print("✅ Renamed metadata column to metadata_json")
                    else:
                        print("✅ Column structure is correct")
            else:
                print("Creating activity_logs table...")
                
                if database_url.startswith("sqlite"):
                    # SQLite
                    conn.execute(text("""
                        CREATE TABLE activity_logs (
                            id INTEGER PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            activity_type VARCHAR NOT NULL,
                            description TEXT NOT NULL,
                            metadata_json TEXT,
                            created_at DATETIME,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    """))
                    
                    # Create indexes
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(activity_type)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_user_type ON activity_logs(user_id, activity_type)"))
                else:
                    # PostgreSQL
                    conn.execute(text("""
                        CREATE TABLE activity_logs (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL,
                            activity_type VARCHAR NOT NULL,
                            description TEXT NOT NULL,
                            metadata_json TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id)
                        )
                    """))
                    
                    # Create indexes
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_logs(activity_type)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activity_user_type ON activity_logs(user_id, activity_type)"))
                
                print("✅ Created activity_logs table with indexes")
        
        print("\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Get database URL from command line or environment
    if len(sys.argv) > 1:
        database_url = sys.argv[1]
    elif "DATABASE_URL" in os.environ:
        database_url = os.environ["DATABASE_URL"]
    else:
        print("Error: Please provide DATABASE_URL as argument or environment variable")
        print("Usage: python migrate_activity_logs.py [DATABASE_URL]")
        sys.exit(1)
    
    # Mask the connection string in output (for security)
    masked_url = database_url.split("@")[-1] if "@" in database_url else database_url
    print(f"Target database: {masked_url}\n")
    
    success = migrate_activity_logs(database_url)
    sys.exit(0 if success else 1)

