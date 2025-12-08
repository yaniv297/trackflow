"""User management routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User
from ..schemas import UserCreate, UserResponse, Token
from ..services.auth_service import AuthService
from ..dependencies import get_current_active_user
from ..repositories.user_repository import UserRepository

router = APIRouter()


@router.post("/register", response_model=Token)
def register(registration_data: dict, db: Session = Depends(get_db)):
    """Register a new user."""
    auth_service = AuthService(db)
    
    # Extract and validate registration data
    username = registration_data.get("username", "").strip()
    email = registration_data.get("email", "").strip()
    password = registration_data.get("password", "")
    
    if not username or not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, email, and password are required"
        )
    
    try:
        user = auth_service.create_user(username, email, password)
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                db, 
                user.id, 
                "register", 
                f"User {user.username} registered new account"
            )
        except Exception as e:
            print(f"Failed to log registration activity: {e}")
        
        # Create access token
        access_token = auth_service.create_access_token(data={"sub": user.username})
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during registration"
        )


@router.get("/users/")
def get_users(
    current_user: UserResponse = Depends(get_current_active_user), 
    db: Session = Depends(get_db)
):
    """Get all users (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user_repo = UserRepository(db)
    users = user_repo.get_all_users()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        for user in users
    ]


@router.get("/unclaimed-users")
def get_unclaimed_users(db: Session = Depends(get_db)):
    """Get list of unclaimed user accounts."""
    user_repo = UserRepository(db)
    unclaimed_users = user_repo.get_unclaimed_users()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        for user in unclaimed_users
    ]