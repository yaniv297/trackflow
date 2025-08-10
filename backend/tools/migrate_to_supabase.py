#!/usr/bin/env python3
"""
Migration script to export local SQLite database and import to Supabase
This will completely replace the Supabase database with local data.
"""

import os
import sys
import json
import sqlite3
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import time

# Load environment variables
load_dotenv("../.env.production")

# Database URLs
LOCAL_DB_URL = "sqlite:///./songs.db"
SUPABASE_DB_URL = os.environ.get("DATABASE_URL")

if not SUPABASE_DB_URL:
    print("❌ DATABASE_URL environment variable not set!")
    print("Please set your Supabase database URL in .env file")
    sys.exit(1)

def connect_to_local_db():
    """Connect to local SQLite database"""
    try:
        engine = create_engine(LOCAL_DB_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return engine, SessionLocal()
    except Exception as e:
        print(f"❌ Failed to connect to local database: {e}")
        sys.exit(1)

def connect_to_supabase():
    """Connect to Supabase PostgreSQL database"""
    try:
        conn = psycopg2.connect(SUPABASE_DB_URL)
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        sys.exit(1)

def get_table_schema(engine, table_name):
    """Get table schema from SQLite"""
    with engine.connect() as conn:
        result = conn.execute(text(f"PRAGMA table_info({table_name})"))
        return result.fetchall()

def export_table_data(engine, table_name):
    """Export all data from a table"""
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM {table_name}"))
        # Get column names from result keys
        columns = list(result.keys())
        rows = result.fetchall()
        return [dict(zip(columns, row)) for row in rows]

def clear_supabase_table(conn, table_name):
    """Clear all data from a Supabase table"""
    with conn.cursor() as cursor:
        # Disable foreign key checks temporarily
        cursor.execute("SET session_replication_role = replica;")
        cursor.execute(f"DELETE FROM {table_name}")
        cursor.execute("SET session_replication_role = DEFAULT;")
        print(f"   🗑️  Cleared {table_name}")

def insert_data_to_supabase(conn, table_name, data):
    """Insert data into Supabase table"""
    if not data:
        print(f"   ⏩ No data to insert for {table_name}")
        return
    
    with conn.cursor() as cursor:
        # Get column names from first row
        columns = list(data[0].keys())
        placeholders = ', '.join(['%s'] * len(columns))
        column_names = ', '.join(columns)
        
        # Prepare values
        values = []
        for row in data:
            row_values = []
            for col in columns:
                value = row[col]
                # Handle SQLite boolean to PostgreSQL boolean conversion
                if isinstance(value, int) and col in ['demucs', 'midi', 'tempo_map', 'fake_ending', 
                                                     'drums', 'bass', 'guitar', 'vocals', 'harmonies', 
                                                     'pro_keys', 'keys', 'animations', 'drum_fills', 'overdrive', 'compile', 'optional']:
                    value = bool(value)
                row_values.append(value)
            values.append(tuple(row_values))
        
        # Insert data
        query = f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})"
        cursor.executemany(query, values)
        
        print(f"   ✅ Inserted {len(data)} rows into {table_name}")

