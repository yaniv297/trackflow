#!/usr/bin/env python3

"""
Migration: Add RGW post URL field to album_series

This migration:
1. Adds rgw_post_url column to album_series table
2. Populates it with RGW blog post links for applicable albums
"""

import os
import sys
import re
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Mapping of artist/album combinations to RGW post URLs
RGW_LINKS = {
    # Format: (artist_name_lower, album_name_lower): url
    ("the beach boys", "pet sounds"): "https://rhythmgamingworld.com/the-album-series-01-pet-sounds-by-the-beach-boys/",
    ("silver jews", "tanglewood numbers"): "https://rhythmgamingworld.com/the-album-series-02-tanglewood-numbers-by-silver-jews/",
    ("joy division", "unknown pleasures"): "https://rhythmgamingworld.com/the-album-series-03-unknown-pleasures-by-joy-division/",
    ("summer salt", "happy camper"): "https://rhythmgamingworld.com/the-album-series-04-happy-camper-by-summer-salt/",
    ("my chemical romance", "the black parade"): "https://rhythmgamingworld.com/the-album-series-05-the-black-parade-by-my-chemical-romance/",
    ("beach bunny", "honeymoon"): "https://rhythmgamingworld.com/the-album-series-06-honeymoon-by-beach-bunny-plus-blame-game-ep/",
    ("beach bunny", "blame game"): "https://rhythmgamingworld.com/the-album-series-06-honeymoon-by-beach-bunny-plus-blame-game-ep/",
    ("jimi hendrix", "band of gypsys"): "https://rhythmgamingworld.com/the-album-series-07-band-of-gypsys-by-jimi-hendrix/",
    ("red hot chili peppers", "unlimited love"): "https://rhythmgamingworld.com/the-album-series-08-unlimited-love-by-red-hot-chili-peppers/",
    ("father john misty", "i love you, honeybear"): "https://rhythmgamingworld.com/the-album-series-09-i-love-you-honeybear-by-father-john-misty/",
    ("king gizzard and the lizard wizard", "infest the rats' nest"): "https://rhythmgamingworld.com/12-days-of-chartmas-2022-day-3-slot-2-infest-the-rats-nest/",
    ("king gizzard and the lizard wizard", "infest the rats nest"): "https://rhythmgamingworld.com/12-days-of-chartmas-2022-day-3-slot-2-infest-the-rats-nest/",
    ("the magnetic fields", "69 love songs"): "https://rhythmgamingworld.com/12-days-of-chartmas-2022-day-6-slot-1-less-than-69-love-songs-by-the-magnetic-fields/",
    ("the stone roses", "the stone roses"): "https://rhythmgamingworld.com/12-days-of-chartmas-2022-day-8-slot-2-made-of-stone/",
    ("george harrison", "all things must pass"): "https://rhythmgamingworld.com/12-days-of-chartmas-2022-day-11-slot-1-all-things-must-pass-by-george-harrison/",
    ("gorky's zygotic mynci", "barafundle"): "https://rhythmgamingworld.com/the-album-series-14-barafundle-by-gorkys-zygotic-mynci/",
    ("gorkys zygotic mynci", "barafundle"): "https://rhythmgamingworld.com/the-album-series-14-barafundle-by-gorkys-zygotic-mynci/",
    ("suede", "autofiction"): "https://rhythmgamingworld.com/the-album-series-15-autofiction-by-suede/",
    ("silver jews", "american water"): "https://rhythmgamingworld.com/the-album-series-16-american-water-by-silver-jews/",
    ("blur", "modern life is rubbish"): "https://rhythmgamingworld.com/the-album-series-17-modern-life-is-rubbish-by-blur/",
    ("r.e.m.", "murmur"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-2-slot-1-murmur-and-more-by-r-e-m/",
    ("rem", "murmur"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-2-slot-1-murmur-and-more-by-r-e-m/",
    ("coldplay", "viva la vida or death and all his friends"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-3-slot-2-viva-la-vida-or-death-and-all-his-friends-by-coldplay/",
    ("coldplay", "viva la vida"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-3-slot-2-viva-la-vida-or-death-and-all-his-friends-by-coldplay/",
    ("cream", "disraeli gears"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-9-slot-1-cream-disraelil-gears/",
    ("tanya donelly", "love songs for underdogs"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-9-slot-2-tanya-donellys-love-songs-for-underdogs-full-album/",
    ("tanya donelly", "lovesongs for underdogs"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-9-slot-2-tanya-donellys-love-songs-for-underdogs-full-album/",
    ("the gaslight anthem", "the '59 sound"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-13-slot-2-the-gaslight-anthems-the-59-sound-full-album/",
    ("the gaslight anthem", "the 59 sound"): "https://rhythmgamingworld.com/chart-a-thon-2023-day-13-slot-2-the-gaslight-anthems-the-59-sound-full-album/",
    ("the breeders", "pod"): "https://rhythmgamingworld.com/the-album-series-23-24-pod-and-last-splash-by-the-breeders/",
    ("the breeders", "last splash"): "https://rhythmgamingworld.com/the-album-series-23-24-pod-and-last-splash-by-the-breeders/",
    ("big star", "1# record"): "https://rhythmgamingworld.com/the-album-series-25-26-1-record-and-radio-city-by-big-star/",
    ("big star", "#1 record"): "https://rhythmgamingworld.com/the-album-series-25-26-1-record-and-radio-city-by-big-star/",
    ("big star", "1 record"): "https://rhythmgamingworld.com/the-album-series-25-26-1-record-and-radio-city-by-big-star/",
    ("big star", "radio city"): "https://rhythmgamingworld.com/the-album-series-25-26-1-record-and-radio-city-by-big-star/",
}

def normalize_string(s):
    """Normalize string for matching: lowercase, remove extra spaces, handle special chars."""
    if not s:
        return ""
    # Convert to lowercase and strip
    s = s.lower().strip()
    # Remove extra spaces
    s = re.sub(r'\s+', ' ', s)
    # Handle apostrophes and quotes
    s = s.replace("'", "'").replace("'", "'")
    s = s.replace('"', '"').replace('"', '"')
    return s

def find_rgw_url(artist_name, album_name):
    """Find RGW URL for given artist and album."""
    artist_norm = normalize_string(artist_name)
    album_norm = normalize_string(album_name)
    
    # Try exact match first
    key = (artist_norm, album_norm)
    if key in RGW_LINKS:
        return RGW_LINKS[key]
    
    # Try partial matches (album name contains)
    for (a, al), url in RGW_LINKS.items():
        if a == artist_norm and al in album_norm:
            return url
        if artist_norm in a and al == album_norm:
            return url
    
    return None

def run_migration():
    """Add rgw_post_url field to album_series table and populate it."""
    db_url = "postgresql://postgres.vhydslrserhdzzqmytie:vyhzwSBNFCVgj2oR@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"
    
    if not db_url:
        print("❌ ERROR: DATABASE_URL not provided!")
        sys.exit(1)

    engine = create_engine(db_url)
    
    # Detect database type
    is_sqlite = "sqlite" in db_url.lower()
    is_postgres = "postgresql" in db_url.lower() or "postgres" in db_url.lower()
    
    print(f"🗄️  Database: {'SQLite' if is_sqlite else 'PostgreSQL' if is_postgres else 'Unknown'}")
    print(f"📍 URL: {db_url[:50]}...")
    print()
    print("Adding rgw_post_url column to album_series table...")

    try:
        with engine.connect() as connection:
            # Check if column already exists
            if is_postgres:
                result = connection.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'album_series' AND column_name = 'rgw_post_url'
                """))
            else:  # SQLite
                result = connection.execute(text("PRAGMA table_info(album_series)"))
                columns = result.fetchall()
                column_exists = any(col[1] == 'rgw_post_url' for col in columns)
                result = iter([(column_exists,)] if column_exists else [])
            
            column_exists = result.fetchone()
            
            if column_exists:
                print("✓ rgw_post_url column already exists")
            else:
                # Add the column
                if is_postgres:
                    connection.execute(text("ALTER TABLE album_series ADD COLUMN rgw_post_url TEXT"))
                else:  # SQLite
                    connection.execute(text("ALTER TABLE album_series ADD COLUMN rgw_post_url TEXT"))
                connection.commit()
                print("✓ Added rgw_post_url column")
            
            # Fetch all album series
            result = connection.execute(text("SELECT id, artist_name, album_name, rgw_post_url FROM album_series"))
            all_series = result.fetchall()
            
            print(f"\nFound {len(all_series)} album series entries")
            
            # Populate RGW URLs
            updated_count = 0
            for series_id, artist_name, album_name, existing_url in all_series:
                # Skip if already has a URL
                if existing_url:
                    continue
                
                rgw_url = find_rgw_url(artist_name, album_name)
                if rgw_url:
                    connection.execute(
                        text("UPDATE album_series SET rgw_post_url = :url WHERE id = :id"),
                        {"url": rgw_url, "id": series_id}
                    )
                    updated_count += 1
                    print(f"  ✓ Updated: {artist_name} - {album_name}")
                else:
                    print(f"  - No match: {artist_name} - {album_name}")
            
            # Commit the changes
            connection.commit()
            print(f"\n✓ Migration completed successfully! Updated {updated_count} entries.")
            
    except OperationalError as e:
        print(f"❌ Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
