#!/usr/bin/env python3
"""
Create the rock_band_dlc table in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from models import RockBandDLC, Base

def create_dlc_table():
    """Create the rock_band_dlc table"""
    try:
        # Create the table
        RockBandDLC.__table__.create(engine, checkfirst=True)
        print("✅ Rock Band DLC table created successfully")
        
        # Verify the table exists
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if 'rock_band_dlc' in tables:
            print("✅ Table verification successful")
        else:
            print("❌ Table verification failed")
            
    except Exception as e:
        print(f"❌ Error creating table: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    create_dlc_table() 