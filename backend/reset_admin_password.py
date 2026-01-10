#!/usr/bin/env python3
"""
Script to reset admin password in local database.
Usage: python reset_admin_password.py <username> <new_password>
"""

import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User
from auth import get_password_hash

def reset_password(username: str, new_password: str):
    """Reset password for a user."""
    db: Session = SessionLocal()
    try:
        # Find the user
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"❌ User '{username}' not found!")
            return False
        
        # Hash the new password
        hashed_password = get_password_hash(new_password)
        
        # Update the password
        user.hashed_password = hashed_password
        db.commit()
        
        print(f"✅ Password reset successfully for user '{username}'!")
        print(f"   Username: {user.username}")
        print(f"   Email: {user.email}")
        print(f"   Is Admin: {user.is_admin}")
        return True
    except Exception as e:
        db.rollback()
        print(f"❌ Error resetting password: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reset_admin_password.py <username> <new_password>")
        print("\nExample:")
        print("  python reset_admin_password.py yaniv297 mynewpassword123")
        sys.exit(1)
    
    username = sys.argv[1]
    new_password = sys.argv[2]
    
    if len(new_password) < 6:
        print("❌ Password must be at least 6 characters long!")
        sys.exit(1)
    
    print(f"🔄 Resetting password for user: {username}")
    success = reset_password(username, new_password)
    sys.exit(0 if success else 1)

