#!/usr/bin/env python3
"""
Script to populate rock_band_dlc table with official DLC data
Run this after creating the table in production
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import text
from database import engine

# Official Rock Band DLC data
ROCK_BAND_DLC = [
    # Add your DLC data here
    # Example format:
    # ("Song Title", "Artist Name", "Game", "DLC Type", "Release Date"),
    # ("Born Alone", "Wilco", "Rock Band 4", "DLC", "2016-01-01"),
    # ("Forget the Flowers", "Wilco", "Rock Band 4", "DLC", "2016-01-01"),
    
    # You can either:
    # 1. Add the data manually here
    # 2. Import from a CSV file
    # 3. Copy from your local database if you have it
]

def populate_dlc():
    with engine.connect() as conn:
        print("Populating rock_band_dlc table...")
        
        # Check if table exists
        result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rock_band_dlc')"))
        if not result.scalar():
            print("❌ rock_band_dlc table doesn't exist. Run the migration first.")
            return
        
        # Check if data already exists
        result = conn.execute(text("SELECT COUNT(*) FROM rock_band_dlc"))
        count = result.scalar()
        if count > 0:
            print(f"⏩ rock_band_dlc table already has {count} entries")
            response = input("Do you want to clear and repopulate? (y/N): ")
            if response.lower() != 'y':
                print("Skipping population")
                return
            conn.execute(text("DELETE FROM rock_band_dlc"))
            print("Cleared existing data")
        
        # Insert DLC data
        if ROCK_BAND_DLC:
            for title, artist, game, dlc_type, release_date in ROCK_BAND_DLC:
                conn.execute(text("""
                    INSERT INTO rock_band_dlc (title, artist, game, dlc_type, release_date)
                    VALUES (:title, :artist, :game, :dlc_type, :release_date)
                """), {
                    "title": title,
                    "artist": artist,
                    "game": game,
                    "dlc_type": dlc_type,
                    "release_date": release_date
                })
            print(f"✅ Inserted {len(ROCK_BAND_DLC)} DLC entries")
        else:
            print("⚠️  No DLC data defined in ROCK_BAND_DLC list")
            print("Please add your DLC data to the script or import from a file")
        
        conn.commit()
        print("✅ Population completed")

if __name__ == "__main__":
    try:
        populate_dlc()
    except Exception as e:
        print(f"❌ Population failed: {e}")
        sys.exit(1) 