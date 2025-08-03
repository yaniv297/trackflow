#!/usr/bin/env python3
"""
Migration script to convert TrackFlow from single-user to multi-user system.
This script will:
1. Create the new users table
2. Create a default user (yaniv297) from existing data
3. Update existing songs to belong to the default user
4. Update existing artists to belong to the default user
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import Base, User, Song, Artist
from auth import get_password_hash
from dotenv import load_dotenv

load_dotenv()

def get_database_url():
    """Get database URL from environment or use default SQLite"""
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    return "sqlite:///songs.db"

def migrate_to_multi_user():
    """Perform the migration to multi-user system"""
    print("🚀 Starting migration to multi-user system...")
    
    # Create database engine
    database_url = get_database_url()
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create all tables (including new users table)
    print("📋 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if migration has already been run
        existing_user = db.query(User).filter(User.username == "yaniv297").first()
        if existing_user:
            print("✅ Migration already completed. Default user 'yaniv297' already exists.")
            return
        
        # Create default user
        print("👤 Creating default user 'yaniv297'...")
        default_user = User(
            username="yaniv297",
            email="yaniv297@example.com",  # You can update this later
            hashed_password=get_password_hash("changeme123"),  # You should change this password
            is_active=True
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)
        print(f"✅ Created default user with ID: {default_user.id}")
        
        # Update existing songs to belong to the default user
        print("🎵 Updating existing songs...")
        songs_to_update = db.query(Song).filter(Song.user_id.is_(None)).all()
        print(f"Found {len(songs_to_update)} songs to update")
        
        for song in songs_to_update:
            song.user_id = default_user.id
            # Also ensure author field is set
            if not song.author:
                song.author = "yaniv297"
        
        db.commit()
        print(f"✅ Updated {len(songs_to_update)} songs")
        
        # Update existing artists to belong to the default user
        print("🎤 Updating existing artists...")
        artists_to_update = db.query(Artist).filter(Artist.user_id.is_(None)).all()
        print(f"Found {len(artists_to_update)} artists to update")
        
        for artist in artists_to_update:
            artist.user_id = default_user.id
        
        db.commit()
        print(f"✅ Updated {len(artists_to_update)} artists")
        
        # Verify migration
        total_songs = db.query(Song).filter(Song.user_id == default_user.id).count()
        total_artists = db.query(Artist).filter(Artist.user_id == default_user.id).count()
        
        print(f"✅ Migration completed successfully!")
        print(f"   - Default user: yaniv297 (ID: {default_user.id})")
        print(f"   - Songs assigned: {total_songs}")
        print(f"   - Artists assigned: {total_artists}")
        print(f"   - Default password: changeme123 (PLEASE CHANGE THIS!)")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_to_multi_user() 