#!/usr/bin/env python3
"""
Test script to import Rock Band DLC from the provided Google Sheet
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.import_rockband_dlc import download_google_sheet_as_csv, parse_csv_file, import_dlc_to_database
from database import SessionLocal

def main():
    # The Google Sheet URL you provided
    sheet_url = "https://docs.google.com/spreadsheets/d/1gQaNlXOMxGxTt1LRs1y8pQpc3PwNvgeM9DCRqfjqAZw/edit?usp=sharing"
    
    print("🎸 Importing Rock Band DLC data...")
    print(f"📊 Source: {sheet_url}")
    
    try:
        # Download the sheet as CSV
        print("⬇️ Downloading Google Sheet as CSV...")
        csv_file = download_google_sheet_as_csv(sheet_url)
        
        # Parse the CSV
        print("📖 Parsing CSV data...")
        dlc_entries = parse_csv_file(csv_file)
        
        print(f"📊 Found {len(dlc_entries)} DLC entries")
        
        # Show a few examples
        print("\n📋 Sample entries:")
        for i, entry in enumerate(dlc_entries[:5]):
            print(f"  {i+1}. {entry['artist']} - {entry['title']} ({entry['origin']})")
        
        if len(dlc_entries) > 5:
            print(f"  ... and {len(dlc_entries) - 5} more")
        
        # Ask for confirmation
        response = input(f"\n🤔 Import {len(dlc_entries)} DLC entries? (y/N): ")
        if response.lower() != 'y':
            print("❌ Import cancelled")
            os.remove(csv_file)
            return
        
        # Import to database
        print("💾 Importing to database...")
        db = SessionLocal()
        
        try:
            stats = import_dlc_to_database(dlc_entries, db, dry_run=False)
            
            print(f"\n✅ Import completed!")
            print(f"📈 Statistics:")
            print(f"   Total processed: {stats['total_processed']}")
            print(f"   New entries: {stats['new_entries']}")
            print(f"   Duplicates skipped: {stats['duplicates_skipped']}")
            print(f"   Errors: {stats['errors']}")
            
        finally:
            db.close()
        
        # Clean up
        os.remove(csv_file)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 