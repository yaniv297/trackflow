#!/usr/bin/env python3

import sys
import os
sys.path.append('.')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Pack, Song, User
from datetime import datetime, timedelta

# Setup database connection
SQLALCHEMY_DATABASE_URL = "sqlite:///./songs.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def inspect_recent_packs():
    db = SessionLocal()
    try:
        print("=== ANALYZING RECENT PACK RELEASES FOR HOMEPAGE ===\n")
        
        # Calculate cutoff date (30 days back)
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        print(f"Cutoff date (30 days back): {cutoff_date}\n")
        
        # First, let's see ALL packs regardless of filters
        print("1. ALL PACKS (regardless of release status):")
        all_packs = db.query(Pack).order_by(Pack.created_at.desc()).limit(10).all()
        for pack in all_packs:
            print(f"  Pack ID {pack.id}: '{pack.name}'")
            print(f"    - created_at: {pack.created_at}")
            print(f"    - released_at: {pack.released_at}")
            print(f"    - Has songs with released_at: {any(s.released_at for s in pack.songs if s.status == 'Released')}")
            print()
        
        # Now let's try the exact query from get_recent_pack_releases
        print("2. PACKS MATCHING HOMEPAGE QUERY (current logic):")
        homepage_packs = db.query(Pack).join(Song).filter(
            Song.status == "Released",
            Song.released_at.isnot(None),
            Song.released_at != '',
            Pack.released_at.isnot(None),
            Pack.released_at != '',
            Pack.released_at >= cutoff_date
        ).group_by(Pack.id).order_by(Pack.released_at.desc()).limit(10).all()
        
        print(f"Found {len(homepage_packs)} packs matching homepage query:")
        for pack in homepage_packs:
            print(f"  Pack ID {pack.id}: '{pack.name}'")
            print(f"    - released_at: {pack.released_at}")
            released_songs = [s for s in pack.songs if s.status == "Released" and s.released_at]
            print(f"    - Released songs: {len(released_songs)}")
            for song in released_songs:
                print(f"      * {song.title} by {song.artist} (released: {song.released_at})")
            print()
        
        # Let's check for packs that should be hidden
        print("3. CHECKING FOR PACKS THAT SHOULD BE HIDDEN:")
        print("   (Packs with released_at=None but have released songs)")
        
        hidden_packs = db.query(Pack).join(Song).filter(
            Song.status == "Released",
            Song.released_at.isnot(None),
            Pack.released_at.is_(None)  # Should be hidden
        ).group_by(Pack.id).all()
        
        print(f"Found {len(hidden_packs)} hidden packs:")
        for pack in hidden_packs:
            print(f"  Pack ID {pack.id}: '{pack.name}'")
            print(f"    - released_at: {pack.released_at} (should be None)")
            released_songs = [s for s in pack.songs if s.status == "Released" and s.released_at]
            print(f"    - Released songs: {len(released_songs)}")
            for song in released_songs:
                print(f"      * {song.title} by {song.artist} (released: {song.released_at})")
            print()
        
        # Check for any inconsistencies
        print("4. POTENTIAL INCONSISTENCIES:")
        print("   (Songs marked as Released with released_at, but pack has released_at=None)")
        
        inconsistent_query = db.query(Song).join(Pack).filter(
            Song.status == "Released",
            Song.released_at.isnot(None),
            Pack.released_at.is_(None)
        ).all()
        
        print(f"Found {len(inconsistent_query)} songs in inconsistent state:")
        for song in inconsistent_query:
            print(f"  Song ID {song.id}: '{song.title}' by {song.artist}")
            print(f"    - Song released_at: {song.released_at}")
            print(f"    - Pack '{song.pack_obj.name}' released_at: {song.pack_obj.released_at}")
            print()
            
    finally:
        db.close()

if __name__ == "__main__":
    inspect_recent_packs()