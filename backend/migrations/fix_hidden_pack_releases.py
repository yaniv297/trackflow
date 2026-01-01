#!/usr/bin/env python3
"""
Backfill script to fix packs that should be hidden from homepage but are showing.

This script identifies packs that have release metadata but might have been intended
to be hidden. Since we don't have historical data about which packs were released
with hide_from_homepage=True, this script provides a way to manually review and fix them.

Usage:
    python backend/migrations/fix_hidden_pack_releases.py [--dry-run] [--fix-all]
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Pack, Song
from datetime import datetime

# Setup database connection
from database import get_db, engine, SessionLocal

def find_potentially_hidden_packs(db, dry_run=True):
    """
    Find packs that have release metadata but released_at=None.
    These might be packs that were intended to be hidden but the bug prevented it.
    
    Also find packs that have released_at set but might need to be hidden.
    """
    print("=" * 80)
    print("FIXING HIDDEN PACK RELEASES")
    print("=" * 80)
    print()
    
    # Find packs with release metadata but no released_at (should be hidden)
    packs_with_metadata_but_no_release = db.query(Pack).filter(
        Pack.release_title.isnot(None),
        Pack.release_title != '',
        Pack.released_at.is_(None)
    ).all()
    
    print(f"Found {len(packs_with_metadata_but_no_release)} packs with release metadata but released_at=None")
    print("(These are correctly hidden from homepage)")
    print()
    
    # Find packs with released_at set (currently showing on homepage)
    # These are the ones that might need to be hidden
    packs_showing_on_homepage = db.query(Pack).filter(
        Pack.released_at.isnot(None),
        Pack.release_title.isnot(None),
        Pack.release_title != ''
    ).order_by(Pack.released_at.desc()).all()
    
    print(f"Found {len(packs_showing_on_homepage)} packs currently showing on homepage")
    print()
    print("=" * 80)
    print("PACKS CURRENTLY SHOWING ON HOMEPAGE (may need to be hidden):")
    print("=" * 80)
    print()
    
    for pack in packs_showing_on_homepage:
        released_songs = [s for s in pack.songs if s.status == "Released" and s.released_at]
        print(f"Pack ID: {pack.id}")
        print(f"  Name: {pack.name}")
        print(f"  Owner ID: {pack.user_id}")
        print(f"  Released At: {pack.released_at}")
        print(f"  Release Title: {pack.release_title}")
        print(f"  Has Release Description: {bool(pack.release_description)}")
        print(f"  Has Download Link: {bool(pack.release_download_link)}")
        print(f"  Has YouTube URL: {bool(pack.release_youtube_url)}")
        print(f"  Released Songs: {len(released_songs)}")
        print()
    
    print("=" * 80)
    print("INSTRUCTIONS:")
    print("=" * 80)
    print()
    print("This script cannot automatically determine which packs should be hidden")
    print("because we don't have historical data about which packs were released")
    print("with 'hide_from_homepage' checked.")
    print()
    print("To fix packs that should be hidden:")
    print("1. Review the list above and identify packs that should be hidden")
    print("2. Manually set their released_at to None in the database:")
    print("   UPDATE packs SET released_at = NULL WHERE id = <pack_id>;")
    print()
    print("OR use the --fix-pack-id option to fix a specific pack:")
    print("   python backend/migrations/fix_hidden_pack_releases.py --fix-pack-id <id>")
    print()
    
    return packs_showing_on_homepage


def fix_pack(db, pack_id, dry_run=True):
    """Fix a specific pack by setting released_at to None."""
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        print(f"❌ Pack {pack_id} not found")
        return False
    
    if pack.released_at is None:
        print(f"✅ Pack {pack_id} already has released_at=None (already hidden)")
        return True
    
    print(f"Pack {pack_id}: '{pack.name}'")
    print(f"  Current released_at: {pack.released_at}")
    
    if dry_run:
        print(f"  [DRY RUN] Would set released_at to None")
        return True
    else:
        pack.released_at = None
        db.commit()
        print(f"  ✅ Set released_at to None (pack is now hidden from homepage)")
        return True


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix hidden pack releases')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Show what would be done without making changes')
    parser.add_argument('--fix-pack-id', type=int,
                       help='Fix a specific pack by setting released_at to None')
    parser.add_argument('--list-all', action='store_true',
                       help='List all packs showing on homepage')
    
    args = parser.parse_args()
    
    db = SessionLocal()
    try:
        if args.fix_pack_id:
            fix_pack(db, args.fix_pack_id, dry_run=args.dry_run)
        else:
            find_potentially_hidden_packs(db, dry_run=args.dry_run)
    finally:
        db.close()


if __name__ == "__main__":
    main()

