from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import get_db
from models import User
import os
import time
from collections import defaultdict

# Configuration
import secrets

# Generate a cryptographically secure random secret key if not provided
DEFAULT_SECRET_KEY = secrets.token_urlsafe(32)  # 256-bit key
SECRET_KEY = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)

# CRITICAL: Warn if using default secret (this breaks token validation across instances/restarts)
if SECRET_KEY == DEFAULT_SECRET_KEY:
    import sys
    env_name = os.getenv("RAILWAY_ENVIRONMENT", "unknown")
    print("=" * 80, file=sys.stderr)
    print("CRITICAL WARNING: SECRET_KEY environment variable is not set!", file=sys.stderr)
    print(f"Environment: {env_name}", file=sys.stderr)
    print("", file=sys.stderr)
    print("This will cause authentication failures because:", file=sys.stderr)
    print("1. Each server instance generates a different random SECRET_KEY", file=sys.stderr)
    print("2. Tokens created by one instance cannot be validated by another", file=sys.stderr)
    print("3. All tokens become invalid when the server restarts", file=sys.stderr)
    print("", file=sys.stderr)
    print("SOLUTION: Set SECRET_KEY environment variable to the same value across all instances", file=sys.stderr)
    print("Example: SECRET_KEY=$(openssl rand -base64 32)", file=sys.stderr)
    print("=" * 80, file=sys.stderr)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()

# Rate limiting for authentication attempts
login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION = 300  # 5 minutes

def check_rate_limit(ip_address: str) -> bool:
    """Check if IP address has exceeded login attempt rate limit"""
    now = time.time()
    # Clean old attempts
    login_attempts[ip_address] = [
        attempt for attempt in login_attempts[ip_address] 
        if now - attempt < LOCKOUT_DURATION
    ]
    
    # Check if under limit
    if len(login_attempts[ip_address]) >= MAX_LOGIN_ATTEMPTS:
        return False
    return True

def record_login_attempt(ip_address: str):
    """Record a failed login attempt"""
    login_attempts[ip_address].append(time.time())

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        return payload
    except JWTError:
        return None

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user 