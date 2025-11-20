#!/usr/bin/env python3
"""
Migration script to reset all pack priorities to NULL.
This makes priorities optional - packs have no priority unless users explicitly set one.
"""

import sqlite3
import sys
import os

# Add the backend directory to Python path so we can import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def reset_pack_priorities():
    # Connect to the database
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'songs.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the priority column exists
        cursor.execute("PRAGMA table_info(packs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'priority' not in columns:
            print("Priority column does not exist in packs table.")
            return True
            
        # Reset all pack priorities to NULL
        print("Resetting all pack priorities to NULL...")
        cursor.execute("UPDATE packs SET priority = NULL")
        
        rows_affected = cursor.rowcount
        conn.commit()
        
        print(f"✅ Successfully reset {rows_affected} pack priorities to NULL")
        
        # Show sample data
        cursor.execute("SELECT id, name, priority FROM packs LIMIT 5")
        sample_data = cursor.fetchall()
        if sample_data:
            print("\nSample pack data with reset priorities:")
            for pack_id, name, priority in sample_data:
                priority_str = "NULL" if priority is None else str(priority)
                print(f"  ID: {pack_id}, Name: {name}, Priority: {priority_str}")
        else:
            print("No existing packs found.")
            
        return True
        
    except Exception as e:
        print(f"❌ Error resetting pack priorities: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("Pack Priority Reset Migration")
    print("=============================")
    success = reset_pack_priorities()
    sys.exit(0 if success else 1)