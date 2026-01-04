#!/usr/bin/env python3
"""
Migration script to migrate achievements from local SQLite database to production PostgreSQL.
This script reads achievements from the local database and upserts them into production.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Achievement

# Database URLs
LOCAL_DB_URL = "sqlite:///./songs.db"
PROD_DB_URL = "postgresql://postgres.vhydslrserhdzzqmytie:vyhzwSBNFCVgj2oR@aws-0-eu-west-3.pooler.supabase.com:6543/postgres"

def connect_to_local_db():
    """Connect to local SQLite database"""
    try:
        engine = create_engine(LOCAL_DB_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()
    except Exception as e:
        print(f"❌ Failed to connect to local database: {e}")
        sys.exit(1)

def connect_to_prod_db():
    """Connect to production PostgreSQL database"""
    try:
        engine = create_engine(
            PROD_DB_URL,
            connect_args={"connect_timeout": 5, "application_name": "trackflow_achievement_migration"},
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
            pool_timeout=10
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()
    except Exception as e:
        print(f"❌ Failed to connect to production database: {e}")
        sys.exit(1)

def migrate_achievements():
    """Migrate achievements from local to production database"""
    print("🚀 Starting achievement migration from local to production")
    print("=" * 60)
    
    # Connect to databases
    print("🔌 Connecting to databases...")
    local_db = connect_to_local_db()
    prod_db = connect_to_prod_db()
    
    try:
        # Read all achievements from local database
        print("\n📖 Reading achievements from local database...")
        local_achievements = local_db.query(Achievement).all()
        print(f"   Found {len(local_achievements)} achievements in local database")
        
        if not local_achievements:
            print("⚠️  No achievements found in local database!")
            return
        
        # Migrate each achievement
        print("\n🔄 Migrating achievements to production...")
        added_count = 0
        updated_count = 0
        skipped_count = 0
        
        for local_achievement in local_achievements:
            # Check if achievement already exists in production (by code)
            existing = prod_db.query(Achievement).filter(
                Achievement.code == local_achievement.code
            ).first()
            
            if existing:
                # Update existing achievement
                updated = False
                if existing.name != local_achievement.name:
                    existing.name = local_achievement.name
                    updated = True
                if existing.description != local_achievement.description:
                    existing.description = local_achievement.description
                    updated = True
                if existing.icon != local_achievement.icon:
                    existing.icon = local_achievement.icon
                    updated = True
                if existing.category != local_achievement.category:
                    existing.category = local_achievement.category
                    updated = True
                if existing.points != local_achievement.points:
                    existing.points = local_achievement.points
                    updated = True
                if existing.rarity != local_achievement.rarity:
                    existing.rarity = local_achievement.rarity
                    updated = True
                if existing.target_value != local_achievement.target_value:
                    existing.target_value = local_achievement.target_value
                    updated = True
                if existing.metric_type != local_achievement.metric_type:
                    existing.metric_type = local_achievement.metric_type
                    updated = True
                
                if updated:
                    updated_count += 1
                    print(f"   🔄 Updated: {local_achievement.name} ({local_achievement.code})")
                else:
                    skipped_count += 1
                    print(f"   ⏭️  Skipped: {local_achievement.name} ({local_achievement.code}) - no changes")
            else:
                # Create new achievement
                new_achievement = Achievement(
                    code=local_achievement.code,
                    name=local_achievement.name,
                    description=local_achievement.description,
                    icon=local_achievement.icon,
                    category=local_achievement.category,
                    points=local_achievement.points,
                    rarity=local_achievement.rarity,
                    target_value=local_achievement.target_value,
                    metric_type=local_achievement.metric_type,
                    created_at=local_achievement.created_at
                )
                prod_db.add(new_achievement)
                added_count += 1
                print(f"   ✅ Added: {local_achievement.name} ({local_achievement.code})")
        
        # Commit changes
        print("\n💾 Committing changes to production database...")
        prod_db.commit()
        
        # Summary
        print("\n" + "=" * 60)
        print("🎉 Migration completed!")
        print(f"✅ Added: {added_count} achievements")
        print(f"🔄 Updated: {updated_count} achievements")
        print(f"⏭️  Skipped: {skipped_count} achievements")
        
        # Verify final count
        final_count = prod_db.query(Achievement).count()
        print(f"📊 Total achievements in production: {final_count}")
        
    except Exception as e:
        prod_db.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        local_db.close()
        prod_db.close()
        print("\n✨ Done!")

if __name__ == "__main__":
    # Confirm before proceeding
    print("⚠️  WARNING: This will modify the production database!")
    print(f"   Production DB: {PROD_DB_URL.split('@')[1] if '@' in PROD_DB_URL else 'hidden'}")
    response = input("\nDo you want to continue? (yes/no): ")
    
    if response.lower() != "yes":
        print("❌ Migration cancelled.")
        sys.exit(0)
    
    migrate_achievements()




