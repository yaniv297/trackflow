"""
Repair script for fixing community events in "limbo" state.

Limbo state = event has event_revealed_at set (links revealed) but shouldn't be.

Usage:
    python -m tools.repair_limbo_events --list              # List all events with their states
    python -m tools.repair_limbo_events --unrelease "Cool Songs"  # Revert a specific event to active
    python -m tools.repair_limbo_events --release "Cool Songs"    # Properly release an event
"""

import argparse
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, '.')

from database import SessionLocal
from models import Pack, Song


def list_events(db):
    """List all community events with their current state."""
    events = db.query(Pack).filter(Pack.is_community_event == True).all()
    
    if not events:
        print("No community events found.")
        return
    
    print("\n" + "=" * 80)
    print("COMMUNITY EVENTS STATUS")
    print("=" * 80)
    
    for event in events:
        song_count = db.query(Song).filter(Song.pack_id == event.id).count()
        
        # Determine state
        if event.event_revealed_at:
            state = "🟢 RELEASED"
        else:
            state = "🟡 ACTIVE"
        
        # Check for limbo state (revealed but no end date - old logic)
        is_limbo = event.event_revealed_at is not None and event.event_end_date is None
        
        print(f"\nID: {event.id}")
        print(f"  Name: {event.name}")
        print(f"  Theme: {event.event_theme}")
        print(f"  State: {state}")
        print(f"  Songs: {song_count}")
        print(f"  RV Release Time: {event.rv_release_time or 'Not set'}")
        print(f"  Event End Date (deprecated): {event.event_end_date or 'Not set'}")
        print(f"  Revealed At: {event.event_revealed_at or 'Not set'}")
        
        if is_limbo:
            print(f"  ⚠️  POTENTIAL LIMBO STATE - revealed but no end_date")
    
    print("\n" + "=" * 80)


def unrelease_event(db, event_name: str):
    """Revert an event from released state back to active."""
    event = db.query(Pack).filter(
        Pack.is_community_event == True,
        Pack.name.ilike(f"%{event_name}%")
    ).first()
    
    if not event:
        print(f"❌ No event found matching '{event_name}'")
        return False
    
    if not event.event_revealed_at:
        print(f"⚠️  Event '{event.name}' is already active (not revealed)")
        return False
    
    print(f"\n🔄 Unreleasing event: {event.name} (ID: {event.id})")
    print(f"   Current revealed_at: {event.event_revealed_at}")
    
    # Clear revealed_at
    event.event_revealed_at = None
    event.updated_at = datetime.utcnow()
    
    # Revert all songs to In Progress
    songs = db.query(Song).filter(Song.pack_id == event.id).all()
    for song in songs:
        if song.status == "Released":
            song.status = "In Progress"
            song.released_at = None
            song.updated_at = datetime.utcnow()
            print(f"   ↩️  Reverted song: {song.title} ({song.artist})")
    
    db.commit()
    print(f"\n✅ Event '{event.name}' has been reverted to ACTIVE state")
    print(f"   Songs reverted: {len(songs)}")
    return True


def release_event(db, event_name: str):
    """Properly release an event."""
    event = db.query(Pack).filter(
        Pack.is_community_event == True,
        Pack.name.ilike(f"%{event_name}%")
    ).first()
    
    if not event:
        print(f"❌ No event found matching '{event_name}'")
        return False
    
    if event.event_revealed_at:
        print(f"⚠️  Event '{event.name}' is already released")
        return False
    
    print(f"\n🚀 Releasing event: {event.name} (ID: {event.id})")
    
    now = datetime.utcnow()
    
    # Set revealed_at
    event.event_revealed_at = now
    event.updated_at = now
    
    # Mark all songs as Released
    songs = db.query(Song).filter(Song.pack_id == event.id).all()
    for song in songs:
        song.status = "Released"
        song.released_at = now
        song.updated_at = now
        print(f"   📦 Released song: {song.title} ({song.artist})")
    
    db.commit()
    print(f"\n✅ Event '{event.name}' has been RELEASED")
    print(f"   Songs released: {len(songs)}")
    return True


def main():
    parser = argparse.ArgumentParser(description="Repair community events in limbo state")
    parser.add_argument("--list", action="store_true", help="List all events with their states")
    parser.add_argument("--unrelease", type=str, help="Revert an event to active state")
    parser.add_argument("--release", type=str, help="Properly release an event")
    
    args = parser.parse_args()
    
    if not any([args.list, args.unrelease, args.release]):
        parser.print_help()
        return
    
    db = SessionLocal()
    
    try:
        if args.list:
            list_events(db)
        elif args.unrelease:
            unrelease_event(db, args.unrelease)
        elif args.release:
            release_event(db, args.release)
    finally:
        db.close()


if __name__ == "__main__":
    main()

