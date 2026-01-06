#!/usr/bin/env python3
"""
Migration: Add collaboration request batches

This migration:
1. Creates collaboration_request_batches table for bulk requests
2. Adds batch_id column to collaboration_requests table
3. Adds item_status column to collaboration_requests table
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import SessionLocal, SQLALCHEMY_DATABASE_URL


def run_migration():
    """Add collaboration request batches support to the database"""
    
    db = SessionLocal()
    is_postgres = SQLALCHEMY_DATABASE_URL.startswith("postgresql")
    
    print(f"📂 Using database: {'PostgreSQL' if is_postgres else 'SQLite'}")
    
    try:
        # ============================================
        # 1. Create collaboration_request_batches table
        # ============================================
        
        # Check if table exists
        if is_postgres:
            result = db.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'collaboration_request_batches'
                )
            """))
            table_exists = result.scalar()
        else:
            result = db.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='collaboration_request_batches'
            """))
            table_exists = result.fetchone() is not None
        
        if not table_exists:
            print("🔄 Creating collaboration_request_batches table...")
            
            if is_postgres:
                db.execute(text("""
                    CREATE TABLE collaboration_request_batches (
                        id SERIAL PRIMARY KEY,
                        requester_id INTEGER NOT NULL REFERENCES users(id),
                        target_user_id INTEGER NOT NULL REFERENCES users(id),
                        message TEXT NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        grant_full_pack_permissions BOOLEAN DEFAULT FALSE,
                        response_message TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        responded_at TIMESTAMP
                    )
                """))
            else:
                db.execute(text("""
                    CREATE TABLE collaboration_request_batches (
                        id INTEGER PRIMARY KEY,
                        requester_id INTEGER NOT NULL,
                        target_user_id INTEGER NOT NULL,
                        message TEXT NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        grant_full_pack_permissions BOOLEAN DEFAULT 0,
                        response_message TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        responded_at DATETIME,
                        FOREIGN KEY (requester_id) REFERENCES users (id),
                        FOREIGN KEY (target_user_id) REFERENCES users (id)
                    )
                """))
            
            # Create indexes
            db.execute(text("CREATE INDEX idx_batch_requester ON collaboration_request_batches (requester_id)"))
            db.execute(text("CREATE INDEX idx_batch_target ON collaboration_request_batches (target_user_id)"))
            db.execute(text("CREATE INDEX idx_batch_status ON collaboration_request_batches (status)"))
            db.execute(text("CREATE INDEX idx_batch_created ON collaboration_request_batches (created_at)"))
            
            db.commit()
            print("✅ Created collaboration_request_batches table with indexes")
        else:
            print("ℹ️ collaboration_request_batches table already exists")
        
        # ============================================
        # 2. Add batch_id column to collaboration_requests
        # ============================================
        
        # Check if column exists
        if is_postgres:
            result = db.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'collaboration_requests' AND column_name = 'batch_id'
                )
            """))
            has_batch_id = result.scalar()
        else:
            result = db.execute(text("PRAGMA table_info(collaboration_requests)"))
            columns = [row[1] for row in result.fetchall()]
            has_batch_id = 'batch_id' in columns
        
        if not has_batch_id:
            print("🔄 Adding batch_id column to collaboration_requests table...")
            db.execute(text("""
                ALTER TABLE collaboration_requests 
                ADD COLUMN batch_id INTEGER REFERENCES collaboration_request_batches(id)
            """))
            db.execute(text("CREATE INDEX idx_collab_req_batch ON collaboration_requests (batch_id)"))
            db.commit()
            print("✅ Added batch_id column to collaboration_requests")
        else:
            print("ℹ️ batch_id column already exists in collaboration_requests")
        
        # ============================================
        # 3. Add item_status column to collaboration_requests
        # ============================================
        
        # Check if column exists
        if is_postgres:
            result = db.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'collaboration_requests' AND column_name = 'item_status'
                )
            """))
            has_item_status = result.scalar()
        else:
            result = db.execute(text("PRAGMA table_info(collaboration_requests)"))
            columns = [row[1] for row in result.fetchall()]
            has_item_status = 'item_status' in columns
        
        if not has_item_status:
            print("🔄 Adding item_status column to collaboration_requests table...")
            db.execute(text("""
                ALTER TABLE collaboration_requests 
                ADD COLUMN item_status VARCHAR(20)
            """))
            db.commit()
            print("✅ Added item_status column to collaboration_requests")
        else:
            print("ℹ️ item_status column already exists in collaboration_requests")
            
        print("✅ Collaboration request batches migration completed successfully")
            
    except Exception as e:
        print(f"❌ Migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """Run the migration."""
    print("=" * 60)
    print("ADDING COLLABORATION REQUEST BATCHES SUPPORT")
    print("=" * 60)
    
    run_migration()
    
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
