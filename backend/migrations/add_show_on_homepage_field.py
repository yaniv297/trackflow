#!/usr/bin/env python3
"""
Migration to add show_on_homepage boolean field to packs table.

This replaces the confusing released_at-based logic with an explicit boolean field.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import SQLALCHEMY_DATABASE_URL, SessionLocal

def add_show_on_homepage_field():
    """Add show_on_homepage boolean field to packs table."""
    
    db = SessionLocal()
    
    try:
        print("🔄 Adding show_on_homepage field to packs table...")
        
        # Add the column with a default value
        db.execute(text("""
            ALTER TABLE packs 
            ADD COLUMN show_on_homepage BOOLEAN DEFAULT TRUE NOT NULL
        """))
        
        print("✅ Successfully added show_on_homepage field")
        
        # Backfill existing data based on released_at logic
        print("🔄 Backfilling existing pack data...")
        
        # Packs with released_at set should show on homepage (current behavior)
        # Packs with released_at = NULL should be hidden (intended behavior)
        result = db.execute(text("""
            UPDATE packs 
            SET show_on_homepage = CASE 
                WHEN released_at IS NOT NULL THEN TRUE 
                ELSE FALSE 
            END
        """))
        
        affected_rows = result.rowcount
        print(f"✅ Updated {affected_rows} existing packs")
        
        # Show summary of changes
        visible_count = db.execute(text("""
            SELECT COUNT(*) FROM packs WHERE show_on_homepage = TRUE
        """)).scalar()
        
        hidden_count = db.execute(text("""
            SELECT COUNT(*) FROM packs WHERE show_on_homepage = FALSE  
        """)).scalar()
        
        print(f"📊 Summary:")
        print(f"   • Packs visible on homepage: {visible_count}")
        print(f"   • Packs hidden from homepage: {hidden_count}")
        
        db.commit()
        print("✅ Migration completed successfully")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Run the migration."""
    print("=" * 60)
    print("ADDING show_on_homepage FIELD TO PACKS TABLE")
    print("=" * 60)
    
    add_show_on_homepage_field()
    
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()