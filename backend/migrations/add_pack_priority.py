#!/usr/bin/env python3
"""
Migration script to add priority field to packs table.
This adds a priority column with values 1-5 (5 being highest priority).
"""

import sqlite3
import sys
import os

# Add the backend directory to Python path so we can import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def add_pack_priority_column():
    # Connect to the database
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'songs.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the priority column already exists
        cursor.execute("PRAGMA table_info(packs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'priority' in columns:
            print("Priority column already exists in packs table.")
            return True
            
        # Add the priority column with default value of 3 (medium priority)
        print("Adding priority column to packs table...")
        cursor.execute("ALTER TABLE packs ADD COLUMN priority INTEGER DEFAULT 3")
        
        # Update existing packs to have medium priority (3)
        cursor.execute("UPDATE packs SET priority = 3 WHERE priority IS NULL")
        
        conn.commit()
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(packs)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'priority' in columns:
            print("✅ Successfully added priority column to packs table")
            
            # Show sample data
            cursor.execute("SELECT id, name, priority FROM packs LIMIT 5")
            sample_data = cursor.fetchall()
            if sample_data:
                print("\nSample pack data with priority:")
                for pack_id, name, priority in sample_data:
                    print(f"  ID: {pack_id}, Name: {name}, Priority: {priority}")
            else:
                print("No existing packs found.")
                
            return True
        else:
            print("❌ Failed to add priority column")
            return False
            
    except Exception as e:
        print(f"❌ Error adding priority column: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("Pack Priority Migration")
    print("======================")
    success = add_pack_priority_column()
    sys.exit(0 if success else 1)