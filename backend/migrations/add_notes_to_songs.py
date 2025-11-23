#!/usr/bin/env python3

"""
Migration script to add notes column to songs table.
Usage: python migrations/add_notes_to_songs.py
"""

import os
import sys

# Add the parent directory to the path so we can import the necessary modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def add_notes_column():
    """Add notes column to songs table"""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as connection:
        # Check if column already exists (PostgreSQL compatible)
        result = connection.execute(text("""
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'songs' 
            AND column_name = 'notes'
        """)).fetchone()
        
        if result[0] == 0:
            # Add the notes column
            connection.execute(text("ALTER TABLE songs ADD COLUMN notes TEXT"))
            connection.commit()
            print("✅ Added notes column to songs table")
        else:
            print("⚠️  Notes column already exists in songs table")

if __name__ == "__main__":
    add_notes_column()