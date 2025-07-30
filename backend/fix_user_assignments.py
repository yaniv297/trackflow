#!/usr/bin/env python3
"""
Script to properly fix user assignments for existing songs and artists.
This script will:
1. Create users for different authors found in the songs
2. Assign songs to the correct users based on the author field
3. Only assign songs to yaniv297 if they actually belong to that user
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

def fix_user_assignments():
    """Fix user assignments for existing data"""
    print("🔧 Fixing user assignments properly...")
    
    # Create database engine
    database_url = get_database_url()
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    try:
        # First, let's see what authors we have in the database
        print("📊 Analyzing existing authors...")
        authors = db.query(Song.author).distinct().all()
        authors = [author[0] for author in authors if author[0]]  # Remove None values
        print(f"Found {len(authors)} unique authors: {authors}")
        
        # Create a mapping of author to user
        author_to_user = {}
        
        # Handle the default user (yaniv297) first
        default_user = db.query(User).filter(User.username == "yaniv297").first()
        if not default_user:
            print("❌ Default user 'yaniv297' not found. Creating it...")
            default_user = User(
                username="yaniv297",
                email="yaniv297@example.com",
                hashed_password=get_password_hash("changeme123"),
                is_active=True
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            print(f"✅ Created default user: {default_user.username} (ID: {default_user.id})")
        
        # Assign yaniv297 songs to the default user
        yaniv_songs = db.query(Song).filter(Song.author == "yaniv297").all()
        for song in yaniv_songs:
            song.user_id = default_user.id
        db.commit()
        print(f"✅ Assigned {len(yaniv_songs)} songs to yaniv297")
        
        # For other authors, create new users and assign their songs
        for author in authors:
            if author == "yaniv297":
                continue  # Already handled
                
            # Check if user already exists
            existing_user = db.query(User).filter(User.username == author).first()
            if existing_user:
                user = existing_user
                print(f"👤 Found existing user: {user.username} (ID: {user.id})")
            else:
                # Create new user for this author
                user = User(
                    username=author,
                    email=f"{author}@example.com",  # Placeholder email
                    hashed_password=get_password_hash("changeme123"),  # Default password
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"👤 Created new user: {user.username} (ID: {user.id})")
            
            author_to_user[author] = user
            
            # Assign songs to this user
            author_songs = db.query(Song).filter(Song.author == author).all()
            for song in author_songs:
                song.user_id = user.id
            db.commit()
            print(f"✅ Assigned {len(author_songs)} songs to {author}")
        
        # Handle songs with no author (assign to yaniv297 as default)
        no_author_songs = db.query(Song).filter(Song.author.is_(None)).all()
        for song in no_author_songs:
            song.user_id = default_user.id
            song.author = "yaniv297"  # Set the author field
        db.commit()
        print(f"✅ Assigned {len(no_author_songs)} songs with no author to yaniv297")
        
        # Update artists - assign them to the user who has the most songs by that artist
        print("🎤 Updating artist assignments...")
        artists_to_update = db.query(Artist).filter(Artist.user_id.is_(None)).all()
        print(f"Found {len(artists_to_update)} artists to update")
        
        for artist in artists_to_update:
            # Find which user has the most songs by this artist
            artist_songs = db.query(Song).filter(Song.artist_id == artist.id).all()
            if artist_songs:
                # Group songs by user_id and find the most common
                user_counts = {}
                for song in artist_songs:
                    if song.user_id:
                        user_counts[song.user_id] = user_counts.get(song.user_id, 0) + 1
                
                if user_counts:
                    # Assign artist to the user with the most songs
                    most_common_user_id = max(user_counts, key=user_counts.get)
                    artist.user_id = most_common_user_id
                    print(f"✅ Assigned artist '{artist.name}' to user ID {most_common_user_id} ({user_counts[most_common_user_id]} songs)")
        
        db.commit()
        
        # Verify the fix
        print("\n📊 Final Summary:")
        users = db.query(User).all()
        for user in users:
            song_count = db.query(Song).filter(Song.user_id == user.id).count()
            artist_count = db.query(Artist).filter(Artist.user_id == user.id).count()
            print(f"   - {user.username} (ID: {user.id}): {song_count} songs, {artist_count} artists")
        
        print(f"\n✅ User assignments fixed successfully!")
        print(f"   - Total users created: {len(users)}")
        print(f"   - Default password for all users: changeme123 (PLEASE CHANGE!)")
        
    except Exception as e:
        print(f"❌ Fix failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_user_assignments() 