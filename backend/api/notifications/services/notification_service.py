from sqlalchemy.orm import Session
from ..repositories.notification_repository import NotificationRepository
from ..validators.notification_validators import NotificationOut, NotificationCountOut, NotificationListOut, NotificationMarkAllReadResponse
from models import NotificationType, Achievement, FeatureRequest, FeatureRequestComment
from typing import List, Optional

class NotificationService:
    """Service layer for notification business logic"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = NotificationRepository(db)
    
    def create_achievement_notification(
        self, 
        user_id: int, 
        achievement_id: int, 
        achievement_name: str
    ) -> NotificationOut:
        """Create a notification for a new achievement"""
        title = "Achievement Unlocked! 🏆"
        message = f"You've earned the '{achievement_name}' achievement!"
        
        notification = self.repository.create_notification(
            user_id=user_id,
            type=NotificationType.ACHIEVEMENT_EARNED,
            title=title,
            message=message,
            related_achievement_id=achievement_id
        )
        
        return self._format_notification_out(notification)
    
    def create_comment_reply_notification(
        self, 
        user_id: int, 
        feature_request_id: int, 
        comment_id: int,
        commenter_name: str,
        feature_request_title: str
    ) -> NotificationOut:
        """Create a notification for a comment reply"""
        title = "New Reply to Your Comment"
        message = f"{commenter_name} replied to your comment on '{feature_request_title}'"
        
        notification = self.repository.create_notification(
            user_id=user_id,
            type=NotificationType.COMMENT_REPLY,
            title=title,
            message=message,
            related_feature_request_id=feature_request_id,
            related_comment_id=comment_id
        )
        
        return self._format_notification_out(notification)
    
    def create_feature_request_update_notification(
        self, 
        user_id: int, 
        feature_request_id: int,
        feature_request_title: str,
        update_type: str  # "approved", "rejected", "completed"
    ) -> NotificationOut:
        """Create a notification for feature request status updates"""
        title_map = {
            "approved": "Feature Request Approved ✅",
            "rejected": "Feature Request Updated",
            "completed": "Feature Request Completed! 🎉"
        }
        
        message_map = {
            "approved": f"Your feature request '{feature_request_title}' has been approved!",
            "rejected": f"Your feature request '{feature_request_title}' has been reviewed",
            "completed": f"Your feature request '{feature_request_title}' has been completed!"
        }
        
        title = title_map.get(update_type, "Feature Request Updated")
        message = message_map.get(update_type, f"Your feature request '{feature_request_title}' has been updated")
        
        notification = self.repository.create_notification(
            user_id=user_id,
            type=NotificationType.FEATURE_REQUEST_UPDATE,
            title=title,
            message=message,
            related_feature_request_id=feature_request_id
        )
        
        return self._format_notification_out(notification)
    
    def create_welcome_notification(self, user_id: int) -> NotificationOut:
        """Create a welcome notification for new users"""
        
        # Check if user already has a welcome notification
        existing = self.repository.get_notification_by_type_and_user(user_id, NotificationType.WELCOME)
        if existing:
            return self._format_notification_out(existing)
        
        notification = self.repository.create_notification(
            user_id=user_id,
            type=NotificationType.WELCOME,
            title="🎉 Welcome to TrackFlow!",
            message="Click ⚙️ → Help & FAQ to learn about features and get started. Check out the Stats section to view your progress and achievements!"
        )
        
        return self._format_notification_out(notification)
    
    def create_general_notification(self, user_id: int, title: str, message: str) -> NotificationOut:
        """Create a general notification"""
        notification = self.repository.create_notification(
            user_id=user_id,
            type=NotificationType.GENERAL,
            title=title,
            message=message
        )
        
        return self._format_notification_out(notification)
    
    def get_user_notifications(
        self, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0,
        unread_only: bool = False
    ) -> NotificationListOut:
        """Get notifications for a user"""
        notifications = self.repository.get_user_notifications(
            user_id=user_id, 
            limit=limit, 
            offset=offset, 
            unread_only=unread_only
        )
        
        unread_count, total_count = self.repository.get_notification_counts(user_id)
        
        notification_outs = [self._format_notification_out(n) for n in notifications]
        
        return NotificationListOut(
            notifications=notification_outs,
            unread_count=unread_count,
            total_count=total_count
        )
    
    def get_notification_counts(self, user_id: int) -> NotificationCountOut:
        """Get notification counts for a user"""
        unread_count, total_count = self.repository.get_notification_counts(user_id)
        return NotificationCountOut(unread_count=unread_count, total_count=total_count)
    
    def mark_notification_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a specific notification as read"""
        return self.repository.mark_notification_read(notification_id, user_id)
    
    def mark_all_notifications_read(self, user_id: int) -> NotificationMarkAllReadResponse:
        """Mark all notifications as read for a user"""
        marked_count = self.repository.mark_all_read(user_id)
        
        if marked_count > 0:
            message = f"Marked {marked_count} notification{'s' if marked_count != 1 else ''} as read"
        else:
            message = "No unread notifications to mark"
            
        return NotificationMarkAllReadResponse(marked_count=marked_count, message=message)
    
    def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Delete a notification"""
        return self.repository.delete_notification(notification_id, user_id)
    
    def _format_notification_out(self, notification) -> NotificationOut:
        """Convert notification model to output format with related data"""
        notification_dict = {
            "id": notification.id,
            "user_id": notification.user_id,
            "type": notification.type,
            "title": notification.title,
            "message": notification.message,
            "is_read": notification.is_read,
            "related_achievement_id": notification.related_achievement_id,
            "related_feature_request_id": notification.related_feature_request_id,
            "related_comment_id": notification.related_comment_id,
            "created_at": notification.created_at,
            "read_at": notification.read_at,
            "achievement": None,
            "feature_request": None
        }
        
        # Add related achievement data if available
        if notification.related_achievement:
            notification_dict["achievement"] = {
                "id": notification.related_achievement.id,
                "name": notification.related_achievement.name,
                "icon": notification.related_achievement.icon,
                "points": notification.related_achievement.points
            }
        
        # Add related feature request data if available
        if notification.related_feature_request:
            notification_dict["feature_request"] = {
                "id": notification.related_feature_request.id,
                "title": notification.related_feature_request.title,
                "is_done": notification.related_feature_request.is_done,
                "is_rejected": notification.related_feature_request.is_rejected
            }
        
        return NotificationOut(**notification_dict)