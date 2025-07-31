#!/usr/bin/env python3
"""
Script to create a test user for authentication testing.
Run this script to create a test user if none exists.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db
from models import User
from auth import get_password_hash

def create_test_user():
    """Create a test user if none exists."""
    db = next(get_db())
    
    # Check if any users exist
    existing_user = db.query(User).first()
    if existing_user:
        print(f"✅ User already exists: {existing_user.username}")
        return existing_user
    
    # Create test user
    test_username = "testuser"
    test_email = "test@example.com"
    test_password = "password123"
    
    # Check if test user already exists
    existing_test_user = db.query(User).filter(User.username == test_username).first()
    if existing_test_user:
        print(f"✅ Test user already exists: {existing_test_user.username}")
        return existing_test_user
    
    # Create new test user
    hashed_password = get_password_hash(test_password)
    new_user = User(
        username=test_username,
        email=test_email,
        hashed_password=hashed_password,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"✅ Created test user: {new_user.username}")
    print(f"   Email: {new_user.email}")
    print(f"   Password: {test_password}")
    print(f"   ID: {new_user.id}")
    
    return new_user

if __name__ == "__main__":
    create_test_user() 