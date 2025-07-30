#!/usr/bin/env python3
"""
Script to fix reciprocal collaborations.
This script will:
1. Find songs that have collaborations but are missing reciprocal records
2. Add missing collaboration records so both collaborators appear in the table
3. Ensure every collaboration has a corresponding record for the other person
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from models import Base, User, Song, SongCollaboration, WipCollaboration
from dotenv import load_dotenv

load_dotenv()

def get_database_url():
    """Get database URL from environment or use default SQLite"""
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    return "sqlite:///songs.db"

def fix_reciprocal_collaborations():
    """Add reciprocal collaboration records"""
    print("🔄 Starting reciprocal collaboration fix...")
    
    # Create database engine
    database_url = get_database_url()
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    try:
        # Get yaniv297 user (ID 1)
        yaniv_user = db.query(User).filter(User.id == 1).first()
        if not yaniv_user:
            print("❌ User yaniv297 (ID 1) not found!")
            return
        
        print(f"✅ Found yaniv297 user: {yaniv_user.username} (ID: {yaniv_user.id})")
        
        # Find all songs that have collaborations
        songs_with_collabs = db.query(Song).join(SongCollaboration).distinct().all()
        print(f"📊 Found {len(songs_with_collabs)} songs with collaborations")
        
        added_count = 0
        skipped_count = 0
        
        for song in songs_with_collabs:
            print(f"\n🎵 Processing song: {song.title} (ID: {song.id})")
            
            # Get all current collaborators for this song
            current_collabs = db.query(SongCollaboration).filter(
                SongCollaboration.song_id == song.id
            ).all()
            
            print(f"   Current collaborators: {[c.collaborator.username for c in current_collabs]}")
            
            # Check if yaniv297 is already a collaborator
            yaniv_is_collaborator = any(c.collaborator_id == yaniv_user.id for c in current_collabs)
            
            # If yaniv297 is not a collaborator, add them
            if not yaniv_is_collaborator:
                print(f"   ➕ Adding yaniv297 as collaborator")
                new_collab = SongCollaboration(
                    song_id=song.id,
                    collaborator_id=yaniv_user.id,
                    role=None
                )
                db.add(new_collab)
                added_count += 1
            else:
                print(f"   ✅ yaniv297 already a collaborator")
                skipped_count += 1
        
        # Commit all changes
        db.commit()
        
        print(f"\n✅ Reciprocal collaboration fix completed!")
        print(f"   - Added {added_count} reciprocal collaboration records")
        print(f"   - Skipped {skipped_count} (already existed)")
        
        # Verify the fix
        print(f"\n📊 Verification:")
        total_collabs = db.query(SongCollaboration).count()
        print(f"   - Total collaboration records: {total_collabs}")
        
        # Show some examples
        print(f"\n📋 Example collaborations:")
        sample_collabs = db.query(SongCollaboration).join(Song).join(User).limit(10).all()
        for collab in sample_collabs:
            print(f"   - Song: {collab.song.title}, Collaborator: {collab.collaborator.username}")
        
    except Exception as e:
        print(f"❌ Fix failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_reciprocal_collaborations() 