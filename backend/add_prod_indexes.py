#!/usr/bin/env python3
"""
Add performance indexes to production Supabase database
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def add_production_indexes():
    """Add performance indexes to production Supabase database"""
    
    # Get production database URL from environment
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set!")
        print("Please set your Supabase database URL:")
        print("export DATABASE_URL='postgresql://username:password@host:port/database'")
        return
    
    if not database_url.startswith("postgresql"):
        print("❌ This script is designed for PostgreSQL/Supabase databases!")
        return
    
    print(f"🔗 Connecting to production database...")
    engine = create_engine(database_url)
    
    # Create a session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("📊 Adding performance indexes to production database...")
        
        # Add indexes for collaborations table
        print("🔗 Adding collaboration indexes...")
        
        # Index for user_id + collaboration_type (most common query)
        db.execute(text("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_user_type 
            ON collaborations (user_id, collaboration_type)
        """))
        
        # Index for song_id + user_id
        db.execute(text("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_song_user 
            ON collaborations (song_id, user_id)
        """))
        
        # Index for pack_id + user_id
        db.execute(text("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_pack_user 
            ON collaborations (pack_id, user_id)
        """))
        
        # Add indexes for songs table
        print("🎵 Adding song indexes...")
        
        # Index for user_id + status
        db.execute(text("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_user_status 
            ON songs (user_id, status)
        """))
        
        # Index for pack_id + status
        db.execute(text("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_pack_status 
            ON songs (pack_id, status)
        """))
        
        # Index for artist + title (for sorting)
        db.execute(text("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_artist_title 
            ON songs (artist, title)
        """))
        
        # Add individual column indexes if they don't exist
        print("📋 Adding individual column indexes...")
        
        # Collaboration table individual indexes
        db.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_pack_id ON collaborations (pack_id)"))
        db.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_song_id ON collaborations (song_id)"))
        db.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_user_id ON collaborations (user_id)"))
        db.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collab_type ON collaborations (collaboration_type)"))
        
        # Song table individual indexes
        db.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_user_id ON songs (user_id)"))
        db.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_pack_id ON songs (pack_id)"))
        db.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_song_album_series_id ON songs (album_series_id)"))
        
        # Pack table indexes
        print("📦 Adding pack indexes...")
        db.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pack_user_id ON packs (user_id)"))
        
        # Commit the changes
        db.commit()
        
        print("✅ Performance indexes added successfully to production!")
        
        # Show the new indexes
        print("\n📊 New indexes created:")
        result = db.execute(text("""
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE indexname LIKE 'idx_%' 
            ORDER BY tablename, indexname
        """))
        
        for row in result:
            print(f"  {row.indexname} on {row.tablename}")
            
        # Show index usage statistics
        print("\n📈 Index usage statistics:")
        result = db.execute(text("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan as scans,
                idx_tup_read as tuples_read,
                idx_tup_fetch as tuples_fetched
            FROM pg_stat_user_indexes 
            WHERE indexname LIKE 'idx_%'
            ORDER BY idx_scan DESC
        """))
        
        for row in result:
            print(f"  {row.indexname}: {row.scans} scans, {row.tuples_read} tuples read")
            
    except Exception as e:
        print(f"❌ Error adding indexes: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_production_indexes() 