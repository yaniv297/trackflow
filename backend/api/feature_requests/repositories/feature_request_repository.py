"""
Feature Requests repository - handles data access for feature request operations.
"""

from typing import List, Optional, Dict
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
    
    def get_users_by_ids(self, db: Session, user_ids: List[int]) -> dict:
        """Get multiple users by IDs, returns dict mapping user_id -> User."""
        if not user_ids:
            return {}
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        return {user.id: user for user in users}
    
    def get_all_votes_by_feature_requests(self, db: Session, feature_request_ids: List[int]) -> dict:
        """Get all votes for multiple feature requests, returns dict mapping feature_request_id -> list of votes."""
        if not feature_request_ids:
            return {}
        votes = db.query(FeatureRequestVote).filter(
            FeatureRequestVote.feature_request_id.in_(feature_request_ids)
        ).all()
        result = {}
        for vote in votes:
            if vote.feature_request_id not in result:
                result[vote.feature_request_id] = []
            result[vote.feature_request_id].append(vote)
        return result
    
    def get_vote_counts_by_feature_requests(self, db: Session, feature_request_ids: List[int], current_user_id: int) -> dict:
        """Get vote counts and user votes for multiple feature requests efficiently.
        
        Returns dict with:
        - 'counts': {feature_request_id: {'upvotes': int, 'downvotes': int}}
        - 'user_votes': {feature_request_id: vote_type or None}
        """
        if not feature_request_ids:
            return {'counts': {}, 'user_votes': {}}
        
        # Get all votes for these feature requests
        votes = db.query(FeatureRequestVote).filter(
            FeatureRequestVote.feature_request_id.in_(feature_request_ids)
        ).all()
        
        # Aggregate counts
        counts = {}
        user_votes = {}
        for vote in votes:
            fr_id = vote.feature_request_id
            if fr_id not in counts:
                counts[fr_id] = {'upvotes': 0, 'downvotes': 0}
            
            if vote.vote_type == 'upvote':
                counts[fr_id]['upvotes'] += 1
            elif vote.vote_type == 'downvote':
                counts[fr_id]['downvotes'] += 1
            
            # Track user's vote
            if vote.user_id == current_user_id:
                user_votes[fr_id] = vote.vote_type
        
        # Set None for feature requests where user hasn't voted
        for fr_id in feature_request_ids:
            if fr_id not in user_votes:
                user_votes[fr_id] = None
            if fr_id not in counts:
                counts[fr_id] = {'upvotes': 0, 'downvotes': 0}
        
        return {'counts': counts, 'user_votes': user_votes}
    
    def get_all_comments_by_feature_requests(self, db: Session, feature_request_ids: List[int]) -> dict:
        """Get all comments for multiple feature requests, returns dict mapping feature_request_id -> list of comments."""
        if not feature_request_ids:
            return {}
        comments = db.query(FeatureRequestComment).filter(
            FeatureRequestComment.feature_request_id.in_(feature_request_ids)
        ).order_by(FeatureRequestComment.created_at).all()
        result = {}
        for comment in comments:
            if comment.feature_request_id not in result:
                result[comment.feature_request_id] = []
            result[comment.feature_request_id].append(comment)
        return result
    
    def auto_upvote_by_creator(self, db: Session, feature_request_id: int, user_id: int) -> FeatureRequestVote:
        """Auto-upvote feature request by creator."""
        return self.create_vote(db, feature_request_id, user_id, "upvote")