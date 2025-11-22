from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import User
from ..services.notification_service import NotificationService
from ..validators.notification_validators import (
    NotificationListOut, 
    NotificationCountOut, 
    NotificationOut,
    NotificationMarkAllReadResponse
)

router = APIRouter()

@router.get("/", response_model=NotificationListOut)
def get_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notifications for the current user"""
    try:
        service = NotificationService(db)
        result = service.get_user_notifications(
            user_id=current_user.id,
            limit=limit,
            offset=offset,
            unread_only=unread_only
        )
        print(f"📋 Fetching notifications for user {current_user.id}: found {len(result.notifications)} notifications")
        return result
    except Exception as e:
        print(f"❌ Error getting notifications for user {current_user.id}: {e}")
        import traceback
        traceback.print_exc()
        raise

@router.get("/count", response_model=NotificationCountOut)
def get_notification_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification count for the current user"""
    try:
        service = NotificationService(db)
        result = service.get_notification_counts(current_user.id)
        print(f"📊 Notification count for user {current_user.id}: {result.unread_count} unread, {result.total_count} total")
        return result
    except Exception as e:
        print(f"❌ Error getting notification count for user {current_user.id}: {e}")
        import traceback
        traceback.print_exc()
        raise

@router.put("/{notification_id}/read", response_model=dict)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read"""
    service = NotificationService(db)
    success = service.mark_notification_read(notification_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=404, 
            detail="Notification not found or already read"
        )
    
    return {"message": "Notification marked as read"}

@router.put("/mark-all-read", response_model=NotificationMarkAllReadResponse)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the current user"""
    service = NotificationService(db)
    return service.mark_all_notifications_read(current_user.id)

@router.post("/welcome", response_model=NotificationOut)
def create_welcome_notification(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a welcome notification for the current user"""
    try:
        service = NotificationService(db)
        result = service.create_welcome_notification(current_user.id)
        print(f"🎉 Created welcome notification for user {current_user.id}")
        return result
    except Exception as e:
        print(f"❌ Error creating welcome notification for user {current_user.id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create welcome notification")

@router.delete("/{notification_id}", response_model=dict)
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific notification"""
    service = NotificationService(db)
    success = service.delete_notification(notification_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )
    
    return {"message": "Notification deleted successfully"}