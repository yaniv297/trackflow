#!/usr/bin/env python3
"""
Add is_admin column to users table
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def run_migration():
    """Add is_admin column to users table"""
    database_url = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")
    
    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    
    engine = create_engine(database_url, connect_args=connect_args)
    
    try:
        with engine.begin() as conn:
            # Check if column already exists
            if database_url.startswith("sqlite"):
                result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                columns = [row[1] for row in result]
                
                if "is_admin" not in columns:
                    print("Adding is_admin column to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                    print("✅ is_admin column added successfully")
                    
                    # Make yaniv297 admin
                    conn.execute(text("UPDATE users SET is_admin = TRUE WHERE username = 'yaniv297'"))
                    print("✅ yaniv297 promoted to admin")
                else:
                    print("✅ is_admin column already exists")
                    
            else:  # PostgreSQL
                # Check if column exists
                result = conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'is_admin'
                """)).fetchone()
                
                if not result:
                    print("Adding is_admin column to users table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                    print("✅ is_admin column added successfully")
                    
                    # Make yaniv297 admin
                    conn.execute(text("UPDATE users SET is_admin = TRUE WHERE username = 'yaniv297'"))
                    print("✅ yaniv297 promoted to admin")
                else:
                    print("✅ is_admin column already exists")
        
        print("\n✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

