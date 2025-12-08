"""Password reset service layer for business logic."""

import secrets
from typing import Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import User, PasswordResetToken
from ..repositories.user_repository import UserRepository
from ..repositories.password_reset_repository import PasswordResetRepository
from .auth_service import AuthService
from .email_service import EmailService


class PasswordService:
    """Service for password reset business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.reset_repo = PasswordResetRepository(db)
        self.auth_service = AuthService(db)
        self.email_service = EmailService()
    
    def generate_reset_token(self) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)
    
    def request_password_reset(self, email: str) -> bool:
        """Request password reset for email."""
        user = self.user_repo.get_by_email(email)
        if not user:
            # Don't reveal whether email exists
            return True
        
        # Delete any existing tokens for this user
        self.reset_repo.delete_user_tokens(user.id)
        
        # Create new reset token
        token = self.generate_reset_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
        
        self.reset_repo.create_token(user.id, token, expires_at)
        self.reset_repo.commit()
        
        # Send email
        email_sent = self.email_service.send_password_reset_email(
            user.email, token, user.username
        )
        
        return email_sent
    
    def reset_password(self, token: str, new_password: str) -> User:
        """Reset user password with token."""
        # Find valid token
        reset_token = self.reset_repo.get_by_token(token)
        if not reset_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Check if token is expired
        if reset_token.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired"
            )
        
        # Check if token was already used
        if reset_token.used_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has already been used"
            )
        
        # Get user
        user = self.user_repo.get_by_id(reset_token.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        password_hash = self.auth_service.get_password_hash(new_password)
        update_data = {"hashed_password": password_hash}
        self.user_repo.update_user(user, update_data)
        
        # Mark token as used
        self.reset_repo.mark_token_used(reset_token)
        
        # Delete all other tokens for this user
        self.reset_repo.delete_user_tokens(user.id)
        
        self.reset_repo.commit()
        
        return user