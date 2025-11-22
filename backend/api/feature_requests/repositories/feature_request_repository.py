"""
Feature Requests repository - handles data access for feature request operations.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import FeatureRequest, FeatureRequestComment, FeatureRequestVote, User


class FeatureRequestRepository:
    
    def create_feature_request(self, db: Session, title: str, description: str, user_id: int) -> FeatureRequest:
        """Create a new feature request."""
        feature_request = FeatureRequest(
            title=title,
            description=description,
            user_id=user_id
        )
        db.add(feature_request)
        db.commit()
        db.refresh(feature_request)
        return feature_request
    
    def get_all_feature_requests(self, db: Session) -> List[FeatureRequest]:
        """Get all feature requests."""
        return db.query(FeatureRequest).all()
    
    def get_feature_request_by_id(self, db: Session, feature_request_id: int) -> Optional[FeatureRequest]:
        """Get feature request by ID."""
        return db.query(FeatureRequest).filter(
            FeatureRequest.id == feature_request_id
        ).first()
    
    def update_feature_request(self, db: Session, feature_request: FeatureRequest, 
                             title: Optional[str] = None, description: Optional[str] = None) -> FeatureRequest:
        """Update feature request title and/or description."""
        if title is not None:
            feature_request.title = title
        if description is not None:
            feature_request.description = description
        
        db.commit()
        db.refresh(feature_request)
        return feature_request
    
    def delete_feature_request(self, db: Session, feature_request: FeatureRequest):
        """Delete a feature request."""
        db.delete(feature_request)
        db.commit()
    
    def mark_feature_done(self, db: Session, feature_request: FeatureRequest, is_done: bool) -> FeatureRequest:
        """Mark feature request as done/undone."""
        feature_request.is_done = is_done
        if is_done:
            feature_request.is_rejected = False
        db.commit()
        db.refresh(feature_request)
        return feature_request
    
    def mark_feature_rejected(self, db: Session, feature_request: FeatureRequest, 
                            is_rejected: bool, rejection_reason: Optional[str] = None) -> FeatureRequest:
        """Mark feature request as rejected/not planned."""
        feature_request.is_rejected = is_rejected
        if is_rejected:
            feature_request.is_done = False
            feature_request.rejection_reason = rejection_reason
        else:
            feature_request.rejection_reason = None
        db.commit()
        db.refresh(feature_request)
        return feature_request
    
    # Vote operations
    
    def get_user_vote(self, db: Session, feature_request_id: int, user_id: int) -> Optional[FeatureRequestVote]:
        """Get user's vote for a feature request."""
        return db.query(FeatureRequestVote).filter(
            FeatureRequestVote.feature_request_id == feature_request_id,
            FeatureRequestVote.user_id == user_id
        ).first()
    
    def create_vote(self, db: Session, feature_request_id: int, user_id: int, vote_type: str) -> FeatureRequestVote:
        """Create a new vote."""
        vote = FeatureRequestVote(
            feature_request_id=feature_request_id,
            user_id=user_id,
            vote_type=vote_type
        )
        db.add(vote)
        db.commit()
        db.refresh(vote)
        return vote
    
    def update_vote(self, db: Session, vote: FeatureRequestVote, vote_type: str) -> FeatureRequestVote:
        """Update existing vote."""
        vote.vote_type = vote_type
        db.commit()
        db.refresh(vote)
        return vote
    
    def delete_vote(self, db: Session, vote: FeatureRequestVote):
        """Delete a vote."""
        db.delete(vote)
        db.commit()
    
    def count_votes(self, db: Session, feature_request_id: int, vote_type: str) -> int:
        """Count votes of specific type for a feature request."""
        count = db.query(func.count(FeatureRequestVote.id)).filter(
            FeatureRequestVote.feature_request_id == feature_request_id,
            FeatureRequestVote.vote_type == vote_type
        ).scalar()
        return count or 0
    
    # Comment operations
    
    def get_feature_request_comments(self, db: Session, feature_request_id: int) -> List[FeatureRequestComment]:
        """Get all comments for a feature request."""
        return db.query(FeatureRequestComment).filter(
            FeatureRequestComment.feature_request_id == feature_request_id
        ).order_by(FeatureRequestComment.created_at).all()
    
    def get_comment_by_id(self, db: Session, comment_id: int, feature_request_id: int) -> Optional[FeatureRequestComment]:
        """Get comment by ID within specific feature request."""
        return db.query(FeatureRequestComment).filter(
            FeatureRequestComment.id == comment_id,
            FeatureRequestComment.feature_request_id == feature_request_id
        ).first()
    
    def get_parent_comment(self, db: Session, parent_comment_id: int, feature_request_id: int) -> Optional[FeatureRequestComment]:
        """Get parent comment."""
        return db.query(FeatureRequestComment).filter(
            FeatureRequestComment.id == parent_comment_id,
            FeatureRequestComment.feature_request_id == feature_request_id
        ).first()
    
    def create_comment(self, db: Session, feature_request_id: int, user_id: int, 
                      comment_text: str, parent_comment_id: Optional[int] = None) -> FeatureRequestComment:
        """Create a new comment."""
        comment = FeatureRequestComment(
            feature_request_id=feature_request_id,
            user_id=user_id,
            parent_comment_id=parent_comment_id,
            comment=comment_text
        )
        db.add(comment)
        db.commit()
        db.refresh(comment)
        return comment
    
    def update_comment(self, db: Session, comment: FeatureRequestComment, comment_text: str) -> FeatureRequestComment:
        """Update comment text."""
        comment.comment = comment_text
        comment.is_edited = True
        db.commit()
        db.refresh(comment)
        return comment
    
    def soft_delete_comment(self, db: Session, comment: FeatureRequestComment) -> FeatureRequestComment:
        """Soft delete comment (preserve reply chains)."""
        comment.is_deleted = True
        comment.comment = "[deleted]"
        db.commit()
        db.refresh(comment)
        return comment
    
    # User operations
    
    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()
    
    def auto_upvote_by_creator(self, db: Session, feature_request_id: int, user_id: int) -> FeatureRequestVote:
        """Auto-upvote feature request by creator."""
        return self.create_vote(db, feature_request_id, user_id, "upvote")