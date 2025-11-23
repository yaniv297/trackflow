#!/usr/bin/env python3

"""
Migration: Add password reset tokens table
Created: 2024-11-23
Description: Adds password_reset_tokens table to support forgot password functionality
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def run_migration():
    """Add password_reset_tokens table"""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ ERROR: DATABASE_URL environment variable not set!")
        print("Set it with: export DATABASE_URL='your_database_url'")
        sys.exit(1)

    engine = create_engine(db_url)
    
    # Detect database type
    is_sqlite = "sqlite" in db_url.lower()
    is_postgres = "postgresql" in db_url.lower() or "postgres" in db_url.lower()
    
    print(f"🗄️  Database: {'SQLite' if is_sqlite else 'PostgreSQL' if is_postgres else 'Unknown'}")
    print(f"📍 URL: {db_url[:50]}...")
    print()
    print("Adding password_reset_tokens table...")

    try:
        with engine.connect() as connection:
            # Check if table already exists
            if is_postgres:
                result = connection.execute(text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'password_reset_tokens'
                    );
                """))
            else:  # SQLite
                result = connection.execute(text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='password_reset_tokens';
                """))
            
            table_exists = result.fetchone()
            if table_exists and (is_postgres and table_exists[0] or not is_postgres):
                print("⚠️  Table password_reset_tokens already exists, skipping...")
            else:
                # Create password_reset_tokens table
                if is_postgres:
                    connection.execute(text("""
                        CREATE TABLE password_reset_tokens (
                            id SERIAL PRIMARY KEY,
                            email VARCHAR NOT NULL,
                            token VARCHAR NOT NULL UNIQUE,
                            expires_at TIMESTAMP NOT NULL,
                            used_at TIMESTAMP NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """))
                    
                    # Create indexes
                    connection.execute(text("CREATE INDEX idx_token_email ON password_reset_tokens (email);"))
                    connection.execute(text("CREATE INDEX idx_token_expires ON password_reset_tokens (expires_at);"))
                    connection.execute(text("CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens (token);"))
                    
                else:  # SQLite
                    connection.execute(text("""
                        CREATE TABLE password_reset_tokens (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            email VARCHAR NOT NULL,
                            token VARCHAR NOT NULL UNIQUE,
                            expires_at DATETIME NOT NULL,
                            used_at DATETIME NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                    """))
                    
                    # Create indexes
                    connection.execute(text("CREATE INDEX idx_token_email ON password_reset_tokens (email);"))
                    connection.execute(text("CREATE INDEX idx_token_expires ON password_reset_tokens (expires_at);"))
                    connection.execute(text("CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens (token);"))

                connection.commit()
                print("✅ Added password_reset_tokens table with indexes")
            
            print()
            print("🎉 Migration complete!")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Password Reset Tokens Migration")
    print("===============================")
    run_migration()