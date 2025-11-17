from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User
from schemas import UserOut
from typing import List
from datetime import timedelta
from .auth import create_access_token
from .user_activity import get_online_user_count, get_online_user_ids

router = APIRouter(prefix="/admin", tags=["admin"])

def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to check if user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/users", response_model=List[UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all users (admin only)"""
    from sqlalchemy import func
    from models import Song
    
    # Get users with song counts
    users_with_counts = db.query(
        User,
        func.count(Song.id).label('song_count')
    ).outerjoin(
        Song, User.id == Song.user_id
    ).group_by(User.id).all()
    
    # Convert to UserOut format
    result = []
    for user, song_count in users_with_counts:
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "display_name": user.display_name,
            "preferred_contact_method": user.preferred_contact_method,
            "discord_username": user.discord_username,
            "song_count": song_count or 0
        }
        result.append(UserOut(**user_dict))
    
    return result

@router.patch("/users/{user_id}/toggle-admin")
def toggle_admin_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Toggle admin status for a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-demotion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own admin status"
        )
    
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    
    return {
        "user_id": user.id,
        "username": user.username,
        "is_admin": user.is_admin
    }

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.username} deleted successfully"}

@router.post("/impersonate/{user_id}")
def impersonate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get an access token for another user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create access token for the target user using the same function as login
    access_token_expires = timedelta(minutes=1440)  # 24 hours, same as login
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "impersonated": True
    }

@router.get("/online-users")
def get_online_users_count(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get count and list of users currently online (admin only)"""
    online_user_ids_list = get_online_user_ids()
    
    # Get usernames for online users
    if online_user_ids_list:
        users = db.query(User).filter(User.id.in_(online_user_ids_list)).all()
        usernames = [user.username for user in users]
    else:
        usernames = []
    
    return {
        "online_count": len(usernames),
        "online_users": usernames
    }
