#!/usr/bin/env python3
"""
Rock Band DLC Import Tool

This script imports Rock Band DLC data from a Google Sheet into the database.
It supports multiple import methods:
1. Direct CSV download from Google Sheets
2. Google Sheets API (requires credentials)
3. Manual CSV file upload

Usage:
    python import_rockband_dlc.py --method csv --file dlc_data.csv
    python import_rockband_dlc.py --method sheets --url "https://docs.google.com/spreadsheets/d/..."
    python import_rockband_dlc.py --method api --sheet-id "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
"""

import sys
import os
import csv
import argparse
import requests
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from database import SessionLocal
from models import RockBandDLC, Song
import re
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def clean_string(text: str) -> str:
    """Clean and normalize string data"""
    if not text:
        return ""
    # Remove extra whitespace and normalize
    cleaned = re.sub(r'\s+', ' ', str(text).strip())
    return cleaned

def parse_year(year_str: str) -> Optional[int]:
    """Parse year from various formats"""
    if not year_str:
        return None
    
    year_str = str(year_str).strip()
    
    # Try to extract year from various formats
    # "2008" -> 2008
    if year_str.isdigit() and len(year_str) == 4:
        year = int(year_str)
        if 1900 <= year <= 2030:
            return year
    
    # "2008-01-15" -> 2008
    if '-' in year_str:
        parts = year_str.split('-')
        if parts[0].isdigit() and len(parts[0]) == 4:
            year = int(parts[0])
            if 1900 <= year <= 2030:
                return year
    
    # "01/15/2008" -> 2008
    if '/' in year_str:
        parts = year_str.split('/')
        if len(parts) == 3 and parts[2].isdigit() and len(parts[2]) == 4:
            year = int(parts[2])
            if 1900 <= year <= 2030:
                return year
    
    return None

def download_google_sheet_as_csv(sheet_url: str) -> str:
    """Download Google Sheet as CSV"""
    # Convert Google Sheets URL to CSV export URL
    if '/spreadsheets/d/' in sheet_url:
        sheet_id = sheet_url.split('/spreadsheets/d/')[1].split('/')[0]
        csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid=0"
    else:
        raise ValueError("Invalid Google Sheets URL")
    
    response = requests.get(csv_url)
    response.raise_for_status()
    
    # Save to temporary file
    temp_file = f"temp_dlc_import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    with open(temp_file, 'w', newline='', encoding='utf-8') as f:
        f.write(response.text)
    
    return temp_file

def parse_csv_file(file_path: str) -> List[Dict]:
    """Parse CSV file and return list of dictionaries"""
    dlc_entries = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Clean and process the data
            title = clean_string(row.get('Song', ''))
            artist = clean_string(row.get('Artist', ''))
            origin = clean_string(row.get('Origin', ''))
            
            # Only add if we have at least title and artist
            if title and artist:
                entry = {
                    'title': title,
                    'artist': artist,
                    'origin': origin or 'Unknown'
                }
                dlc_entries.append(entry)
    
    return dlc_entries

def import_dlc_to_database(dlc_entries: List[Dict], db: Session, dry_run: bool = False) -> Dict:
    """Import DLC entries to database"""
    stats = {
        'total_processed': 0,
        'new_entries': 0,
        'duplicates_skipped': 0,
        'errors': 0
    }
    
    for entry in dlc_entries:
        stats['total_processed'] += 1
        
        try:
            # Check if this DLC already exists (case insensitive)
            existing = db.query(RockBandDLC).filter(
                RockBandDLC.title.ilike(entry['title']),
                RockBandDLC.artist.ilike(entry['artist'])
            ).first()
            
            if existing:
                stats['duplicates_skipped'] += 1
                print(f"⏩ Skipping duplicate: {entry['artist']} - {entry['title']}")
                continue
            
            if not dry_run:
                # Create new DLC entry
                dlc = RockBandDLC(**entry)
                db.add(dlc)
                stats['new_entries'] += 1
                print(f"✅ Added: {entry['artist']} - {entry['title']}")
            else:
                stats['new_entries'] += 1
                print(f"🔍 Would add: {entry['artist']} - {entry['title']}")
                
        except Exception as e:
            stats['errors'] += 1
            print(f"❌ Error processing {entry.get('artist', 'Unknown')} - {entry.get('title', 'Unknown')}: {str(e)}")
    
    if not dry_run:
        db.commit()
    
    return stats

