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
                
                # Critical missing indexes for performance
                ("idx_songs_public_status", "songs", "is_public, status"),
                ("idx_songs_status_public", "songs", "status, is_public"),
                ("idx_collaborations_type_user", "collaborations", "collaboration_type, user_id"),
                ("idx_collaborations_user_type", "collaborations", "user_id, collaboration_type"),
                ("idx_song_progress_song_completed", "song_progress", "song_id, is_completed"),
                ("idx_song_progress_completed_song", "song_progress", "is_completed, song_id"),
                ("idx_user_achievements_user_earned", "user_achievements", "user_id, earned_at DESC"),
                ("idx_rock_band_dlc_artist_title_lower", "rock_band_dlc", "LOWER(artist), LOWER(title)" if is_postgres else "artist COLLATE NOCASE, title COLLATE NOCASE"),
                ("idx_songs_user_released_at", "songs", "user_id, released_at DESC"),
                ("idx_songs_released_status", "songs", "released_at DESC, status"),
                ("idx_packs_released_show", "packs", "released_at DESC, show_on_homepage"),
                ("idx_collaborations_song_type", "collaborations", "song_id, collaboration_type"),
                ("idx_collaborations_pack_type", "collaborations", "pack_id, collaboration_type"),
                
                # Song listing optimizations (WIP/Released pages)
                ("idx_songs_user_status", "songs", "user_id, status"),
                ("idx_songs_status_updated", "songs", "status, updated_at DESC"),
                ("idx_songs_title_user", "songs", "title, user_id"),
                ("idx_songs_artist_user", "songs", "artist, user_id"),
                ("idx_songs_user_updated", "songs", "user_id, updated_at DESC"),
                ("idx_songs_user_title", "songs", "user_id, title"),
                ("idx_songs_pack_status", "songs", "pack_id, status"),
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
            print(f"📈 Total indexes processed: {success_count + skip_count}")
            
            if success_count > 0:
                print("\n✅ Performance improvements added:")
                print("   - Public songs browsing")
                print("   - Collaboration queries")
                print("   - Song progress tracking") 
                print("   - Achievement lookups")
                print("   - DLC duplicate checking")
                print("   - Released songs pagination")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Performance Indexes Migration")
    print("============================")
    run_migration()