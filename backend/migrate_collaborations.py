#!/usr/bin/env python3
"""
Migration script to convert string-based collaborations to foreign key structure.
This script will:
1. Create new collaboration tables with foreign keys
2. Migrate existing collaboration data
3. Clean up old tables
"""

import os
import sys
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from models import Base, User, Song, SongCollaboration, WipCollaboration
from dotenv import load_dotenv

load_dotenv()

def get_database_url():
    """Get database URL from environment or use default SQLite"""
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL")
    return "sqlite:///songs.db"

def migrate_collaborations():
    """Migrate collaborations from string-based to foreign key structure"""
    print("🔄 Starting collaboration migration...")
    
    # Create database engine
    database_url = get_database_url()
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if new tables already exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        if 'song_collaborations_new' in existing_tables:
            print("⚠️  New collaboration tables already exist. Skipping migration.")
            return
        
        print("📊 Analyzing existing collaboration data...")
        
        # Get all unique collaborator usernames from existing data
        old_collaborations = db.execute(text("""
            SELECT DISTINCT author FROM song_collaborations 
            WHERE author IS NOT NULL AND author != ''
        """)).fetchall()
        
        old_wip_collaborations = db.execute(text("""
            SELECT DISTINCT collaborator FROM wip_collaborations 
            WHERE collaborator IS NOT NULL AND collaborator != ''
        """)).fetchall()
        
        all_collaborators = set()
        for row in old_collaborations:
            all_collaborators.add(row[0])
        for row in old_wip_collaborations:
            all_collaborators.add(row[0])
        
        print(f"Found {len(all_collaborators)} unique collaborators: {list(all_collaborators)}")
        
        # Create user mapping
        user_mapping = {}
        for username in all_collaborators:
            user = db.query(User).filter(User.username == username).first()
            if user:
                user_mapping[username] = user.id
                print(f"✅ Found user: {username} (ID: {user.id})")
            else:
                print(f"⚠️  User not found: {username} - will be skipped")
        
        # Create new tables with foreign keys
        print("🏗️  Creating new collaboration tables...")
        
        # Create new song_collaborations table
        db.execute(text("""
            CREATE TABLE song_collaborations_new (
                id INTEGER PRIMARY KEY,
                song_id INTEGER NOT NULL,
                collaborator_id INTEGER NOT NULL,
                role VARCHAR,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
                FOREIGN KEY (collaborator_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(song_id, collaborator_id)
            )
        """))
        
        # Create new wip_collaborations table
        db.execute(text("""
            CREATE TABLE wip_collaborations_new (
                id INTEGER PRIMARY KEY,
                song_id INTEGER NOT NULL,
                collaborator_id INTEGER NOT NULL,
                field VARCHAR NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
                FOREIGN KEY (collaborator_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(song_id, collaborator_id, field)
            )
        """))
        
        # Migrate song collaborations
        print("📦 Migrating song collaborations...")
        old_song_collabs = db.execute(text("""
            SELECT song_id, author, parts FROM song_collaborations
        """)).fetchall()
        
        migrated_count = 0
        skipped_count = 0
        
        for song_id, author, parts in old_song_collabs:
            if author in user_mapping:
                try:
                    db.execute(text("""
                        INSERT INTO song_collaborations_new (song_id, collaborator_id, role)
                        VALUES (:song_id, :collaborator_id, :role)
                    """), {
                        'song_id': song_id,
                        'collaborator_id': user_mapping[author],
                        'role': parts
                    })
                    migrated_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate collaboration for song {song_id}, user {author}: {e}")
                    skipped_count += 1
            else:
                print(f"⚠️  Skipping collaboration for unknown user: {author}")
                skipped_count += 1
        
        print(f"✅ Migrated {migrated_count} song collaborations, skipped {skipped_count}")
        
        # Migrate WIP collaborations
        print("📦 Migrating WIP collaborations...")
        old_wip_collabs = db.execute(text("""
            SELECT song_id, collaborator, field FROM wip_collaborations
        """)).fetchall()
        
        wip_migrated_count = 0
        wip_skipped_count = 0
        
        for song_id, collaborator, field in old_wip_collabs:
            if collaborator in user_mapping:
                try:
                    db.execute(text("""
                        INSERT INTO wip_collaborations_new (song_id, collaborator_id, field)
                        VALUES (:song_id, :collaborator_id, :field)
                    """), {
                        'song_id': song_id,
                        'collaborator_id': user_mapping[collaborator],
                        'field': field
                    })
                    wip_migrated_count += 1
                except Exception as e:
                    print(f"⚠️  Failed to migrate WIP collaboration for song {song_id}, user {collaborator}: {e}")
                    wip_skipped_count += 1
            else:
                print(f"⚠️  Skipping WIP collaboration for unknown user: {collaborator}")
                wip_skipped_count += 1
        
        print(f"✅ Migrated {wip_migrated_count} WIP collaborations, skipped {wip_skipped_count}")
        
        # Replace old tables with new ones
        print("🔄 Replacing old tables with new ones...")
        
        db.execute(text("DROP TABLE song_collaborations"))
        db.execute(text("DROP TABLE wip_collaborations"))
        db.execute(text("ALTER TABLE song_collaborations_new RENAME TO song_collaborations"))
        db.execute(text("ALTER TABLE wip_collaborations_new RENAME TO wip_collaborations"))
        
        # Create indexes for performance
        db.execute(text("CREATE INDEX idx_song_collaborations_song_id ON song_collaborations(song_id)"))
        db.execute(text("CREATE INDEX idx_song_collaborations_collaborator_id ON song_collaborations(collaborator_id)"))
        db.execute(text("CREATE INDEX idx_wip_collaborations_song_id ON wip_collaborations(song_id)"))
        db.execute(text("CREATE INDEX idx_wip_collaborations_collaborator_id ON wip_collaborations(collaborator_id)"))
        
        db.commit()
        
        print("✅ Collaboration migration completed successfully!")
        print(f"   - Total song collaborations migrated: {migrated_count}")
        print(f"   - Total WIP collaborations migrated: {wip_migrated_count}")
        print(f"   - Total skipped: {skipped_count + wip_skipped_count}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_collaborations() 