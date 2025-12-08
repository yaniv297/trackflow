"""Password reset token repository for data access operations."""

from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime
from models import PasswordResetToken


class PasswordResetRepository:
    """Repository for password reset token data access operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_token(self, token: str) -> Optional[PasswordResetToken]:
        """Get password reset token by token string."""
        return self.db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token
        ).first()
    
    def get_by_user_id(self, user_id: int) -> Optional[PasswordResetToken]:
        """Get active password reset token for user."""
        return self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > datetime.utcnow()
        ).first()
    
    def create_token(self, user_id: int, token: str, expires_at: datetime) -> PasswordResetToken:
        """Create a new password reset token."""
        reset_token = PasswordResetToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at
        )
        self.db.add(reset_token)
        self.db.flush()
        return reset_token
    
    def mark_token_used(self, reset_token: PasswordResetToken):
        """Mark token as used."""
        reset_token.used_at = datetime.utcnow()
    
    def delete_user_tokens(self, user_id: int):
        """Delete all tokens for a user."""
        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id
        ).delete()
    
    def commit(self):
        """Commit changes to database."""
        self.db.commit()
    
    def rollback(self):
        """Rollback changes."""
        self.db.rollback()