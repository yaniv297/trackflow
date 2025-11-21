from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from models import NotificationType

class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool = False
    related_achievement_id: Optional[int] = None
    related_feature_request_id: Optional[int] = None
    related_comment_id: Optional[int] = None
    created_at: datetime
    read_at: Optional[datetime] = None
    
    # Optional related object data for convenience
    achievement: Optional[dict] = None
    feature_request: Optional[dict] = None
    
    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    related_achievement_id: Optional[int] = None
    related_feature_request_id: Optional[int] = None
    related_comment_id: Optional[int] = None

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class NotificationCountOut(BaseModel):
    unread_count: int
    total_count: int

class NotificationListOut(BaseModel):
    notifications: List[NotificationOut]
    unread_count: int
    total_count: int
    
class NotificationMarkAllReadResponse(BaseModel):
    marked_count: int
    message: str