#!/usr/bin/env python3
"""
Script to fix total_future_created counter for users affected by the double-counting bug.

This script recalculates total_future_created by counting the actual number of songs
currently in Future Plans status for each user. This is the best approximation we can
do without historical creation data.

Usage:
    python backend/tools/fix_future_plans_counter.py [--user-id USER_ID]
    
If --user-id is provided, only that user will be fixed.
Otherwise, all users will be checked and fixed.
"""

import sys
import os
import argparse
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import SongStatus, UserStats


def fix_user_future_created_counter(db: Session, user_id: int, verbose: bool = True) -> dict:
    """
    Fix total_future_created counter for a specific user.
    
    Returns:
        dict with 'user_id', 'old_count', 'new_count', 'actual_future_songs'
    """
    # Count actual Future Plans songs for this user
    result = db.execute(text("""
        SELECT COUNT(*) 
        FROM songs 
        WHERE user_id = :user_id 
        AND status = 'Future Plans'
    """), {"user_id": user_id}).fetchone()
    
    actual_future_songs = result[0] if result else 0
    
    # Get current stats
    stats = db.query(UserStats).filter(UserStats.user_id == user_id).first()
    if not stats:
        if verbose:
            print(f"⚠️ User {user_id} has no user_stats record, skipping")
        return {
            "user_id": user_id,
            "old_count": None,
            "new_count": None,
            "actual_future_songs": actual_future_songs,
            "fixed": False
        }
    
    old_count = stats.total_future_created or 0
    
    # Update the counter to match actual Future Plans songs
    stats.total_future_created = actual_future_songs
    db.commit()
    
    if verbose:
        if old_count != actual_future_songs:
            print(f"✅ User {user_id}: Fixed total_future_created from {old_count} to {actual_future_songs} (actual Future Plans songs: {actual_future_songs})")
        else:
            print(f"✓ User {user_id}: Counter already correct ({actual_future_songs})")
    
    return {
        "user_id": user_id,
        "old_count": old_count,
        "new_count": actual_future_songs,
        "actual_future_songs": actual_future_songs,
        "fixed": old_count != actual_future_songs
    }


def fix_all_users(db: Session, verbose: bool = True) -> dict:
    """Fix total_future_created counter for all users."""
    # Get all users with user_stats
    user_stats = db.query(UserStats).all()
    
    results = {
        "total_users": len(user_stats),
        "fixed_users": 0,
        "already_correct": 0,
        "details": []
    }
    
    for stats in user_stats:
        result = fix_user_future_created_counter(db, stats.user_id, verbose=False)
        results["details"].append(result)
        
        if result["fixed"]:
            results["fixed_users"] += 1
        else:
            results["already_correct"] += 1
    
    if verbose:
        print(f"\n📊 Summary:")
        print(f"   Total users checked: {results['total_users']}")
        print(f"   Users fixed: {results['fixed_users']}")
        print(f"   Users already correct: {results['already_correct']}")
        
        # Show users that were fixed
        fixed_details = [r for r in results["details"] if r["fixed"]]
        if fixed_details:
            print(f"\n🔧 Fixed users:")
            for detail in fixed_details:
                print(f"   User {detail['user_id']}: {detail['old_count']} → {detail['new_count']}")
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Fix total_future_created counter for users affected by double-counting bug"
    )
    parser.add_argument(
        "--user-id",
        type=int,
        help="Fix only this specific user ID (default: fix all users)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be fixed without making changes"
    )
    
    args = parser.parse_args()
    
    db = SessionLocal()
    
    try:
        if args.dry_run:
            print("🔍 DRY RUN MODE - No changes will be made\n")
            
            if args.user_id:
                # Count actual Future Plans songs
                result = db.execute(text("""
                    SELECT COUNT(*) 
                    FROM songs 
                    WHERE user_id = :user_id 
                    AND status = 'Future Plans'
                """), {"user_id": args.user_id}).fetchone()
                actual = result[0] if result else 0
                
                stats = db.query(UserStats).filter(UserStats.user_id == args.user_id).first()
                if stats:
                    current = stats.total_future_created or 0
                    print(f"User {args.user_id}:")
                    print(f"  Current total_future_created: {current}")
                    print(f"  Actual Future Plans songs: {actual}")
                    if current != actual:
                        print(f"  Would fix: {current} → {actual}")
                    else:
                        print(f"  Already correct")
                else:
                    print(f"User {args.user_id}: No user_stats record found")
            else:
                # Check all users
                user_stats = db.query(UserStats).all()
                fixes_needed = []
                for stats in user_stats:
                    result = db.execute(text("""
                        SELECT COUNT(*) 
                        FROM songs 
                        WHERE user_id = :user_id 
                        AND status = 'Future Plans'
                    """), {"user_id": stats.user_id}).fetchone()
                    actual = result[0] if result else 0
                    current = stats.total_future_created or 0
                    
                    if current != actual:
                        fixes_needed.append({
                            "user_id": stats.user_id,
                            "current": current,
                            "actual": actual
                        })
                
                if fixes_needed:
                    print(f"Found {len(fixes_needed)} users that need fixing:")
                    for fix in fixes_needed:
                        print(f"  User {fix['user_id']}: {fix['current']} → {fix['actual']}")
                else:
                    print("All users have correct counters!")
        else:
            if args.user_id:
                print(f"🔧 Fixing user {args.user_id}...\n")
                result = fix_user_future_created_counter(db, args.user_id)
                if result["fixed"]:
                    print(f"\n✅ Successfully fixed user {args.user_id}")
                else:
                    print(f"\n✓ User {args.user_id} counter was already correct")
            else:
                print("🔧 Fixing all users...\n")
                results = fix_all_users(db)
                print(f"\n✅ Completed! Fixed {results['fixed_users']} user(s)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
