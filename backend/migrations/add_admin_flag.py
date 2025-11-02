"""
Add is_admin column to users table and make yaniv297 an admin
"""

import sys
import os
from sqlalchemy import create_engine, text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    db_url = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")
    engine = create_engine(db_url)
    is_sqlite = 'sqlite' in db_url.lower()
    
    print("Adding is_admin column to users table...")
    
    with engine.begin() as conn:
        # Add column
        if is_sqlite:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
        else:
            # Check if exists first
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='users' AND column_name='is_admin'
            """))
            if result.fetchone():
                print("⚠️  Column is_admin already exists")
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                print("✅ Added is_admin column")
        
        # Make yaniv297 an admin
        result = conn.execute(text("""
            UPDATE users 
            SET is_admin = TRUE
            WHERE username = 'yaniv297'
        """))
        
        if result.rowcount > 0:
            print(f"✅ Granted admin privileges to yaniv297")
        else:
            print("⚠️  User yaniv297 not found")
        
        print("🎉 Migration complete!")

if __name__ == "__main__":
    migrate()

