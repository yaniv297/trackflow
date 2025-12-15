from sqlalchemy.orm import Session
from typing import List, Optional, Set

from ..repositories.notification_repository import NotificationRepository
from ..validators.notification_validators import (
    NotificationOut,
    NotificationCountOut,
    NotificationListOut,
    NotificationMarkAllReadResponse,
)
from models import NotificationType, Achievement, FeatureRequest, FeatureRequestComment

class NotificationService:
    """Service layer for notification business logic"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = NotificationRepository(db)
    
    def create_achievement_notification(
        self, 
        user_id: int, 
        achievement_id: int, 
        achievement_name: str,
        achievement_description: str = None
    ) -> NotificationOut:
        """Create a notification for a new achievement"""
        title = f"{achievement_name} Unlocked!"
        message = achievement_description if achievement_description else f"You've earned the '{achievement_name}' achievement!"
        
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
            message="Click Help in the navigation bar to learn about features and get started. Start creating by clicking 'Add Song' to begin your first track!"
        )
        
        return self._format_notification_out(notification)
    
    def create_general_notification(
        self,
        user_id: int,
        title: str,
        message: str,
        related_song_id: Optional[int] = None,
    ) -> NotificationOut:
        """Create a general notification"""
        notification = self.repository.create_notification(
            user_id=user_id,
            type=NotificationType.GENERAL,
            title=title,
            message=message,
            related_achievement_id=None,
            related_feature_request_id=None,
            related_comment_id=None,
            related_song_id=related_song_id,
        )
        
        return self._format_notification_out(notification)
    
    def create_pack_release_notification(
        self, 
        user_id: int, 
        pack_name: str, 
        pack_owner_username: str
    ) -> NotificationOut:
        """Create a pack release notification"""
        title = f"🎵 New Pack Released!"
        message = f"{pack_owner_username} just released '{pack_name}' - Check out the latest releases!"
        
        notification = self.repository.create_notification(
            user_id=user_id,
            type=NotificationType.PACK_RELEASE,
            title=title,
            message=message
        )
        
        return self._format_notification_out(notification)
    
    def broadcast_pack_release_notification(self, pack_name: str, pack_owner_username: str) -> dict:
        """Send pack release notifications to all active users"""
        from models import User
        
        # Get all active users except the pack owner
        users = self.db.query(User).filter(
            User.is_active == True,
            User.username != pack_owner_username
        ).all()
        
        if not users:
            return {"message": "No active users found", "sent_count": 0}
        
        sent_count = 0
        errors = []
        
        for user in users:
            try:
                self.create_pack_release_notification(
                    user_id=user.id,
                    pack_name=pack_name,
                    pack_owner_username=pack_owner_username
                )
                sent_count += 1
            except Exception as e:
                errors.append(f"Failed to send to {user.username}: {str(e)}")
        
        result = {
            "message": f"Pack release notifications sent to {sent_count} users",
            "sent_count": sent_count,
            "total_users": len(users)
        }
        
        if errors:
            result["errors"] = errors[:10]  # Limit to first 10 errors
        
        return result
    
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

    # ==========================================================
    # Collaboration / song helper methods
    # ==========================================================

    def _get_song_collaborator_user_ids(self, song_id: int, actor_user_id: int) -> Set[int]:
        """
        Get all user IDs that should be considered collaborators on a song,
        excluding the acting user.
        """
        from models import Collaboration, CollaborationType, Song  # Local import to avoid cycles

        collaborator_ids: Set[int] = set()

        # Include the song owner
        song = self.db.query(Song).filter(Song.id == song_id).first()
        if not song:
            return set()
        if song.user_id:
            collaborator_ids.add(song.user_id)

        # Include all SONG_EDIT collaborators on this song
        song_collaborations = (
            self.db.query(Collaboration)
            .filter(
                Collaboration.song_id == song_id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT,
            )
            .all()
        )
        for collab in song_collaborations:
            if collab.user_id:
                collaborator_ids.add(collab.user_id)

        # Don't notify the actor themselves
        collaborator_ids.discard(actor_user_id)
        return collaborator_ids

    def notify_song_collaborators(
        self,
        song_id: int,
        actor_user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
    ) -> int:
        """
        Create the same notification for all collaborators on a given song,
        excluding the acting user.

        Returns the number of notifications created.
        """
        collaborator_ids = self._get_song_collaborator_user_ids(song_id, actor_user_id)
        if not collaborator_ids:
            return 0

        created_count = 0
        for target_user_id in collaborator_ids:
            try:
                self.repository.create_notification(
                    user_id=target_user_id,
                    type=notification_type,
                    title=title,
                    message=message,
                    related_song_id=song_id,
                )
                created_count += 1
            except Exception as e:
                # Don't let a single failure break others; just log
                print(
                    f"⚠️ Failed to create collaboration notification "
                    f"for user {target_user_id} on song {song_id}: {e}"
                )

        return created_count

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
            "related_song_id": getattr(notification, "related_song_id", None),
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
                "description": notification.related_achievement.description,
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