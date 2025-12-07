#!/usr/bin/env python3
"""
Database protection against empty datetime strings.
This script adds database-level protection and cleanup.
"""

from database import SessionLocal
from sqlalchemy import text

def fix_datetime_protection():
    """Add comprehensive protection against empty datetime strings."""
    db = SessionLocal()
    
    try:
        print("🔧 Adding database-level protection against empty datetime strings...")
        
        # 1. Clean up any existing empty datetime strings
        print("1. Cleaning up existing bad data...")
        
        tables_and_columns = [
            ('songs', ['created_at', 'updated_at', 'released_at']),
            ('packs', ['created_at', 'updated_at', 'released_at']),
            ('collaborations', ['created_at']),
            ('user_achievements', ['earned_at']),
            ('album_series', ['created_at', 'updated_at']),
            ('notifications', ['created_at', 'read_at']),
            ('users', ['created_at', 'last_login_at']),
        ]
        
        total_fixes = 0
        for table, columns in tables_and_columns:
            for column in columns:
                try:
                    result = db.execute(text(f"""
                        UPDATE {table} 
                        SET {column} = NULL 
                        WHERE {column} = ''
                    """))
                    if result.rowcount > 0:
                        print(f"   Fixed {result.rowcount} empty strings in {table}.{column}")
                        total_fixes += result.rowcount
                except Exception as e:
                    print(f"   Warning: Could not fix {table}.{column}: {e}")
        
        if total_fixes > 0:
            print(f"   Total fixes: {total_fixes}")
        else:
            print("   No bad data found.")
        
        # 2. Add database triggers to prevent future empty strings (SQLite)
        print("2. Adding database triggers to prevent empty datetime strings...")
        
        # Create a function to generate triggers for datetime columns
        trigger_sql = """
        CREATE TRIGGER IF NOT EXISTS prevent_empty_datetime_songs_insert
        BEFORE INSERT ON songs
        FOR EACH ROW
        WHEN NEW.created_at = '' OR NEW.updated_at = '' OR NEW.released_at = ''
        BEGIN
            UPDATE songs SET 
                created_at = CASE WHEN NEW.created_at = '' THEN NULL ELSE NEW.created_at END,
                updated_at = CASE WHEN NEW.updated_at = '' THEN NULL ELSE NEW.updated_at END,
                released_at = CASE WHEN NEW.released_at = '' THEN NULL ELSE NEW.released_at END
            WHERE rowid = NEW.rowid;
        END;
        
        CREATE TRIGGER IF NOT EXISTS prevent_empty_datetime_songs_update  
        BEFORE UPDATE ON songs
        FOR EACH ROW
        WHEN NEW.created_at = '' OR NEW.updated_at = '' OR NEW.released_at = ''
        BEGIN
            UPDATE songs SET
                created_at = CASE WHEN NEW.created_at = '' THEN NULL ELSE NEW.created_at END,
                updated_at = CASE WHEN NEW.updated_at = '' THEN NULL ELSE NEW.updated_at END,
                released_at = CASE WHEN NEW.released_at = '' THEN NULL ELSE NEW.released_at END
            WHERE rowid = NEW.rowid;
        END;
        """
        
        try:
            for trigger in trigger_sql.strip().split(';\n\n'):
                if trigger.strip():
                    db.execute(text(trigger))
            print("   ✅ Database triggers added successfully")
        except Exception as e:
            print(f"   Warning: Could not add triggers: {e}")
        
        # 3. Commit all changes
        db.commit()
        print("✅ Database protection setup complete!")
        
        # 4. Test the protection
        print("3. Testing protection...")
        test_protection(db)
        
    except Exception as e:
        print(f"❌ Error setting up protection: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def test_protection(db):
    """Test that the protection works."""
    try:
        # Try to insert an empty string
        db.execute(text("UPDATE songs SET released_at = '' WHERE id = 1799"))
        db.commit()
        
        # Check if it was converted to NULL
        result = db.execute(text("SELECT released_at FROM songs WHERE id = 1799")).fetchone()
        if result and result[0] is None:
            print("   ✅ Protection working - empty string converted to NULL")
        else:
            print(f"   ❌ Protection failed - value is: {repr(result[0])}")
        
        # Clean up
        db.execute(text("UPDATE songs SET released_at = NULL WHERE id = 1799"))
        db.commit()
        
    except Exception as e:
        print(f"   ❌ Protection test failed: {e}")

if __name__ == "__main__":
    fix_datetime_protection()