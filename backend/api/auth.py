from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User
from datetime import timedelta, datetime
from pydantic import BaseModel
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import time
import sys

# Add backend directory to path for user_activity import
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from user_activity import record_activity

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Simple user cache with TTL
_user_cache = {}
CACHE_TTL = 300  # 5 minutes

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme
security = HTTPBearer()

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

def _get_cached_user(username: str) -> Optional[User]:
    """Get user from cache if not expired"""
    if username in _user_cache:
        user_data, timestamp = _user_cache[username]
        if time.time() - timestamp < CACHE_TTL:
            return user_data
        else:
            del _user_cache[username]
    return None

def _cache_user(username: str, user: User):
    """Cache user data with timestamp"""
    _user_cache[username] = (user, time.time())

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
    
    # Try cache first
    user = _get_cached_user(username)
    if user is None:
        # Cache miss - query database
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise credentials_exception
        # Cache the user for future requests
        _cache_user(username, user)
    
    # Record user activity for online tracking
    try:
        record_activity(user.id)
    except Exception:
        # Don't fail the request if activity tracking fails
        pass
    
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

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_active: bool
    is_admin: bool = False
    created_at: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

@router.get("/unclaimed-users")
def get_unclaimed_users(db: Session = Depends(get_db)):
    """Get list of users who exist in system but haven't logged in yet (unclaimed accounts).
    These are users created through collaborations who haven't claimed their account yet."""
    unclaimed = db.query(User).filter(User.last_login_at == None).all()
    
    return [{"id": u.id, "username": u.username} for u in unclaimed]

@router.post("/claim-user", response_model=Token)
def claim_existing_user(
    claim_data: dict,
    db: Session = Depends(get_db)
):
    """Claim an existing unclaimed user account by setting password and creating workflow.
    
    Expected data: {user_id, email, password, workflow_steps}
    """
    user_id = claim_data.get("user_id")
    email = claim_data.get("email")
    password = claim_data.get("password")
    workflow_steps = claim_data.get("workflow_steps", [])
    
    if not all([user_id, email, password]):
        raise HTTPException(status_code=400, detail="user_id, email, and password required")
    
    # Input validation
    import re
    
    # Validate user_id is integer
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid user_id")
    
    # Email validation
    email = email.strip().lower()
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Password validation
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one letter and one number")
    
    # Get the unclaimed user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify user is unclaimed
    if user.last_login_at:
        raise HTTPException(status_code=400, detail="User already claimed")
    
    # Check if email is already in use
    existing_email = db.query(User).filter(User.email == email, User.id != user_id).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already in use")
    
    # Claim the user
    user.email = email
    user.hashed_password = get_password_hash(password)
    user.is_active = True
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    # Create user workflow (import from workflows API)
    from sqlalchemy import text
    # Get default template
    tmpl = db.execute(text("SELECT id FROM workflow_templates WHERE is_default = TRUE LIMIT 1")).fetchone()
    if tmpl:
        db.execute(text("""
            INSERT INTO user_workflows (user_id, name, description, template_id)
            VALUES (:uid, 'My Workflow', 'Custom workflow', :tid)
            ON CONFLICT(user_id) DO NOTHING
        """), {"uid": user.id, "tid": tmpl[0]})
        
        workflow_result = db.execute(text("SELECT id FROM user_workflows WHERE user_id = :uid"), {"uid": user.id}).fetchone()
        if workflow_result and workflow_steps:
            workflow_id = workflow_result[0]
            # Clear existing steps and add custom ones
            db.execute(text("DELETE FROM user_workflow_steps WHERE workflow_id = :wid"), {"wid": workflow_id})
            for i, step in enumerate(workflow_steps):
                db.execute(text("""
                    INSERT INTO user_workflow_steps (workflow_id, step_name, display_name, order_index)
                    VALUES (:wid, :step_name, :display_name, :order_index)
                """), {"wid": workflow_id, "step_name": step["step_name"], "display_name": step["display_name"], "order_index": i})
        db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=1440)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )
    }

@router.post("/register", response_model=Token)
def register(registration_data: dict, db: Session = Depends(get_db)):
    """Register a brand new user with custom workflow."""
    username = registration_data.get("username")
    email = registration_data.get("email")
    password = registration_data.get("password")
    workflow_steps = registration_data.get("workflow_steps", [])
    
    if not all([username, email, password]):
        raise HTTPException(status_code=400, detail="username, email, and password required")
    
    # Input validation and sanitization
    import re
    
    # Username validation
    username = username.strip()
    if len(username) < 3 or len(username) > 50:
        raise HTTPException(status_code=400, detail="Username must be between 3 and 50 characters")
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        raise HTTPException(status_code=400, detail="Username can only contain letters, numbers, underscores, and hyphens")
    
    # Password validation
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        raise HTTPException(status_code=400, detail="Password must contain at least one letter and one number")
    
    # Email validation
    email = email.strip().lower()
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(password)
    db_user = User(
        username=username,
        email=email,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Set login timestamp
    db_user.last_login_at = datetime.utcnow()
    db.commit()
    
    # Create user workflow
    from sqlalchemy import text
    tmpl = db.execute(text("SELECT id FROM workflow_templates WHERE is_default = TRUE LIMIT 1")).fetchone()
    if tmpl:
        db.execute(text("""
            INSERT INTO user_workflows (user_id, name, description, template_id)
            VALUES (:uid, 'My Workflow', 'Custom workflow', :tid)
        """), {"uid": db_user.id, "tid": tmpl[0]})
        
        workflow_result = db.execute(text("SELECT id FROM user_workflows WHERE user_id = :uid"), {"uid": db_user.id}).fetchone()
        if workflow_result and workflow_steps:
            workflow_id = workflow_result[0]
            for i, step in enumerate(workflow_steps):
                db.execute(text("""
                    INSERT INTO user_workflow_steps (workflow_id, step_name, display_name, order_index)
                    VALUES (:wid, :step_name, :display_name, :order_index)
                """), {"wid": workflow_id, "step_name": step["step_name"], "display_name": step["display_name"], "order_index": i})
        db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=1440)  # 24 hours
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=db_user.id,
            username=db_user.username,
            email=db_user.email,
            is_active=db_user.is_active,
            is_admin=db_user.is_admin,
            created_at=db_user.created_at.isoformat()
        )
    }

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_credentials.username, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login timestamp
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    access_token_expires = timedelta(minutes=1440)  # 24 hours
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at.isoformat()
        )
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        is_admin=current_user.is_admin,
        created_at=current_user.created_at.isoformat()
    )

@router.get("/users/")
def get_users(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get all users for collaboration dropdown"""
    users = db.query(User).filter(User.is_active == True).all()
    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
        for user in users
    ]

@router.post("/refresh", response_model=Token)
def refresh_token(current_user: User = Depends(get_current_active_user)):
    access_token_expires = timedelta(minutes=1440)  # 24 hours
    access_token = create_access_token(
        data={"sub": current_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=current_user.id,
            username=current_user.username,
            email=current_user.email,
            is_active=current_user.is_active,
            created_at=current_user.created_at.isoformat()
        )
    } 