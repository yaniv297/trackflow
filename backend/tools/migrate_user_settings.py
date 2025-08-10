#!/usr/bin/env python3
"""
Database migration script to update user settings fields.
This script safely migrates existing users to the new schema without data loss.
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SQLALCHEMY_DATABASE_URL
from models import User

def run_migration():
    """Run the database migration for user settings."""
    
    print("Starting user settings migration...")
    
    # Create database engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        try:
            # For SQLite, we'll use a different approach to check columns
            # We'll try to add the columns and catch the error if they already exist
            
            # Add preferred_contact_method column
            try:
                db.execute(text("ALTER TABLE users ADD COLUMN preferred_contact_method VARCHAR"))
                print("✓ Added preferred_contact_method column")
            except Exception as e:
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    print("✓ preferred_contact_method column already exists")
                else:
                    raise e
            
            # Add discord_username column
            try:
                db.execute(text("ALTER TABLE users ADD COLUMN discord_username VARCHAR"))
                print("✓ Added discord_username column")
            except Exception as e:
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    print("✓ discord_username column already exists")
                else:
                    raise e
            
            # Add display_name column
            try:
                db.execute(text("ALTER TABLE users ADD COLUMN display_name VARCHAR"))
                print("✓ Added display_name column")
            except Exception as e:
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    print("✓ display_name column already exists")
                else:
                    raise e
            
            # Update existing users who have null preferred_contact_method
            # We'll set them to null (no default) as per the new schema
            print("Updating existing users...")
            
            # Count users that need updating
            result = db.execute(text("""
                SELECT COUNT(*) as count 
                FROM users 
                WHERE preferred_contact_method IS NULL
            """))
            count = result.fetchone()[0]  # SQLite returns tuple, not object
            
            if count > 0:
                print(f"Found {count} users with null preferred_contact_method (this is correct for new schema)")
            
            # Commit all changes
            db.commit()
            print("✓ Migration completed successfully!")
            
            # Show summary
            result = db.execute(text("SELECT COUNT(*) as count FROM users"))
            total_users = result.fetchone()[0]  # SQLite returns tuple, not object
            
            result = db.execute(text("""
                SELECT COUNT(*) as count 
                FROM users 
                WHERE preferred_contact_method IS NOT NULL
            """))
            users_with_contact_method = result.fetchone()[0]  # SQLite returns tuple, not object
            
            print(f"\nMigration Summary:")
            print(f"- Total users: {total_users}")
            print(f"- Users with contact method set: {users_with_contact_method}")
            print(f"- Users with no contact method: {total_users - users_with_contact_method}")
            
        except Exception as e:
            db.rollback()
            print(f"❌ Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    print("User Settings Database Migration")
    print("=" * 40)
    print("This script will:")
    print("1. Add preferred_contact_method column (nullable)")
    print("2. Add discord_username column (nullable)")
    print("3. Add display_name column (nullable)")
    print("4. Preserve all existing user data")
    print()
    
    response = input("Do you want to proceed with the migration? (y/N): ")
    if response.lower() in ['y', 'yes']:
        run_migration()
    else:
        print("Migration cancelled.") 