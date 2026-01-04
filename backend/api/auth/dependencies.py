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
    
    import json
    import time
    import os
    # Use environment-specific log path or skip logging in production
    log_path = os.getenv("DEBUG_LOG_PATH", "/Users/yanivbin/code/random/trackflow/.cursor/debug.log")
    # #region agent log
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"location":"dependencies.py:30","message":"get_current_user called","data":{"hasCredentials":bool(credentials),"hasToken":bool(credentials.credentials if credentials else False),"tokenLength":len(credentials.credentials) if credentials and credentials.credentials else 0,"tokenPreview":credentials.credentials[:20]+"..." if credentials and credentials.credentials else None},"timestamp":int(time.time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"A,B,E"})+"\n")
    except:
        pass
    # #endregion
    auth_service = AuthService(db)
    user = auth_service.get_user_by_token(credentials.credentials)
    # #region agent log
    try:
        import os
        log_path = os.getenv("DEBUG_LOG_PATH", "/Users/yanivbin/code/random/trackflow/.cursor/debug.log")
        with open(log_path, "a") as f:
            f.write(json.dumps({"location":"dependencies.py:33","message":"get_user_by_token result","data":{"userFound":bool(user),"username":user.username if user else None},"timestamp":int(time.time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"A,E"})+"\n")
    except:
        pass
    # #endregion
    
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
        created_at=user.created_at.isoformat() if user.created_at else "",
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None
    )


def get_current_active_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def get_current_user_model(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
):
    """Get current user as SQLAlchemy User model (for routes that need the full model)."""
    from models import User
    import json
    import time
    import os
    # Use environment-specific log path or skip logging in production
    log_path = os.getenv("DEBUG_LOG_PATH", "/Users/yanivbin/code/random/trackflow/.cursor/debug.log")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials or not credentials.credentials:
        # #region agent log
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps({"location":"dependencies.py:get_current_user_model","message":"No credentials","data":{},"timestamp":int(time.time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"})+"\n")
        except:
            pass
        # #endregion
        raise credentials_exception
    
    # #region agent log
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"location":"dependencies.py:get_current_user_model","message":"Validating token","data":{"tokenLength":len(credentials.credentials),"tokenPreview":credentials.credentials[:20]+"..."},"timestamp":int(time.time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"})+"\n")
    except:
        pass
    # #endregion
    
    auth_service = AuthService(db)
    user = auth_service.get_user_by_token(credentials.credentials)
    
    # #region agent log
    try:
        with open(log_path, "a") as f:
            f.write(json.dumps({"location":"dependencies.py:get_current_user_model","message":"Token validation result","data":{"userFound":bool(user),"username":user.username if user else None,"isActive":user.is_active if user else None},"timestamp":int(time.time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"})+"\n")
    except:
        pass
    # #endregion
    
    if not user:
        # #region agent log
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps({"location":"dependencies.py:get_current_user_model","message":"User not found - raising 401","data":{},"timestamp":int(time.time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"})+"\n")
        except:
            pass
        # #endregion
        raise credentials_exception
    
    if not user.is_active:
        # #region agent log
        try:
            with open(log_path, "a") as f:
                f.write(json.dumps({"location":"dependencies.py:get_current_user_model","message":"User inactive - raising 401","data":{"username":user.username},"timestamp":int(time.time()*1000),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"})+"\n")
        except:
            pass
        # #endregion
        raise credentials_exception  # Use 401, not 403, to match old behavior
    
    # Record user activity for online tracking
    try:
        from api.user_activity import record_activity
        record_activity(user.id)
    except Exception as e:
        print(f"Failed to record user activity: {e}")
    
    return user


def get_current_active_user_model(current_user = Depends(get_current_user_model)):
    """Get current active user as SQLAlchemy User model."""
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
            created_at=user.created_at.isoformat() if user.created_at else "",
            last_login_at=user.last_login_at.isoformat() if user.last_login_at else None
        )
    except Exception:
        return None