#!/usr/bin/env python3
"""
Migration: Add released_by_user_id column to packs table
Created: 2025-01-31
Description: Tracks which user released a pack (may differ from pack owner)
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine

def run_migration():
    """Add released_by_user_id column to packs table"""
    
    print("🗃️ Adding released_by_user_id column to packs table...")
    
    try:
        with engine.connect() as connection:
            # Detect database type
            db_url = str(engine.url)
            is_sqlite = "sqlite" in db_url.lower()
            is_postgres = "postgresql" in db_url.lower() or "postgres" in db_url.lower()
            
            if is_sqlite:
                # SQLite doesn't support ADD COLUMN with foreign keys easily
                # Use ALTER TABLE ADD COLUMN (without foreign key constraint)
                connection.execute(text("""
                    ALTER TABLE packs 
                    ADD COLUMN released_by_user_id INTEGER
                """))
            elif is_postgres:
                # PostgreSQL - add column with foreign key
                connection.execute(text("""
                    ALTER TABLE packs 
                    ADD COLUMN IF NOT EXISTS released_by_user_id INTEGER 
                    REFERENCES users(id)
                """))
            else:
                raise ValueError(f"Unsupported database type: {db_url}")
            
            connection.commit()
            print("✅ released_by_user_id column added to packs table")
            
    except OperationalError as e:
        if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
            print("ℹ️  released_by_user_id column already exists, skipping...")
        else:
            print(f"❌ Error during migration: {e}")
            raise
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()