def create_missing_tables(conn):
    """Create missing tables in Supabase if they don't exist"""
    print("\n🔨 Creating missing tables and columns...")
    
    tables_sql = {
        "users": """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR UNIQUE NOT NULL,
                email VARCHAR UNIQUE NOT NULL,
                hashed_password VARCHAR,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        "packs": """
            CREATE TABLE IF NOT EXISTS packs (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        "artists": """
            CREATE TABLE IF NOT EXISTS artists (
                id SERIAL PRIMARY KEY,
                name VARCHAR UNIQUE NOT NULL,
                image_url VARCHAR,
                user_id INTEGER REFERENCES users(id)
            );
        """,
        "album_series": """
            CREATE TABLE IF NOT EXISTS album_series (
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
        "songs": """
            CREATE TABLE IF NOT EXISTS songs (
                id SERIAL PRIMARY KEY,
                title VARCHAR NOT NULL,
                artist VARCHAR NOT NULL,
                artist_id INTEGER REFERENCES artists(id),
                album VARCHAR,
                year INTEGER,
                status VARCHAR NOT NULL,
                album_cover VARCHAR,
                user_id INTEGER REFERENCES users(id),
                pack_id INTEGER REFERENCES packs(id),
                album_series_id INTEGER REFERENCES album_series(id),
                optional BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        "collaborations": """
            CREATE TABLE IF NOT EXISTS collaborations (
                id SERIAL PRIMARY KEY,
                pack_id INTEGER REFERENCES packs(id),
                song_id INTEGER REFERENCES songs(id),
                user_id INTEGER REFERENCES users(id),
                collaboration_type VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(pack_id, song_id, user_id, collaboration_type)
            );
        """,
        "wip_collaborations": """
            CREATE TABLE IF NOT EXISTS wip_collaborations (
                id SERIAL PRIMARY KEY,
                song_id INTEGER REFERENCES songs(id),
                collaborator VARCHAR NOT NULL,
                field VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        "authoring": """
            CREATE TABLE IF NOT EXISTS authoring (
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
        "authoring_progress": """
            CREATE TABLE IF NOT EXISTS authoring_progress (
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
    }
    
    with conn.cursor() as cursor:
        # Create tables
        for table_name, sql in tables_sql.items():
            try:
                cursor.execute(sql)
                print(f"   ✅ Created/verified {table_name}")
            except Exception as e:
                print(f"   ⚠️  Could not create {table_name}: {e}")
                # Rollback and continue
                conn.rollback()

def migrate_table(engine, conn, table_name):
    """Migrate a single table from SQLite to Supabase"""
    print(f"\n🔄 Migrating {table_name}...")
    
    try:
        # Export data from SQLite
        data = export_table_data(engine, table_name)
        print(f"   📤 Exported {len(data)} rows from local {table_name}")
        
        # Clear Supabase table
        clear_supabase_table(conn, table_name)
        
        # Insert data into Supabase
        insert_data_to_supabase(conn, table_name, data)
        
        # Commit this table's changes
        conn.commit()
        
    except Exception as e:
        print(f"   ❌ Error migrating {table_name}: {e}")
        # Rollback and continue with next table
        conn.rollback()
        return False
    
    return True

def reset_sequences(conn):
    """Reset PostgreSQL sequences after data insertion"""
    print("\n🔄 Resetting sequences...")
    
    sequences = [
        ("users_id_seq", "users"),
        ("packs_id_seq", "packs"),
        ("artists_id_seq", "artists"),
        ("album_series_id_seq", "album_series"),
        ("songs_id_seq", "songs"),
        ("collaborations_id_seq", "collaborations"),
        ("wip_collaborations_id_seq", "wip_collaborations"),
        ("authoring_id_seq", "authoring"),
        ("authoring_progress_id_seq", "authoring_progress")
    ]
    
    with conn.cursor() as cursor:
        for seq_name, table_name in sequences:
            try:
                cursor.execute(f"SELECT setval('{seq_name}', COALESCE((SELECT MAX(id) FROM {table_name}), 1))")
                print(f"   ✅ Reset {seq_name}")
            except Exception as e:
                print(f"   ⚠️  Could not reset {seq_name}: {e}")

def main():
    """Main migration function"""
    print("🚀 Starting migration from SQLite to Supabase")
    print("=" * 50)
    
    # Connect to databases
    print("🔌 Connecting to databases...")
    engine, local_session = connect_to_local_db()
    supabase_conn = connect_to_supabase()
    
    # Tables to migrate (in order to respect foreign key constraints)
    tables = [
        "users",
        "packs",
        "artists",
        "album_series", 
        "songs",
        "collaborations",
        "wip_collaborations",
        "authoring",
        "authoring_progress"
    ]
    
    print(f"📋 Tables to migrate: {', '.join(tables)}")
    
    # Start migration
    start_time = time.time()
    success_count = 0
    
    try:
        # Create missing tables first
        create_missing_tables(supabase_conn)
        
        for table in tables:
            if migrate_table(engine, supabase_conn, table):
                success_count += 1
        
        # Reset sequences
        reset_sequences(supabase_conn)
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 50)
        print("🎉 Migration completed!")
        print(f"✅ Successfully migrated {success_count}/{len(tables)} tables")
        print(f"⏱️  Duration: {duration:.2f} seconds")
        print("\n📊 Migration Summary:")
        
        # Show row counts
        with supabase_conn.cursor(cursor_factory=RealDictCursor) as cursor:
            for table in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                    result = cursor.fetchone()
                    print(f"   {table}: {result['count']} rows")
                except Exception as e:
                    print(f"   {table}: Error getting count - {e}")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
    
    finally:
        # Clean up
        local_session.close()
        supabase_conn.close()
        print("\n🔌 Database connections closed")

if __name__ == "__main__":
    # Confirm before proceeding
    print("⚠️  WARNING: This will completely replace your Supabase database!")
    print("All existing data in Supabase will be lost and replaced with local data.")
    
    response = input("\nAre you sure you want to continue? (yes/no): ")
    if response.lower() != "yes":
        print("❌ Migration cancelled")
        sys.exit(0)
    
    main() 