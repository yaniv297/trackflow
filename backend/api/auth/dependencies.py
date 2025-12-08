"""Auth dependencies for FastAPI dependency injection."""

from fastapi import Depends, HTTPException, status, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from .schemas import UserResponse
from .services.auth_service import AuthService

# Security scheme
security = HTTPBearer()


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Get current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials or not credentials.credentials:
        raise credentials_exception
    
    auth_service = AuthService(db)
    user = auth_service.get_user_by_token(credentials.credentials)
    
    if not user:
        raise credentials_exception
    
    # Record user activity for online tracking
    try:
        from api.user_activity import record_activity
        record_activity(user.id)
    except Exception as e:
        print(f"Failed to record user activity: {e}")
    
    # Convert to UserResponse
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at.isoformat() if user.created_at else ""
    )


def get_current_active_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def get_optional_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[UserResponse]:
    """Get current user if token is provided, otherwise return None."""
    # Try to get authorization header manually
    authorization = request.headers.get("Authorization")
    if not authorization:
        return None
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            return None
    except ValueError:
        return None
    
    try:
        auth_service = AuthService(db)
        user = auth_service.get_user_by_token(token)
        
        if not user or not user.is_active:
            return None
        
        # Record user activity for online tracking
        try:
            from api.user_activity import record_activity
            record_activity(user.id)
        except Exception as e:
            print(f"Failed to record user activity: {e}")
        
        # Convert to UserResponse
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active,
            is_admin=user.is_admin,
            created_at=user.created_at.isoformat() if user.created_at else ""
        )
    except Exception:
        return None