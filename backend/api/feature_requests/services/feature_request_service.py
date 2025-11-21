"""
Feature Requests service - contains business logic for feature request operations.
"""

from typing import List, Optional
from sqlalchemy.orm import Session

from models import FeatureRequest, User
from ..repositories.feature_request_repository import FeatureRequestRepository
from ..validators.feature_request_validators import (
    FeatureRequestOut, FeatureRequestCreate, FeatureRequestUpdate,
    FeatureRequestCommentOut, FeatureRequestCommentCreate, FeatureRequestCommentUpdate,
    FeatureRequestVoteRequest, FeatureRequestMarkDoneRequest, FeatureRequestMarkRejectedRequest,
    DeleteResponse
)


class FeatureRequestService:
    def __init__(self):
        self.repository = FeatureRequestRepository()

    def create_feature_request(self, db: Session, request: FeatureRequestCreate, current_user: User) -> FeatureRequestOut:
        """Create a new feature request."""
        feature_request = self.repository.create_feature_request(
            db, request.title, request.description, current_user.id
        )
        
        # Auto-upvote by the creator
        self.repository.auto_upvote_by_creator(db, feature_request.id, current_user.id)
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                db=db,
                user_id=current_user.id,
                activity_type="create_feature_request",
                description=f"{current_user.username} requested '{feature_request.title}'",
                metadata={
                    "feature_request_id": feature_request.id,
                    "title": feature_request.title
                }
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log feature request creation: {log_err}")
        
        # Check achievements
        try:
            from api.achievements import check_feature_request_achievements
            check_feature_request_achievements(db, current_user.id)
        except Exception as ach_err:
            print(f"⚠️ Failed to check achievements: {ach_err}")
        
        return self._build_feature_request_response(feature_request, current_user.id, db)

    def list_feature_requests(self, db: Session, current_user: User, sort_by: str = "upvotes") -> List[FeatureRequestOut]:
        """List all feature requests, sorted by specified criteria."""
        feature_requests = self.repository.get_all_feature_requests(db)
        
        # Build response with vote counts and user vote status
        results = []
        for fr in feature_requests:
            results.append(self._build_feature_request_response(fr, current_user.id, db))
        
        # Sort based on sort_by parameter
        results = self._sort_feature_requests(results, sort_by)
        
        return results

    def get_feature_request(self, db: Session, feature_request_id: int, current_user: User) -> FeatureRequestOut:
        """Get a specific feature request by ID."""
        feature_request = self.repository.get_feature_request_by_id(db, feature_request_id)
        
        if not feature_request:
            raise Exception("Feature request not found")
        
        return self._build_feature_request_response(feature_request, current_user.id, db)

    def vote_on_feature_request(self, db: Session, feature_request_id: int, 
                               vote: FeatureRequestVoteRequest, current_user: User) -> FeatureRequestOut:
        """Vote on a feature request (upvote or downvote)."""
        if vote.vote_type not in ["upvote", "downvote"]:
            raise ValueError("vote_type must be 'upvote' or 'downvote'")
        
        feature_request = self.repository.get_feature_request_by_id(db, feature_request_id)
        if not feature_request:
            raise Exception("Feature request not found")
        
        # Check if user already voted
        existing_vote = self.repository.get_user_vote(db, feature_request_id, current_user.id)
        
        if existing_vote:
            # Update existing vote
            if existing_vote.vote_type == vote.vote_type:
                # Same vote type - remove the vote
                self.repository.delete_vote(db, existing_vote)
            else:
                # Different vote type - update it
                self.repository.update_vote(db, existing_vote, vote.vote_type)
        else:
            # Create new vote
            self.repository.create_vote(db, feature_request_id, current_user.id, vote.vote_type)
        
        return self._build_feature_request_response(feature_request, current_user.id, db)

    def add_comment(self, db: Session, feature_request_id: int, 
                   comment: FeatureRequestCommentCreate, current_user: User) -> FeatureRequestCommentOut:
        """Add a comment to a feature request (or reply to a comment)."""
        feature_request = self.repository.get_feature_request_by_id(db, feature_request_id)
        if not feature_request:
            raise Exception("Feature request not found")
        
        # If this is a reply, validate the parent comment
        parent_comment_username = None
        parent_comment_text = None
        if comment.parent_comment_id:
            parent_comment = self.repository.get_parent_comment(
                db, comment.parent_comment_id, feature_request_id
            )
            
            if not parent_comment:
                raise Exception("Parent comment not found or doesn't belong to this feature request")
            
            # Get parent comment info
            parent_user = self.repository.get_user_by_id(db, parent_comment.user_id)
            parent_comment_username = parent_user.username if parent_user else "Unknown"
            parent_comment_text = parent_comment.comment
        
        new_comment = self.repository.create_comment(
            db, feature_request_id, current_user.id, comment.comment, comment.parent_comment_id
        )
        
        # Return with username and parent comment info
        return FeatureRequestCommentOut(
            id=new_comment.id,
            feature_request_id=new_comment.feature_request_id,
            user_id=new_comment.user_id,
            username=current_user.username,
            is_admin=current_user.is_admin,
            parent_comment_id=new_comment.parent_comment_id,
            parent_comment_username=parent_comment_username,
            parent_comment_text=parent_comment_text,
            comment=new_comment.comment,
            is_edited=new_comment.is_edited,
            is_deleted=new_comment.is_deleted,
            created_at=new_comment.created_at,
            updated_at=new_comment.updated_at
        )

    def update_feature_request(self, db: Session, feature_request_id: int, 
                             update: FeatureRequestUpdate, current_user: User) -> FeatureRequestOut:
        """Update a feature request (owner only)."""
        feature_request = self.repository.get_feature_request_by_id(db, feature_request_id)
        if not feature_request:
            raise Exception("Feature request not found")
        
        # Only the owner can edit
        if feature_request.user_id != current_user.id:
            raise Exception("Only the feature request owner can edit it")
        
        updated_feature_request = self.repository.update_feature_request(
            db, feature_request, update.title, update.description
        )
        
        return self._build_feature_request_response(updated_feature_request, current_user.id, db)

    def delete_feature_request(self, db: Session, feature_request_id: int, current_user: User) -> DeleteResponse:
        """Delete a feature request (owner or admin)."""
        feature_request = self.repository.get_feature_request_by_id(db, feature_request_id)
        if not feature_request:
            raise Exception("Feature request not found")

        if feature_request.user_id != current_user.id and not current_user.is_admin:
            raise Exception("Only the feature request owner or an admin can delete it")

        self.repository.delete_feature_request(db, feature_request)
        return DeleteResponse(message="Feature request deleted successfully")

    def update_comment(self, db: Session, feature_request_id: int, comment_id: int, 
                      update: FeatureRequestCommentUpdate, current_user: User) -> FeatureRequestCommentOut:
        """Update a comment (owner only)."""
        comment = self.repository.get_comment_by_id(db, comment_id, feature_request_id)
        if not comment:
            raise Exception("Comment not found")
        
        # Only the owner can edit
        if comment.user_id != current_user.id:
            raise Exception("Only the comment owner can edit it")
        
        updated_comment = self.repository.update_comment(db, comment, update.comment)
        
        # Return with username and parent comment info
        user = self.repository.get_user_by_id(db, updated_comment.user_id)
        
        parent_comment_username = None
        parent_comment_text = None
        if updated_comment.parent_comment_id:
            parent_comment = self.repository.get_comment_by_id(db, updated_comment.parent_comment_id, feature_request_id)
            if parent_comment:
                parent_user = self.repository.get_user_by_id(db, parent_comment.user_id)
                parent_comment_username = parent_user.username if parent_user else "Unknown"
                parent_comment_text = parent_comment.comment
        
        return FeatureRequestCommentOut(
            id=updated_comment.id,
            feature_request_id=updated_comment.feature_request_id,
            user_id=updated_comment.user_id,
            username=user.username if user else "Unknown",
            is_admin=user.is_admin if user else False,
            parent_comment_id=updated_comment.parent_comment_id,
            parent_comment_username=parent_comment_username,
            parent_comment_text=parent_comment_text,
            comment=updated_comment.comment,
            is_edited=updated_comment.is_edited,
            is_deleted=updated_comment.is_deleted,
            created_at=updated_comment.created_at,
            updated_at=updated_comment.updated_at
        )

    def delete_comment(self, db: Session, feature_request_id: int, comment_id: int, 
                      current_user: User) -> DeleteResponse:
        """Delete a comment (owner or admin) - soft delete to preserve reply chains."""
        comment = self.repository.get_comment_by_id(db, comment_id, feature_request_id)
        if not comment:
            raise Exception("Comment not found")
        
        # Only the owner or admin can delete
        if comment.user_id != current_user.id and not current_user.is_admin:
            raise Exception("Only the comment owner or an admin can delete it")
        
        # Soft delete to preserve reply chain
        self.repository.soft_delete_comment(db, comment)
        return DeleteResponse(message="Comment deleted successfully")

    def mark_feature_done(self, db: Session, feature_request_id: int, 
                         request: FeatureRequestMarkDoneRequest, current_user: User) -> FeatureRequestOut:
        """Mark a feature request as done/undone (admin only)."""
        if not current_user.is_admin:
            raise Exception("Admin access required")
        
        feature_request = self.repository.get_feature_request_by_id(db, feature_request_id)
        if not feature_request:
            raise Exception("Feature request not found")
        
        updated_feature_request = self.repository.mark_feature_done(db, feature_request, request.is_done)
        return self._build_feature_request_response(updated_feature_request, current_user.id, db)

    def mark_feature_rejected(self, db: Session, feature_request_id: int, 
                            request: FeatureRequestMarkRejectedRequest, current_user: User) -> FeatureRequestOut:
        """Mark a feature request as rejected/not planned (admin only)."""
        if not current_user.is_admin:
            raise Exception("Admin access required")
        
        feature_request = self.repository.get_feature_request_by_id(db, feature_request_id)
        if not feature_request:
            raise Exception("Feature request not found")
        
        updated_feature_request = self.repository.mark_feature_rejected(
            db, feature_request, request.is_rejected, request.rejection_reason
        )
        return self._build_feature_request_response(updated_feature_request, current_user.id, db)

    # Private helper methods

    def _build_feature_request_response(self, feature_request: FeatureRequest, current_user_id: int, db: Session) -> FeatureRequestOut:
        """Helper function to build FeatureRequestOut with vote counts and user vote."""
        # Count upvotes and downvotes
        upvotes = self.repository.count_votes(db, feature_request.id, "upvote")
        downvotes = self.repository.count_votes(db, feature_request.id, "downvote")
        
        # Get user's vote if any
        user_vote = None
        user_vote_obj = self.repository.get_user_vote(db, feature_request.id, current_user_id)
        if user_vote_obj:
            user_vote = user_vote_obj.vote_type
        
        # Get comments with usernames
        comments = self.repository.get_feature_request_comments(db, feature_request.id)
        
        comment_outs = []
        for comment in comments:
            user = self.repository.get_user_by_id(db, comment.user_id)
            
            # Get parent comment info if this is a reply
            parent_comment_username = None
            parent_comment_text = None
            if comment.parent_comment_id:
                parent_comment = self.repository.get_comment_by_id(db, comment.parent_comment_id, feature_request.id)
                if parent_comment:
                    parent_user = self.repository.get_user_by_id(db, parent_comment.user_id)
                    parent_comment_username = parent_user.username if parent_user else "Unknown"
                    parent_comment_text = parent_comment.comment
            
            comment_outs.append(FeatureRequestCommentOut(
                id=comment.id,
                feature_request_id=comment.feature_request_id,
                user_id=comment.user_id,
                username=user.username if user else "Unknown",
                is_admin=user.is_admin if user else False,
                parent_comment_id=comment.parent_comment_id,
                parent_comment_username=parent_comment_username,
                parent_comment_text=parent_comment_text,
                comment=comment.comment,
                is_edited=comment.is_edited,
                is_deleted=comment.is_deleted,
                created_at=comment.created_at,
                updated_at=comment.updated_at
            ))
        
        # Get creator username
        creator = self.repository.get_user_by_id(db, feature_request.user_id)
        
        return FeatureRequestOut(
            id=feature_request.id,
            title=feature_request.title,
            description=feature_request.description,
            user_id=feature_request.user_id,
            username=creator.username if creator else "Unknown",
            is_done=feature_request.is_done,
            is_rejected=feature_request.is_rejected,
            rejection_reason=feature_request.rejection_reason,
            created_at=feature_request.created_at,
            updated_at=feature_request.updated_at,
            upvotes=upvotes,
            downvotes=downvotes,
            user_vote=user_vote,
            comments=comment_outs,
            comment_count=len(comment_outs)
        )

    def _sort_feature_requests(self, results: List[FeatureRequestOut], sort_by: str) -> List[FeatureRequestOut]:
        """Sort feature requests based on criteria."""
        if sort_by == "newest":
            results.sort(key=lambda x: x.created_at, reverse=True)
        elif sort_by == "oldest":
            results.sort(key=lambda x: x.created_at, reverse=False)
        elif sort_by == "upvotes":
            results.sort(key=lambda x: (x.upvotes - x.downvotes), reverse=True)
        elif sort_by == "comments":
            results.sort(key=lambda x: x.comment_count, reverse=True)
        elif sort_by == "activity":
            # Sort by most recent activity (updated_at or latest comment)
            results.sort(key=lambda x: (
                max(
                    x.updated_at,
                    max([c.created_at for c in x.comments], default=x.created_at)
                ) if x.comments else x.updated_at
            ), reverse=True)
        else:
            # Default to upvotes
            results.sort(key=lambda x: (x.upvotes - x.downvotes), reverse=True)
        
        return results