#!/usr/bin/env python3
"""
Proactive database cleanup script to prevent datetime issues.
Run this periodically to clean up any bad data before it causes problems.
"""

from database import SessionLocal
from database_protection import clean_datetime_strings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Run database cleanup."""
    db = SessionLocal()
    try:
        logger.info("🧹 Starting proactive database cleanup...")
        fixes_applied = clean_datetime_strings(db)
        
        if fixes_applied > 0:
            logger.info(f"✅ Applied {fixes_applied} fixes to datetime fields")
        else:
            logger.info("✅ No issues found - database is clean")
            
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()