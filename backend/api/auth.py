from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User, PasswordResetToken
from datetime import timedelta, datetime
from pydantic import BaseModel
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import time
import secrets
import re

from .user_activity import record_activity

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Simple user cache with TTL
_user_cache = {}
CACHE_TTL = 300  # 5 minutes

def clear_user_cache():
    """Clear the entire user cache - useful for impersonation"""
    global _user_cache
    _user_cache.clear()

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

def _get_cached_user_data(username: str) -> Optional[dict]:
    """Get user data from cache if not expired"""
    if username in _user_cache:
        user_data, timestamp = _user_cache[username]
        if time.time() - timestamp < CACHE_TTL:
            return user_data
        else:
            del _user_cache[username]
    return None

def _cache_user_data(username: str, user: User):
    """Cache user data as dictionary with timestamp"""
    user_data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_active': user.is_active,
        'is_admin': user.is_admin,
        'created_at': user.created_at.isoformat()
    }
    _user_cache[username] = (user_data, time.time())

# Will be defined after UserResponse class

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

# Functions will be defined after UserResponse class

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

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserResponse:
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
    cached_user_data = _get_cached_user_data(username)
    if cached_user_data:
        # Return user from cache data
        user = UserResponse(**cached_user_data)
        # Record user activity for online tracking
        try:
            record_activity(user.id)
        except Exception:
            # Don't fail the request if activity tracking fails
            pass
        return user
    
    # Cache miss - query database
    db_user = db.query(User).filter(User.username == username).first()
    if db_user is None:
        raise credentials_exception
    
    # Cache the user data
    _cache_user_data(username, db_user)
    
    # Record user activity for online tracking
    try:
        record_activity(db_user.id)
    except Exception:
        # Don't fail the request if activity tracking fails
        pass
    
    # Return Pydantic model
    return UserResponse(
        id=db_user.id,
        username=db_user.username,
        email=db_user.email,
        is_active=db_user.is_active,
        is_admin=db_user.is_admin,
        created_at=db_user.created_at.isoformat()
    )

def get_current_active_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

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
    
    # Log login activity
    from .activity_logger import log_activity
    try:
        log_activity(
            db=db,
            user_id=user.id,
            activity_type="login",
            description=f"{user.username} has logged in"
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log login activity: {log_err}")
    
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
def get_current_user_info(current_user: UserResponse = Depends(get_current_active_user)):
    return current_user

@router.get("/users/")
def get_users(current_user: UserResponse = Depends(get_current_active_user), db: Session = Depends(get_db)):
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
def refresh_token(current_user: UserResponse = Depends(get_current_active_user)):
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

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Request password reset email for a user
    """
    try:
        print(f"🔄 Forgot password request for: {request.email}")
        email = request.email.strip().lower()
        print(f"🔄 Normalized email: {email}")
    except Exception as e:
        print(f"❌ Error processing email: {e}")
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Check if user exists
    print(f"🔄 Checking for user with email: {email}")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print(f"⚠️ No user found with email: {email}")
        # Don't reveal whether email exists or not for security
        return {"message": "If an account with that email exists, a password reset link has been sent."}
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    # Save token to database (invalidate any existing tokens for this email)
    db.query(PasswordResetToken).filter(PasswordResetToken.email == email).delete()
    
    reset_token = PasswordResetToken(
        email=email,
        token=token,
        expires_at=expires_at
    )
    db.add(reset_token)
    db.commit()
    
    # Send password reset email
    try:
        from email_service import send_password_reset_email, is_email_configured
        
        if not is_email_configured():
            # For development/testing when email is not configured
            print(f"⚠️  Email not configured. Password reset token for {email}: {token}")
            # Return the same message for security (don't reveal email config status)
            return {"message": "If an account with that email exists, a password reset link has been sent."}
        
        email_sent = send_password_reset_email(email, token, user.username)
        if not email_sent:
            # Clean up token if email failed
            db.delete(reset_token)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send password reset email. Please try again later."
            )
        
        # Log activity
        try:
            from .activity_logger import log_activity
            log_activity(
                db=db,
                user_id=user.id,
                activity_type="password_reset_requested",
                description=f"{user.username} requested a password reset"
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log password reset activity: {log_err}")
            pass  # Don't fail if logging fails
            
    except Exception as e:
        print(f"❌ Error in forgot password: {e}")
        # Clean up token if something went wrong
        db.delete(reset_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request. Please try again later."
        )
    
    return {"message": "If an account with that email exists, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Reset user password using a valid token
    """
    token = request.token
    new_password = request.new_password
    
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    if not re.search(r'[A-Za-z]', new_password) or not re.search(r'\d', new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one letter and one number"
        )
    
    # Find and validate token
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used_at == None  # Token not already used
    ).first()
    
    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token"
        )
    
    # Check if token is expired
    if datetime.utcnow() > reset_token.expires_at:
        # Clean up expired token
        db.delete(reset_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new one."
        )
    
    # Find user by email
    user = db.query(User).filter(User.email == reset_token.email).first()
    if not user:
        # Clean up token if user doesn't exist
        db.delete(reset_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token"
        )
    
    # Update user password
    user.hashed_password = get_password_hash(new_password)
    
    # Mark token as used
    reset_token.used_at = datetime.utcnow()
    
    db.commit()
    
    # Clean up all other tokens for this email
    db.query(PasswordResetToken).filter(
        PasswordResetToken.email == reset_token.email,
        PasswordResetToken.id != reset_token.id
    ).delete()
    db.commit()
    
    # Log activity
    try:
        from .activity_logger import log_activity
        log_activity(
            db=db,
            user_id=user.id,
            activity_type="password_reset_completed",
            description=f"{user.username} successfully reset their password"
        )
    except Exception:
        pass  # Don't fail if logging fails
    
    return {"message": "Password has been reset successfully. You can now login with your new password."} 