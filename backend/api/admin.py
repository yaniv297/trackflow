"""
Admin API endpoints for user management and impersonation
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models import User, Song, Pack
from api.auth import get_current_active_user, create_access_token
from datetime import timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_active_user)):
    """Dependency to ensure user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


class UserManagementResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: str
    last_login_at: str = None
    song_count: int = 0
    pack_count: int = 0
    collaboration_count: int = 0


@router.get("/users")
def list_all_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """List all users with statistics (admin only)"""
    users = db.query(User).all()
    
    result = []
    for user in users:
        # Get counts
        song_count = db.query(Song).filter(Song.user_id == user.id).count()
        pack_count = db.query(Pack).filter(Pack.user_id == user.id).count()
        
        # Count collaborations
        collab_count = db.execute(text("""
            SELECT COUNT(DISTINCT pack_id) + COUNT(DISTINCT song_id)
            FROM collaborations
            WHERE user_id = :uid
        """), {"uid": user.id}).scalar() or 0
        
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "song_count": song_count,
            "pack_count": pack_count,
            "collaboration_count": collab_count
        })
    
    return result


@router.post("/impersonate/{user_id}")
def impersonate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Generate a token to impersonate another user (admin only)"""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create access token for target user
    access_token_expires = timedelta(minutes=1440)
    access_token = create_access_token(
        data={"sub": target_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "impersonated_user": {
            "id": target_user.id,
            "username": target_user.username,
            "email": target_user.email
        },
        "admin_username": admin.username
    }


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update user details (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Allow updating: email, is_active, is_admin
    if "email" in updates:
        user.email = updates["email"]
    if "is_active" in updates:
        user.is_active = bool(updates["is_active"])
    if "is_admin" in updates:
        user.is_admin = bool(updates["is_admin"])
    
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
        "is_admin": user.is_admin
    }


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete a user (admin only) - be careful!"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting yourself
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    
    username = user.username
    db.delete(user)
    db.commit()
    
    return {"message": f"User {username} deleted successfully"}

