"""Backward compatibility for auth module imports."""

# Import the new router
from .auth.router import router

# Import dependencies for backward compatibility
from .auth.dependencies import (
    get_current_user,
    get_current_active_user,
    get_optional_user
)

# Import schemas for backward compatibility
from .auth.schemas import (
    UserResponse,
    Token,
    UserLogin,
    UserCreate
)

# Import services for backward compatibility  
from .auth.services.auth_service import AuthService

# Import utility functions that other modules expect
auth_service_instance = None

def get_auth_service_instance(db=None):
    """Get a global auth service instance for backward compatibility."""
    global auth_service_instance
    if db and (not auth_service_instance or auth_service_instance.db != db):
        auth_service_instance = AuthService(db)
    return auth_service_instance

# Re-export functions that other modules use
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Backward compatibility for password verification."""
    service = AuthService(None)
    return service.verify_password(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Backward compatibility for password hashing.""" 
    service = AuthService(None)
    return service.get_password_hash(password)

def create_access_token(data: dict, expires_delta=None):
    """Backward compatibility for token creation."""
    service = AuthService(None)
    return service.create_access_token(data, expires_delta)

def verify_token(token: str):
    """Backward compatibility for token verification."""
    service = AuthService(None)
    return service.verify_token(token)

def clear_user_cache():
    """Backward compatibility for cache clearing."""
    service = AuthService(None)
    return service.clear_user_cache()

# Export all for backward compatibility
__all__ = [
    "router",
    "get_current_user", 
    "get_current_active_user",
    "get_optional_user",
    "UserResponse",
    "Token",
    "UserLogin",
    "UserCreate",
    "verify_password",
    "get_password_hash", 
    "create_access_token",
    "verify_token",
    "clear_user_cache"
]