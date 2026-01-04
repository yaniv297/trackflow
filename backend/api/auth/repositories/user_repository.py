"""User repository for data access operations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User


class UserRepository:
    """Repository for user data access operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username (case insensitive)."""
        return self.db.query(User).filter(
            func.lower(User.username) == func.lower(username)
        ).first()
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email (case insensitive)."""
        return self.db.query(User).filter(
            func.lower(User.email) == func.lower(email)
        ).first()
    
    def get_all_users(self) -> List[User]:
        """Get all users."""
        return self.db.query(User).all()
    
    def get_unclaimed_users(self) -> List[User]:
        """Get users without passwords (unclaimed accounts).
        
        Checks for both NULL and empty string passwords since unclaimed users
        may have either depending on how they were created.
        """
        from sqlalchemy import or_
        return self.db.query(User).filter(
            or_(
                User.hashed_password.is_(None),
                User.hashed_password == ''
            )
        ).all()
    
    def create_user(self, user_data: dict) -> User:
        """Create a new user."""
        user = User(**user_data)
        self.db.add(user)
        self.db.flush()  # Get the ID without committing
        return user
    
    def update_user(self, user: User, update_data: dict) -> User:
        """Update user data."""
        for field, value in update_data.items():
            if hasattr(user, field):
                setattr(user, field, value)
        return user
    
    def delete_user(self, user: User):
        """Delete a user."""
        self.db.delete(user)
    
    def commit(self):
        """Commit changes to database."""
        self.db.commit()
    
    def rollback(self):
        """Rollback changes."""
        self.db.rollback()