def link_dlc_to_songs(db: Session, dry_run: bool = False) -> Dict:
    """Attempt to link DLC entries to existing songs in the database"""
    stats = {
        'total_dlc': 0,
        'linked': 0,
        'not_found': 0
    }
    
    # Get all DLC entries that aren't already linked
    unlinked_dlc = db.query(RockBandDLC).filter(RockBandDLC.linked_song_id.is_(None)).all()
    stats['total_dlc'] = len(unlinked_dlc)
    
    for dlc in unlinked_dlc:
        # Try to find matching song by artist and title
        matching_song = db.query(Song).filter(
            Song.artist.ilike(f"%{dlc.artist}%"),
            Song.title.ilike(f"%{dlc.title}%")
        ).first()
        
        if matching_song:
            if not dry_run:
                dlc.linked_song_id = matching_song.id
                db.add(dlc)
                stats['linked'] += 1
                print(f"🔗 Linked: {dlc.artist} - {dlc.title} -> Song ID {matching_song.id}")
            else:
                stats['linked'] += 1
                print(f"🔍 Would link: {dlc.artist} - {dlc.title} -> Song ID {matching_song.id}")
        else:
            stats['not_found'] += 1
            print(f"❓ No match found: {dlc.artist} - {dlc.title}")
    
    if not dry_run:
        db.commit()
    
    return stats

def main():
    parser = argparse.ArgumentParser(description='Import Rock Band DLC data from Google Sheets')
    parser.add_argument('--method', choices=['csv', 'sheets', 'api'], required=True,
                       help='Import method: csv (local file), sheets (direct download), api (Google Sheets API)')
    parser.add_argument('--file', help='CSV file path (for csv method)')
    parser.add_argument('--url', help='Google Sheets URL (for sheets method)')
    parser.add_argument('--sheet-id', help='Google Sheet ID (for api method)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be imported without actually importing')
    parser.add_argument('--link-songs', action='store_true', help='Attempt to link DLC to existing songs after import')
    
    args = parser.parse_args()
    
    db = SessionLocal()
    
    try:
        # Get the data
        if args.method == 'csv':
            if not args.file:
                print("❌ Error: --file is required for csv method")
                sys.exit(1)
            file_path = args.file
            dlc_entries = parse_csv_file(file_path)
            
        elif args.method == 'sheets':
            if not args.url:
                print("❌ Error: --url is required for sheets method")
                sys.exit(1)
            file_path = download_google_sheet_as_csv(args.url)
            dlc_entries = parse_csv_file(file_path)
            # Clean up temp file
            os.remove(file_path)
            
        elif args.method == 'api':
            print("❌ Google Sheets API method not yet implemented")
            print("Please use the 'sheets' method for direct download")
            sys.exit(1)
        
        print(f"📊 Found {len(dlc_entries)} DLC entries to process")
        
        # Import to database
        import_stats = import_dlc_to_database(dlc_entries, db, args.dry_run)
        
        print(f"\n📈 Import Statistics:")
        print(f"   Total processed: {import_stats['total_processed']}")
        print(f"   New entries: {import_stats['new_entries']}")
        print(f"   Duplicates skipped: {import_stats['duplicates_skipped']}")
        print(f"   Errors: {import_stats['errors']}")
        
        # Link to existing songs if requested
        if args.link_songs:
            print(f"\n🔗 Linking DLC to existing songs...")
            link_stats = link_dlc_to_songs(db, args.dry_run)
            
            print(f"\n🔗 Linking Statistics:")
            print(f"   Total DLC entries: {link_stats['total_dlc']}")
            print(f"   Successfully linked: {link_stats['linked']}")
            print(f"   Not found: {link_stats['not_found']}")
        
        if args.dry_run:
            print(f"\n🔍 This was a dry run. No data was actually imported.")
        else:
            print(f"\n✅ Import completed successfully!")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main() 