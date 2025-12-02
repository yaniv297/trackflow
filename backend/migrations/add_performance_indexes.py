#!/usr/bin/env python3

"""
Migration: Add performance indexes
Created: 2024-12-02
Description: Adds additional indexes to frequently queried columns for better performance
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def run_migration():
    """Add performance indexes to frequently queried columns"""
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
    print("Adding performance indexes...")

    try:
        with engine.connect() as connection:
            # Define indexes to add
            indexes_to_add = [
                # Users table - for authentication and user queries
                ("idx_users_created_at", "users", "created_at"),
                ("idx_users_last_login", "users", "last_login_at"),
                
                # Songs table - additional performance indexes
                ("idx_songs_created_at", "songs", "created_at"),
                ("idx_songs_updated_at", "songs", "updated_at"),
                ("idx_songs_year", "songs", "year"),
                ("idx_songs_user_public", "songs", "user_id, is_public"),
                
                # Packs table - for pack queries
                ("idx_packs_created_at", "packs", "created_at"),
                ("idx_packs_updated_at", "packs", "updated_at"),
                ("idx_packs_user_priority", "packs", "user_id, priority"),
                
                # Artists table - for artist lookup performance
                ("idx_artists_name_lower", "artists", "LOWER(name)" if is_postgres else "name COLLATE NOCASE"),
                
                # Activity logs - for recent activity queries
                ("idx_activity_user_created", "activity_logs", "user_id, created_at DESC"),
                
                # Feature requests - for status and date filtering
                ("idx_feature_requests_status_created", "feature_requests", "is_done, created_at DESC"),
                ("idx_feature_requests_user_created", "feature_requests", "user_id, created_at DESC"),
                
                # User stats - for leaderboard queries
                ("idx_user_stats_points", "user_stats", "total_points DESC"),
                ("idx_user_stats_songs", "user_stats", "total_songs DESC"),
                ("idx_user_stats_streak", "user_stats", "login_streak DESC"),
                
                # Notifications - for unread count queries
                ("idx_notifications_user_unread", "notifications", "user_id, is_read, created_at DESC"),
            ]
            
            success_count = 0
            skip_count = 0
            
            for index_name, table_name, columns in indexes_to_add:
                try:
                    # Check if index already exists
                    if is_postgres:
                        result = connection.execute(text("""
                            SELECT indexname FROM pg_indexes 
                            WHERE tablename = :table AND indexname = :index
                        """), {"table": table_name, "index": index_name})
                    else:  # SQLite
                        result = connection.execute(text("""
                            SELECT name FROM sqlite_master 
                            WHERE type='index' AND name = :index
                        """), {"index": index_name})
                    
                    index_exists = result.fetchone()
                    
                    if index_exists:
                        print(f"⚠️  Index {index_name} already exists, skipping...")
                        skip_count += 1
                    else:
                        # Create the index
                        create_sql = f"CREATE INDEX {index_name} ON {table_name} ({columns});"
                        connection.execute(text(create_sql))
                        print(f"✅ Created index: {index_name}")
                        success_count += 1
                        
                except Exception as e:
                    print(f"⚠️  Failed to create index {index_name}: {e}")
                    # Continue with other indexes
            
            connection.commit()
            print()
            print(f"🎉 Migration complete! Created {success_count} indexes, skipped {skip_count} existing indexes")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Performance Indexes Migration")
    print("============================")
    run_migration()