#!/usr/bin/env python3
"""
Migration: Add Updates table for Latest Updates section on home page
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

def run_migration():
    """Add the updates table"""
    
    print("🗃️ Creating updates table...")
    
    try:
        with engine.connect() as connection:
            # Create the updates table
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS updates (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR NOT NULL,
                    content TEXT NOT NULL,
                    type VARCHAR NOT NULL,
                    author_id INTEGER NOT NULL,
                    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (author_id) REFERENCES users (id)
                )
            """))
            
            # Create indexes
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_update_date ON updates (date DESC)",
                "CREATE INDEX IF NOT EXISTS idx_update_type_date ON updates (type, date DESC)",
                "CREATE INDEX IF NOT EXISTS idx_update_author ON updates (author_id)"
            ]
            
            for index_sql in indexes:
                connection.execute(text(index_sql))
            
            connection.commit()
            
        print("✅ Updates table created successfully")
        print("✅ Indexes created successfully")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    run_migration()


