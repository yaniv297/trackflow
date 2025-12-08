"""Password reset routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from ..schemas import ForgotPasswordRequest, ResetPasswordRequest
from ..services.password_service import PasswordService

router = APIRouter()


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset."""
    password_service = PasswordService(db)
    
    try:
        email_sent = password_service.request_password_reset(request.email)
        
        # Always return success to avoid email enumeration
        return {
            "message": "If that email exists, we've sent a password reset link.",
            "email_sent": email_sent
        }
        
    except Exception as e:
        print(f"Password reset request error: {e}")
        # Don't reveal internal errors for security
        return {
            "message": "If that email exists, we've sent a password reset link.",
            "email_sent": False
        }


@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset user password with token."""
    password_service = PasswordService(db)
    
    try:
        user = password_service.reset_password(request.token, request.new_password)
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                db, 
                user.id, 
                "password_reset", 
                f"User {user.username} reset their password"
            )
        except Exception as e:
            print(f"Failed to log password reset activity: {e}")
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during password reset"
        )


@router.get("/forgot-password-test")
def forgot_password_test():
    """Test endpoint to check if email service is configured."""
    from ..services.email_service import EmailService
    email_service = EmailService()
    
    return {
        "email_configured": email_service.is_configured(),
        "message": "Email service status"
    }