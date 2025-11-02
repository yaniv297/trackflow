"""
Add last_login_at column to users table
This marks claimed vs unclaimed users (NULL = unclaimed)

Usage:
  Local:  python migrations/add_last_login_column.py
  Production: DATABASE_URL=your_postgres_url python migrations/add_last_login_column.py
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
    print("Adding last_login_at column to users table...")
    
    try:
        with engine.begin() as conn:
            # Check if column already exists
            if is_postgres:
                result = conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='last_login_at'
                """))
                if result.fetchone():
                    print("⚠️  Column last_login_at already exists, skipping...")
                    return 0
            
            # Add column
            if is_sqlite:
                conn.execute(text("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP"))
            
            print("✅ Added last_login_at column")
            
            # Set last_login_at for existing users who have logged in before
            # Mark yaniv297 and jphn as claimed
            result = conn.execute(text("""
                UPDATE users 
                SET last_login_at = CURRENT_TIMESTAMP 
                WHERE username IN ('yaniv297', 'jphn')
            """))
            
            print(f"✅ Marked {result.rowcount} existing users as claimed")
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

