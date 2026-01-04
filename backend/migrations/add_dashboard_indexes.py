#!/usr/bin/env python3

"""
Migration: Add dashboard performance indexes
Created: 2024-12-XX
Description: Adds indexes specifically optimized for dashboard queries to improve "pick up where you left off" loading time
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def run_migration():
    """Add performance indexes for dashboard queries"""
    db_url ="postgresql://postgres.vhydslrserhdzzqmytie:vyhzwSBNFCVgj2oR@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
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
    print("Adding dashboard performance indexes...")

    try:
        with engine.connect() as connection:
            # Define indexes to add - optimized for dashboard queries
            indexes_to_add = [
                # Songs table - for dashboard "pick up where you left off" query
                # This matches: WHERE user_id = X AND status = 'In Progress' AND (optional = FALSE OR optional IS NULL) ORDER BY updated_at DESC
                ("idx_songs_dashboard_query", "songs", "user_id, status, optional, updated_at DESC" if is_postgres else "user_id, status, optional, updated_at"),
                
                # Alternative composite index for the same query pattern
                ("idx_songs_user_status_updated", "songs", "user_id, status, updated_at DESC" if is_postgres else "user_id, status, updated_at"),
                
                # WipCollaborations - for collaborator waiting queries
                # This matches: WHERE song_id IN (...) AND collaborator = X
                ("idx_wip_collab_song_collab", "wip_collaborations", "song_id, collaborator"),
                ("idx_wip_collab_collab_song", "wip_collaborations", "collaborator, song_id"),
                
                # Song progress - for completion data queries
                # This matches: WHERE song_id IN (...) AND is_completed = TRUE
                ("idx_song_progress_song_completed", "song_progress", "song_id, is_completed"),
                ("idx_song_progress_completed_at", "song_progress", "completed_at DESC" if is_postgres else "completed_at"),
                
                # Packs - for pack completion queries
                # This matches: WHERE user_id = X JOIN songs WHERE pack_id = Y AND status = 'In Progress'
                ("idx_packs_user_id", "packs", "user_id"),
                
                # Songs - for pack completion queries
                # This matches: WHERE pack_id IN (...) AND status = 'In Progress' AND (optional = FALSE OR optional IS NULL)
                ("idx_songs_pack_status_optional", "songs", "pack_id, status, optional"),
                
                # User workflows - for workflow field lookups
                ("idx_user_workflows_user_id", "user_workflows", "user_id"),
                ("idx_user_workflow_steps_workflow", "user_workflow_steps", "workflow_id, order_index"),
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
                print("\n✅ Dashboard performance improvements added:")
                print("   - Faster 'pick up where you left off' queries")
                print("   - Faster collaborator waiting detection")
                print("   - Faster pack completion calculations")
                print("   - Faster completion data lookups")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("Dashboard Performance Indexes Migration")
    print("========================================")
    run_migration()




