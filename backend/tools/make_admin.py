#!/usr/bin/env python3
"""
Script to promote a user to admin status
"""
import sys
import os

# Add parent directory to path to import database
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import User

def make_admin(username: str):
    """Promote a user to admin"""
    database_url = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")
    
    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    
    engine = create_engine(database_url, connect_args=connect_args)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        user = db.query(User).filter(User.username == username).first()
        
        if not user:
            print(f"❌ User '{username}' not found")
            return False
        
        if user.is_admin:
            print(f"✅ User '{username}' is already an admin")
            return True
        
        user.is_admin = True
        db.commit()
        print(f"✅ User '{username}' is now an admin!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python make_admin.py <username>")
        sys.exit(1)
    
    username = sys.argv[1]
    success = make_admin(username)
    sys.exit(0 if success else 1)

