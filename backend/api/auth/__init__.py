# Auth API module - refactored into clean architecture layers

from .router import router
from .dependencies import get_current_user, get_current_active_user, get_optional_user
from .services.auth_service import AuthService

# Backward compatibility functions
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

__all__ = [
    "router", 
    "get_current_user", 
    "get_current_active_user", 
    "get_optional_user",
    "verify_password",
    "get_password_hash",
    "create_access_token", 
    "verify_token",
    "clear_user_cache"
]