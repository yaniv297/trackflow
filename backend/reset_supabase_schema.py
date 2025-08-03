#!/usr/bin/env python3
"""
Script to completely reset Supabase schema to match local database
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2

# Load environment variables
load_dotenv("../.env.production")

SUPABASE_DB_URL = os.environ.get("DATABASE_URL")

if not SUPABASE_DB_URL:
    print("❌ DATABASE_URL environment variable not set!")
    sys.exit(1)

def reset_supabase_schema():
    """Completely reset Supabase schema"""
    print("🚀 Resetting Supabase schema...")
    
    try:
        conn = psycopg2.connect(SUPABASE_DB_URL)
        conn.autocommit = True  # Enable autocommit for DDL operations
        
        with conn.cursor() as cursor:
            # Drop all tables in correct order (respecting foreign keys)
            print("🗑️  Dropping existing tables...")
            
            tables_to_drop = [
                "authoring_progress",
                "authoring", 
                "wip_collaborations",
                "collaborations",
                "songs",
                "album_series",
                "artists",
                "packs",
                "users"
            ]
            
            for table in tables_to_drop:
                try:
                    cursor.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                    print(f"   ✅ Dropped {table}")
                except Exception as e:
                    print(f"   ⚠️  Could not drop {table}: {e}")
            
            # Create tables with exact schema matching local database
            print("\n🔨 Creating tables with correct schema...")
            
            create_tables_sql = [
                """
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR UNIQUE NOT NULL,
                    email VARCHAR UNIQUE NOT NULL,
                    hashed_password VARCHAR,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """,
                """
                CREATE TABLE packs (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR NOT NULL,
                    user_id INTEGER REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """,
                """
                CREATE TABLE artists (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR UNIQUE NOT NULL,
                    image_url VARCHAR,
                    user_id INTEGER REFERENCES users(id)
                );
                """,
                """
                CREATE TABLE album_series (
                    id SERIAL PRIMARY KEY,
                    series_number INTEGER UNIQUE NOT NULL,
                    album_name VARCHAR NOT NULL,
                    artist_name VARCHAR NOT NULL,
                    year INTEGER,
                    cover_image_url VARCHAR,
                    status VARCHAR,
                    description VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    pack_id INTEGER REFERENCES packs(id)
                );
                """,
                """
                CREATE TABLE songs (
                    id SERIAL PRIMARY KEY,
                    artist VARCHAR NOT NULL,
                    title VARCHAR NOT NULL,
                    album VARCHAR,
                    status VARCHAR NOT NULL,
                    year INTEGER,
                    album_cover VARCHAR,
                    notes VARCHAR,
                    optional BOOLEAN DEFAULT FALSE,
                    artist_id INTEGER REFERENCES artists(id),
                    album_series_id INTEGER REFERENCES album_series(id),
                    user_id INTEGER REFERENCES users(id),
                    pack_id INTEGER REFERENCES packs(id),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """,
                """
                CREATE TABLE collaborations (
                    id SERIAL PRIMARY KEY,
                    pack_id INTEGER REFERENCES packs(id),
                    song_id INTEGER REFERENCES songs(id),
                    user_id INTEGER REFERENCES users(id),
                    collaboration_type VARCHAR NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(pack_id, song_id, user_id, collaboration_type)
                );
                """,
                """
                CREATE TABLE wip_collaborations (
                    id SERIAL PRIMARY KEY,
                    song_id INTEGER REFERENCES songs(id),
                    collaborator VARCHAR NOT NULL,
                    field VARCHAR NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """,
                """
                CREATE TABLE authoring (
                    id SERIAL PRIMARY KEY,
                    song_id INTEGER UNIQUE REFERENCES songs(id),
                    demucs BOOLEAN DEFAULT FALSE,
                    midi BOOLEAN DEFAULT FALSE,
                    tempo_map BOOLEAN DEFAULT FALSE,
                    fake_ending BOOLEAN DEFAULT FALSE,
                    drums BOOLEAN DEFAULT FALSE,
                    bass BOOLEAN DEFAULT FALSE,
                    guitar BOOLEAN DEFAULT FALSE,
                    vocals BOOLEAN DEFAULT FALSE,
                    harmonies BOOLEAN DEFAULT FALSE,
                    pro_keys BOOLEAN DEFAULT FALSE,
                    keys BOOLEAN DEFAULT FALSE,
                    animations BOOLEAN DEFAULT FALSE,
                    drum_fills BOOLEAN DEFAULT FALSE,
                    overdrive BOOLEAN DEFAULT FALSE,
                    compile BOOLEAN DEFAULT FALSE
                );
                """,
                """
                CREATE TABLE authoring_progress (
                    id SERIAL PRIMARY KEY,
                    song_id INTEGER REFERENCES songs(id),
                    lyrics_progress INTEGER DEFAULT 0,
                    melody_progress INTEGER DEFAULT 0,
                    arrangement_progress INTEGER DEFAULT 0,
                    recording_progress INTEGER DEFAULT 0,
                    mixing_progress INTEGER DEFAULT 0,
                    mastering_progress INTEGER DEFAULT 0,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """
            ]
            
            for i, sql in enumerate(create_tables_sql):
                table_names = ["users", "packs", "artists", "album_series", "songs", "collaborations", "wip_collaborations", "authoring", "authoring_progress"]
                try:
                    cursor.execute(sql)
                    print(f"   ✅ Created {table_names[i]}")
                except Exception as e:
                    print(f"   ❌ Could not create {table_names[i]}: {e}")
        
        print("\n✅ Schema reset complete!")
        
    except Exception as e:
        print(f"❌ Schema reset failed: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    print("⚠️  WARNING: This will completely reset your Supabase database schema!")
    print("All existing data and tables will be lost.")
    
    response = input("\nAre you sure you want to continue? (yes/no): ")
    if response.lower() != "yes":
        print("❌ Schema reset cancelled")
        sys.exit(0)
    
    reset_supabase_schema() 