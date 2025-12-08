"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from ..schemas import UserLogin, UserResponse, Token, ClaimUserRequest
from ..services.auth_service import AuthService
from ..dependencies import get_current_active_user, get_current_user

router = APIRouter()


@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Login user and return access token."""
    auth_service = AuthService(db)
    
    try:
        access_token, user = auth_service.login_user(
            user_credentials.username, 
            user_credentials.password
        )
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                db, 
                user.id, 
                "login", 
                f"User {user.username} logged in from IP {request.client.host if request.client else 'unknown'}"
            )
        except Exception as e:
            print(f"Failed to log login activity: {e}")
        
        # Record user activity for online tracking
        try:
            from api.user_activity import record_activity
            record_activity(user.id)
        except Exception as e:
            print(f"Failed to record user activity: {e}")
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login"
        )


@router.post("/refresh", response_model=Token)
def refresh_token(current_user: UserResponse = Depends(get_current_active_user)):
    """Refresh user access token."""
    auth_service = AuthService(None)  # No DB needed for token creation
    
    access_token = auth_service.create_access_token(data={"sub": current_user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/claim-user", response_model=Token)
def claim_existing_user(
    claim_request: ClaimUserRequest,
    db: Session = Depends(get_db)
):
    """Claim an existing unclaimed user account."""
    auth_service = AuthService(db)
    
    try:
        user = auth_service.claim_user(
            claim_request.username,
            claim_request.email,
            claim_request.password
        )
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                db, 
                user.id, 
                "claim_user", 
                f"User {user.username} claimed their account"
            )
        except Exception as e:
            print(f"Failed to log claim activity: {e}")
        
        # Create access token
        access_token = auth_service.create_access_token(data={"sub": user.username})
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Claim user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during account claim"
        )


@router.get("/ping")
def ping():
    """Health check endpoint."""
    return {"message": "Auth service is running"}


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: UserResponse = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user