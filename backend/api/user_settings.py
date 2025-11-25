from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from api.auth import get_current_active_user
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/user-settings", tags=["User Settings"])

class UserSettingsUpdate(BaseModel):
    email: Optional[str] = None
    preferred_contact_method: Optional[str] = None  # "email" or "discord"
    discord_username: Optional[str] = None
    profile_image_url: Optional[str] = None
    website_url: Optional[str] = None
    auto_spotify_fetch_enabled: Optional[bool] = None

class UserSettingsResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    discord_username: Optional[str] = None
    profile_image_url: Optional[str] = None
    website_url: Optional[str] = None
    auto_spotify_fetch_enabled: Optional[bool] = None
    created_at: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    discord_username: Optional[str] = None
    created_at: Optional[str] = None

@router.get("/me", response_model=UserSettingsResponse)
def get_user_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's settings"""
    
    # Reload user from current session to get fresh data
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert datetime to string for created_at
    # Handle auto_spotify_fetch_enabled: if attribute exists, use its value (even if False), otherwise default to True
    auto_fetch_enabled = True
    if hasattr(user, 'auto_spotify_fetch_enabled'):
        auto_fetch_enabled = user.auto_spotify_fetch_enabled if user.auto_spotify_fetch_enabled is not None else True
    else:
        auto_fetch_enabled = True
    
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "preferred_contact_method": user.preferred_contact_method,
        "discord_username": user.discord_username,
        "profile_image_url": user.profile_image_url,
        "website_url": user.website_url,
        "auto_spotify_fetch_enabled": bool(auto_fetch_enabled),  # Ensure it's a boolean
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    return user_dict

@router.put("/me", response_model=UserSettingsResponse)
def update_user_settings(
    settings: UserSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user's settings"""
    
    # Reload user from current session to ensure it's attached
    # This is necessary because current_user might come from cache
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email is being changed and if it's already taken
    if settings.email and settings.email != user.email:
        # Basic email validation
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, settings.email):
            raise HTTPException(
                status_code=400,
                detail="Invalid email format"
            )
        
        existing_user = db.query(User).filter(User.email == settings.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        user.email = settings.email
    
    # Update other fields
    if settings.preferred_contact_method is not None:
        if settings.preferred_contact_method not in ["email", "discord"]:
            raise HTTPException(
                status_code=400,
                detail="preferred_contact_method must be 'email' or 'discord'"
            )
        
        # Validate that required fields are provided based on contact method
        if settings.preferred_contact_method == "email" and not user.email:
            raise HTTPException(
                status_code=400,
                detail="Email address is required when email is the preferred contact method"
            )
        elif settings.preferred_contact_method == "discord" and not settings.discord_username:
            raise HTTPException(
                status_code=400,
                detail="Discord username is required when Discord is the preferred contact method"
            )
        
        user.preferred_contact_method = settings.preferred_contact_method
    
    if settings.discord_username is not None:
        user.discord_username = settings.discord_username
    
    if settings.profile_image_url is not None:
        user.profile_image_url = settings.profile_image_url
    
    if settings.website_url is not None:
        user.website_url = settings.website_url
    
    if settings.auto_spotify_fetch_enabled is not None:
        user.auto_spotify_fetch_enabled = settings.auto_spotify_fetch_enabled
    
    try:
        db.commit()
        db.refresh(user)
        
        # Convert datetime to string for created_at
        # Ensure auto_spotify_fetch_enabled is always a boolean
        auto_fetch_enabled = True
        if hasattr(user, 'auto_spotify_fetch_enabled'):
            auto_fetch_enabled = user.auto_spotify_fetch_enabled if user.auto_spotify_fetch_enabled is not None else True
        else:
            auto_fetch_enabled = True
        
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "preferred_contact_method": user.preferred_contact_method,
            "discord_username": user.discord_username,
            "profile_image_url": user.profile_image_url,
            "website_url": user.website_url,
            "auto_spotify_fetch_enabled": bool(auto_fetch_enabled),  # Ensure it's a boolean
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
        return user_dict
    except Exception as e:
        db.rollback()
        print(f"Error updating user settings: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update user settings: {str(e)}"
        )

@router.get("/users/{username}/profile", response_model=UserProfileResponse)
def get_user_profile(
    username: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a user's public profile information"""
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Convert datetime to string for created_at
    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "preferred_contact_method": user.preferred_contact_method,
        "discord_username": user.discord_username,
        "auto_spotify_fetch_enabled": user.auto_spotify_fetch_enabled if hasattr(user, 'auto_spotify_fetch_enabled') else True,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }
    return user_dict 