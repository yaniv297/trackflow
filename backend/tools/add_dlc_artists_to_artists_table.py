#!/usr/bin/env python3
"""
Migration script to add all artists from Rock Band DLC table to artists table.
Excludes RBN1 and RBN2 songs, fetches Spotify images for the artists.
"""

import os
import sys
import time
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials

# Add the parent directory to the path so we can import our models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import RockBandDLC, Artist
from database import get_db

# Spotify credentials
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "7939abf6b76d4fc7a627869350dbe3d7")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "b1aefd1ba3504dc28a441b1344698bd9")

def get_spotify_client():
    """Get Spotify client with credentials"""
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        print("Warning: No Spotify credentials found, will skip image fetching")
        return None
    
    auth = SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
    )
    return Spotify(auth_manager=auth)

def fetch_artist_image(spotify_client, artist_name):
    """Fetch artist image from Spotify"""
    if not spotify_client:
        return None
    
    try:
        # Add a small delay to avoid rate limiting
        time.sleep(0.1)
        
        search = spotify_client.search(q=f"artist:{artist_name}", type="artist", limit=1)
        items = (search.get("artists") or {}).get("items") or []
        if items and (items[0].get("images") or []):
            return items[0]["images"][0].get("url")
    except Exception as e:
        print(f"Error fetching image for {artist_name}: {e}")
        # Add longer delay on error to be safe
        time.sleep(1)
    
    return None

def main():
    """Main migration function"""
    print("Starting migration: Adding DLC artists to artists table...")
    
    # Get database session
    db = next(get_db())
    
    # Get Spotify client
    spotify_client = get_spotify_client()
    
    # Check if we should resume from a specific point
    resume_from = None
    if len(sys.argv) > 1:
        try:
            resume_from = int(sys.argv[1])
            print(f"Resuming from artist #{resume_from}")
        except ValueError:
            print("Usage: python add_dlc_artists_to_artists_table.py [resume_from_number]")
            return
    
    try:
        # Test database connection
        print("Testing database connection...")
        dlc_count = db.query(RockBandDLC).count()
        artist_count = db.query(Artist).count()
        print(f"Database connection OK. Found {dlc_count} DLC entries and {artist_count} existing artists.")
        
        # Get all unique artists from Rock Band DLC table, excluding RBN1 and RBN2
        print("Fetching artists from Rock Band DLC table...")
        dlc_artists = db.query(RockBandDLC.artist).filter(
            RockBandDLC.origin.notin_(["RBN1", "RBN2"])
        ).distinct().all()
        
        print(f"Found {len(dlc_artists)} unique artists (excluding RBN1/RBN2)")
        
        # Get existing artists to avoid duplicates
        existing_artists = {artist.name for artist in db.query(Artist.name).all()}
        print(f"Found {len(existing_artists)} existing artists in database")
        
        # Process each artist
        added_count = 0
        skipped_count = 0
        processed_count = 0
        
        for (artist_name,) in dlc_artists:
            processed_count += 1
            
            # Skip if resuming from a specific point
            if resume_from and processed_count < resume_from:
                continue
            if not artist_name or artist_name.strip() == "":
                continue
                
            artist_name = artist_name.strip()
            
            if artist_name in existing_artists:
                print(f"Skipping {artist_name} (already exists)")
                skipped_count += 1
                continue
            
            print(f"Processing {artist_name}... (artist #{processed_count}/{len(dlc_artists)})")
            
            # Fetch Spotify image
            image_url = fetch_artist_image(spotify_client, artist_name)
            if image_url:
                print(f"  Found Spotify image for {artist_name}")
            else:
                print(f"  No Spotify image found for {artist_name}")
            
            # Create new artist
            new_artist = Artist(
                name=artist_name,
                image_url=image_url
            )
            
            db.add(new_artist)
            added_count += 1
            
            # Commit every 5 artists to avoid long transactions and provide more frequent feedback
            if added_count % 5 == 0:
                db.commit()
                print(f"Committed {added_count} artists so far...")
                # Verify the commit worked
                db.refresh(new_artist)
                print(f"  Verified: {new_artist.name} added with ID {new_artist.id}")
                # Add a small break every 5 artists
                time.sleep(0.5)
        
        # Final commit
        db.commit()
        
        print(f"\nMigration completed!")
        print(f"Added {added_count} new artists")
        print(f"Skipped {skipped_count} existing artists")
        print(f"Total artists in database: {db.query(Artist).count()}")
        
        # Double-check by querying for some recently added artists
        print("\nVerifying recent additions...")
        recent_artists = db.query(Artist).order_by(Artist.id.desc()).limit(5).all()
        for artist in recent_artists:
            print(f"  - {artist.name} (ID: {artist.id})")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main() 