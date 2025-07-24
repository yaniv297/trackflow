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
load_dotenv(".env.production")

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
        
    except Exception as e:
        print(f"   ❌ Error migrating {table_name}: {e}")
        return False
    
    return True

def create_missing_tables(conn):
    """Create missing tables in Supabase if they don't exist"""
    print("\n🔨 Creating missing tables and columns...")
    
    tables_sql = {
        "song_collaborations": """
            CREATE TABLE IF NOT EXISTS song_collaborations (
                id SERIAL PRIMARY KEY,
                song_id INTEGER NOT NULL,
                author VARCHAR NOT NULL,
                parts VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        "wip_collaborations": """
            CREATE TABLE IF NOT EXISTS wip_collaborations (
                id SERIAL PRIMARY KEY,
                song_id INTEGER NOT NULL,
                collaborator VARCHAR NOT NULL,
                field VARCHAR NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """,
        "authoring": """
            CREATE TABLE IF NOT EXISTS authoring (
                id SERIAL PRIMARY KEY,
                song_id INTEGER UNIQUE NOT NULL,
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
        """
    }
    
    # Add missing columns to existing tables
    columns_sql = [
        "ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_series_id INTEGER;",
        "ALTER TABLE songs ADD COLUMN IF NOT EXISTS pack VARCHAR;",
        "ALTER TABLE songs ADD COLUMN IF NOT EXISTS notes VARCHAR;",
        "ALTER TABLE songs ADD COLUMN IF NOT EXISTS author VARCHAR;",
        "ALTER TABLE songs ADD COLUMN IF NOT EXISTS optional BOOLEAN DEFAULT FALSE;"
    ]
    
    with conn.cursor() as cursor:
        # Create tables
        for table_name, sql in tables_sql.items():
            try:
                cursor.execute(sql)
                print(f"   ✅ Created/verified {table_name}")
            except Exception as e:
                print(f"   ⚠️  Could not create {table_name}: {e}")
        
        # Add missing columns
        for sql in columns_sql:
            try:
                cursor.execute(sql)
                print(f"   ✅ Added column: {sql.split()[-1]}")
            except Exception as e:
                print(f"   ⚠️  Could not add column: {e}")

def reset_sequences(conn):
    """Reset PostgreSQL sequences after data insertion"""
    print("\n🔄 Resetting sequences...")
    
    sequences = [
        ("songs_id_seq", "songs"),
        ("artists_id_seq", "artists"),
        ("album_series_id_seq", "album_series"),
        ("song_collaborations_id_seq", "song_collaborations"),
        ("wip_collaborations_id_seq", "wip_collaborations"),
        ("authoring_id_seq", "authoring")
    ]
    
    with conn.cursor() as cursor:
        for seq_name, table_name in sequences:
            try:
                cursor.execute(f"SELECT setval('{seq_name}', (SELECT MAX(id) FROM {table_name}))")
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
        "artists",
        "album_series", 
        "songs",
        "song_collaborations",
        "wip_collaborations",
        "authoring"
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
        
        # Commit all changes
        supabase_conn.commit()
        
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
                cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                result = cursor.fetchone()
                print(f"   {table}: {result['count']} rows")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        supabase_conn.rollback()
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