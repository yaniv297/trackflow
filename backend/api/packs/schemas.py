"""Pack-related Pydantic schemas."""

from pydantic import BaseModel, validator
from typing import Optional, Dict, List


class PackCreate(BaseModel):
    name: str
    priority: Optional[int] = None
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Pack name is required")
        if len(v.strip()) > 200:
            raise ValueError("Pack name must be less than 200 characters")
        return v.strip()
    
    @validator('priority')
    def validate_priority(cls, v):
        if v is not None and (v < 1 or v > 10):
            raise ValueError("Priority must be between 1 and 10")
        return v


class PackUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[int] = None
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            if len(v.strip()) == 0:
                raise ValueError("Pack name cannot be empty")
            if len(v.strip()) > 200:
                raise ValueError("Pack name must be less than 200 characters")
            return v.strip()
        return v
    
    @validator('priority')
    def validate_priority(cls, v):
        if v is not None and (v < 1 or v > 10):
            raise ValueError("Priority must be between 1 and 10")
        return v


class PackStatusUpdate(BaseModel):
    status: str
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = ["WIP", "Complete", "Released"]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v


class PackReleaseData(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    download_link: Optional[str] = None
    youtube_url: Optional[str] = None
    song_download_links: Optional[Dict[int, str]] = None
    hide_from_homepage: Optional[bool] = False
    
    @validator('title')
    def validate_title(cls, v):
        if v is not None and len(v.strip()) > 500:
            raise ValueError("Title must be less than 500 characters")
        return v.strip() if v else v
    
    @validator('description') 
    def validate_description(cls, v):
        if v is not None and len(v) > 2000:
            raise ValueError("Description must be less than 2000 characters")
        return v


class PackResponse(BaseModel):
    id: int
    name: str
    user_id: int
    priority: Optional[int] = None
    created_at: str
    updated_at: str
    released_at: Optional[str] = None
    release_title: Optional[str] = None
    release_description: Optional[str] = None
    release_download_link: Optional[str] = None
    release_youtube_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class PackCompletionResponse(BaseModel):
    pack_id: int
    pack_name: str
    completion_percentage: float
    incomplete_songs: int
    total_songs: int