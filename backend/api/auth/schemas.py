"""Auth-related Pydantic schemas."""

from pydantic import BaseModel, validator
from typing import Optional
from .validators.auth_validators import AuthValidator


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    
    @validator('username')
    def validate_username(cls, v):
        return AuthValidator.validate_username(v)
    
    @validator('email')
    def validate_email(cls, v):
        return AuthValidator.validate_email(v)
    
    @validator('password')
    def validate_password(cls, v):
        return AuthValidator.validate_password(v)


class UserLogin(BaseModel):
    username: str
    password: str
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Username is required")
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError("Password is required")
        return v


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_active: bool
    is_admin: bool = False
    created_at: str
    last_login_at: Optional[str] = None
    # User settings
    show_instrument_difficulties: bool = True
    show_content_rating: bool = False
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ClaimUserRequest(BaseModel):
    username: str
    email: str
    password: str
    user_id: Optional[int] = None  # For frontend compatibility
    workflow_steps: Optional[list] = []  # Workflow steps for claiming user
    
    @validator('username')
    def validate_username(cls, v):
        return AuthValidator.validate_username(v)
    
    @validator('email')
    def validate_email(cls, v):
        return AuthValidator.validate_email(v)
    
    @validator('password')
    def validate_password(cls, v):
        return AuthValidator.validate_password(v)


class ForgotPasswordRequest(BaseModel):
    email: str
    
    @validator('email')
    def validate_email(cls, v):
        return AuthValidator.validate_email(v)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    
    @validator('token')
    def validate_token(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Reset token is required")
        return v.strip()
    
    @validator('new_password')
    def validate_password(cls, v):
        return AuthValidator.validate_password(v)