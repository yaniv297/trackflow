from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc, func
from models import Notification, User, Achievement, FeatureRequest, FeatureRequestComment
from typing import List, Optional, Tuple
from datetime import datetime, timedelta

class NotificationRepository:
    """Repository for notification data access operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_notification(
        self, 
        user_id: int, 
        type: str, 
        title: str, 
        message: str,
        related_achievement_id: Optional[int] = None,
        related_feature_request_id: Optional[int] = None,
        related_comment_id: Optional[int] = None
    ) -> Notification:
        """Create a new notification"""
        notification = Notification(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            related_achievement_id=related_achievement_id,
            related_feature_request_id=related_feature_request_id,
            related_comment_id=related_comment_id
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification
    
    def get_user_notifications(
        self, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0,
        unread_only: bool = False
    ) -> List[Notification]:
        """Get notifications for a user with optional filtering"""
        query = self.db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
            
        query = query.options(
            joinedload(Notification.related_achievement),
            joinedload(Notification.related_feature_request),
            joinedload(Notification.related_comment)
        )
        
        return query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()
    
    def get_notification_by_id(self, notification_id: int, user_id: int) -> Optional[Notification]:
        """Get a specific notification by ID (ensuring it belongs to the user)"""
        return self.db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.user_id == user_id
            )
        ).first()
    
    def mark_notification_read(self, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read"""
        notification = self.get_notification_by_id(notification_id, user_id)
        if notification and not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            self.db.commit()
            return True
        return False
    
    def mark_all_read(self, user_id: int) -> int:
        """Mark all unread notifications as read for a user"""
        unread_notifications = self.db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).all()
        
        count = 0
        for notification in unread_notifications:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            count += 1
            
        if count > 0:
            self.db.commit()
        
        return count
    
    def get_notification_counts(self, user_id: int) -> Tuple[int, int]:
        """Get unread and total notification counts for a user"""
        unread_count = self.db.query(Notification).filter(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).count()
        
        total_count = self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).count()
        
        return unread_count, total_count
    
    def delete_notification(self, notification_id: int, user_id: int) -> bool:
        """Delete a notification (if it belongs to the user)"""
        notification = self.get_notification_by_id(notification_id, user_id)
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        return False
    
    def cleanup_old_notifications(self, days_old: int = 30) -> int:
        """Clean up old read notifications (for maintenance)"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        deleted = self.db.query(Notification).filter(
            and_(
                Notification.is_read == True,
                Notification.created_at < cutoff_date
            )
        ).delete()
        
        self.db.commit()
        return deleted