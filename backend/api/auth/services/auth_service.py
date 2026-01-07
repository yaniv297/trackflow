"""Authentication service layer for business logic."""

import os
import time
import secrets
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from threading import Lock
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import User
from ..repositories.user_repository import UserRepository
from .email_service import EmailService
from auth import SECRET_KEY as GLOBAL_SECRET_KEY, ALGORITHM as GLOBAL_ALGORITHM

# Use the same JWT configuration as the core auth module
SECRET_KEY = GLOBAL_SECRET_KEY
ALGORITHM = GLOBAL_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User caching
_user_cache: Dict[str, tuple] = {}
_cache_lock = Lock()
CACHE_TTL = 300  # 5 minutes


class AuthService:
    """Service for authentication business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.email_service = EmailService()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Generate password hash."""
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token and return payload."""
        import os
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                return None
            return payload
        except JWTError as e:
            # If SECRET_KEY is auto-generated, log a warning
            secret_key_source = "env_var" if os.getenv("SECRET_KEY") else "auto_generated"
            if secret_key_source == "auto_generated":
                import sys
                print(f"WARNING: Token validation failed. SECRET_KEY is auto-generated, which means:", file=sys.stderr)
                print(f"  - Each server instance has a different SECRET_KEY", file=sys.stderr)
                print(f"  - Tokens created by one instance cannot be validated by another", file=sys.stderr)
                print(f"  - Set SECRET_KEY environment variable to fix this", file=sys.stderr)
            return None
    
    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password."""
        user = self.user_repo.get_by_username(username)
        if not user:
            return None
        if not user.hashed_password:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user
    
    def get_cached_user_data(self, username: str) -> Optional[dict]:
        """Get user data from cache if not expired."""
        with _cache_lock:
            if username in _user_cache:
                user_data, timestamp = _user_cache[username]
                if time.time() - timestamp < CACHE_TTL:
                    return user_data
                else:
                    del _user_cache[username]
            return None
    
    def cache_user_data(self, username: str, user: User):
        """Cache user data with timestamp."""
        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_active': user.is_active,
            'is_admin': user.is_admin,
            'created_at': user.created_at.isoformat()
        }
        with _cache_lock:
            _user_cache[username] = (user_data, time.time())
    
    def clear_user_cache(self):
        """Clear the entire user cache - useful for impersonation."""
        with _cache_lock:
            global _user_cache
            _user_cache.clear()
    
    def get_user_by_token(self, token: str) -> Optional[User]:
        """Get user from JWT token with caching."""
        payload = self.verify_token(token)
        if not payload:
            return None
        
        username = payload.get("sub")
        if not username:
            return None
        
        # Try cache first
        cached_data = self.get_cached_user_data(username)
        if cached_data:
            # Create User object from cached data
            user = User(**cached_data)
            user.created_at = datetime.fromisoformat(cached_data['created_at'])
            return user
        
        # Fetch from database
        user = self.user_repo.get_by_username(username)
        if user and user.is_active:
            self.cache_user_data(username, user)
            return user
        
        return None
    
    def create_user(self, username: str, email: str, password: str) -> User:
        """Create a new user with validation."""
        # Check if user already exists
        existing_user = self.user_repo.get_by_username(username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        existing_email = self.user_repo.get_by_email(email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        user_data = {
            "username": username,
            "email": email,
            "hashed_password": self.get_password_hash(password),
            "is_active": True,
            "is_admin": False,
            "created_at": datetime.utcnow()
        }
        
        user = self.user_repo.create_user(user_data)
        self.user_repo.commit()
        return user
    
    def claim_user(self, username: str, email: str, password: str) -> User:
        """Claim an existing unclaimed user account."""
        user = self.user_repo.get_by_username(username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account already claimed"
            )
        
        # Update user with credentials and set last_login_at (claiming = first login)
        update_data = {
            "email": email,
            "hashed_password": self.get_password_hash(password),
            "is_active": True,
            "last_login_at": datetime.utcnow()
        }
        
        self.user_repo.update_user(user, update_data)
        self.user_repo.commit()
        return user
    
    def login_user(self, username: str, password: str) -> tuple[str, User]:
        """Login user and return token and user data."""
        user = self.authenticate_user(username, password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Update last login
        update_data = {"last_login_at": datetime.utcnow()}
        self.user_repo.update_user(user, update_data)
        self.user_repo.commit()
        
        # Create access token
        access_token = self.create_access_token(data={"sub": user.username})
        
        return access_token, user