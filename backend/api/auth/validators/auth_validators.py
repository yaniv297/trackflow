"""Authentication validators."""

import re
from fastapi import HTTPException, status


class AuthValidator:
    """Validator for authentication-related data."""
    
    @staticmethod
    def validate_username(username: str) -> str:
        """Validate username format."""
        if not username or len(username.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is required"
            )
        
        username = username.strip()
        
        if len(username) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be at least 3 characters long"
            )
        
        if len(username) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be less than 50 characters"
            )
        
        # Allow letters, numbers, underscore, hyphen
        if not re.match(r'^[a-zA-Z0-9_-]+$', username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username can only contain letters, numbers, underscore, and hyphen"
            )
        
        return username
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format."""
        if not email or len(email.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        email = email.strip().lower()
        
        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        return email
    
    @staticmethod
    def validate_password(password: str) -> str:
        """Validate password strength."""
        if not password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is required"
            )
        
        if len(password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long"
            )
        
        if len(password) > 128:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be less than 128 characters"
            )
        
        return password