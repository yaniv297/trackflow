#!/usr/bin/env python3
import sqlite3
import os

def add_optional_column():
    """Add the optional column to the songs table."""
    db_path = "./songs.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file {db_path} not found")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(songs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'optional' in columns:
            print("✅ Column 'optional' already exists in songs table")
            return True
        
        # Add the optional column
        cursor.execute("ALTER TABLE songs ADD COLUMN optional BOOLEAN DEFAULT FALSE")
        conn.commit()
        
        print("✅ Successfully added 'optional' column to songs table")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(songs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'optional' in columns:
            print("✅ Verified: 'optional' column exists in songs table")
            return True
        else:
            print("❌ Failed to verify 'optional' column addition")
            return False
            
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("🔧 Adding 'optional' column to songs table...")
    success = add_optional_column()
    if success:
        print("🎉 Migration completed successfully!")
    else:
        print("💥 Migration failed!") 