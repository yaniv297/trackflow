"""
Feature Requests API endpoints

Handles:
- Creating feature requests
- Listing feature requests (sorted by upvotes)
- Voting on feature requests (upvote/downvote)
- Commenting on feature requests
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List
from database import get_db
from api.auth import get_current_active_user
from models import (
    FeatureRequest, FeatureRequestComment, FeatureRequestVote,
    User
)
from schemas import (
    FeatureRequestOut, FeatureRequestCreate, FeatureRequestUpdate,
    FeatureRequestCommentOut, FeatureRequestCommentCreate, FeatureRequestCommentUpdate,
    FeatureRequestVoteRequest, FeatureRequestMarkDoneRequest
)

router = APIRouter(prefix="/feature-requests", tags=["Feature Requests"])


@router.post("/", response_model=FeatureRequestOut)
def create_feature_request(
    request: FeatureRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new feature request"""
    feature_request = FeatureRequest(
        title=request.title,
        description=request.description,
        user_id=current_user.id
    )
    db.add(feature_request)
    db.commit()
    db.refresh(feature_request)
    
    # Auto-upvote by the creator
    auto_vote = FeatureRequestVote(
        feature_request_id=feature_request.id,
        user_id=current_user.id,
        vote_type="upvote"
    )
    db.add(auto_vote)
    db.commit()
    
    # Return with vote counts and user info
    return _build_feature_request_response(feature_request, current_user.id, db)


@router.get("/", response_model=List[FeatureRequestOut])
def list_feature_requests(
    sort_by: str = "upvotes",  # upvotes, newest, oldest, comments, activity
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all feature requests, sorted by specified criteria"""
    # Get all feature requests with vote counts
    feature_requests = db.query(FeatureRequest).all()
    
    # Build response with vote counts and user vote status
    results = []
    for fr in feature_requests:
        results.append(_build_feature_request_response(fr, current_user.id, db))
    
    # Sort based on sort_by parameter
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


@router.get("/{feature_request_id}", response_model=FeatureRequestOut)
def get_feature_request(
    feature_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific feature request by ID"""
    feature_request = db.query(FeatureRequest).filter(
        FeatureRequest.id == feature_request_id
    ).first()
    
    if not feature_request:
        raise HTTPException(status_code=404, detail="Feature request not found")
    
    return _build_feature_request_response(feature_request, current_user.id, db)


@router.post("/{feature_request_id}/vote", response_model=FeatureRequestOut)
def vote_on_feature_request(
    feature_request_id: int,
    vote: FeatureRequestVoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Vote on a feature request (upvote or downvote)"""
    if vote.vote_type not in ["upvote", "downvote"]:
        raise HTTPException(status_code=400, detail="vote_type must be 'upvote' or 'downvote'")
    
    feature_request = db.query(FeatureRequest).filter(
        FeatureRequest.id == feature_request_id
    ).first()
    
    if not feature_request:
        raise HTTPException(status_code=404, detail="Feature request not found")
    
    # Check if user already voted
    existing_vote = db.query(FeatureRequestVote).filter(
        FeatureRequestVote.feature_request_id == feature_request_id,
        FeatureRequestVote.user_id == current_user.id
    ).first()
    
    if existing_vote:
        # Update existing vote
        if existing_vote.vote_type == vote.vote_type:
            # Same vote type - remove the vote
            db.delete(existing_vote)
        else:
            # Different vote type - update it
            existing_vote.vote_type = vote.vote_type
    else:
        # Create new vote
        new_vote = FeatureRequestVote(
            feature_request_id=feature_request_id,
            user_id=current_user.id,
            vote_type=vote.vote_type
        )
        db.add(new_vote)
    
    db.commit()
    db.refresh(feature_request)
    
    return _build_feature_request_response(feature_request, current_user.id, db)


@router.post("/{feature_request_id}/comments", response_model=FeatureRequestCommentOut)
def add_comment(
    feature_request_id: int,
    comment: FeatureRequestCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a comment to a feature request (or reply to a comment)"""
    feature_request = db.query(FeatureRequest).filter(
        FeatureRequest.id == feature_request_id
    ).first()
    
    if not feature_request:
        raise HTTPException(status_code=404, detail="Feature request not found")
    
    # If this is a reply, validate the parent comment
    parent_comment_username = None
    parent_comment_text = None
    if comment.parent_comment_id:
        parent_comment = db.query(FeatureRequestComment).filter(
            FeatureRequestComment.id == comment.parent_comment_id,
            FeatureRequestComment.feature_request_id == feature_request_id
        ).first()
        
        if not parent_comment:
            raise HTTPException(
                status_code=404,
                detail="Parent comment not found or doesn't belong to this feature request"
            )
        
        # Get parent comment info
        parent_user = db.query(User).filter(User.id == parent_comment.user_id).first()
        parent_comment_username = parent_user.username if parent_user else "Unknown"
        parent_comment_text = parent_comment.comment
    
    new_comment = FeatureRequestComment(
        feature_request_id=feature_request_id,
        user_id=current_user.id,
        parent_comment_id=comment.parent_comment_id,
        comment=comment.comment
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
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


@router.patch("/{feature_request_id}", response_model=FeatureRequestOut)
def update_feature_request(
    feature_request_id: int,
    update: FeatureRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a feature request (owner only)"""
    feature_request = db.query(FeatureRequest).filter(
        FeatureRequest.id == feature_request_id
    ).first()
    
    if not feature_request:
        raise HTTPException(status_code=404, detail="Feature request not found")
    
    # Only the owner can edit
    if feature_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the feature request owner can edit it"
        )
    
    if update.title is not None:
        feature_request.title = update.title
    if update.description is not None:
        feature_request.description = update.description
    
    db.commit()
    db.refresh(feature_request)
    
    return _build_feature_request_response(feature_request, current_user.id, db)


@router.delete("/{feature_request_id}")
def delete_feature_request(
    feature_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a feature request (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    feature_request = db.query(FeatureRequest).filter(
        FeatureRequest.id == feature_request_id
    ).first()

    if not feature_request:
        raise HTTPException(status_code=404, detail="Feature request not found")

    db.delete(feature_request)
    db.commit()

    return {"message": "Feature request deleted successfully"}


@router.patch("/{feature_request_id}/comments/{comment_id}", response_model=FeatureRequestCommentOut)
def update_comment(
    feature_request_id: int,
    comment_id: int,
    update: FeatureRequestCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a comment (owner only)"""
    comment = db.query(FeatureRequestComment).filter(
        FeatureRequestComment.id == comment_id,
        FeatureRequestComment.feature_request_id == feature_request_id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only the owner can edit
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the comment owner can edit it"
        )
    
    comment.comment = update.comment
    comment.is_edited = True
    db.commit()
    db.refresh(comment)
    
    # Return with username and parent comment info
    user = db.query(User).filter(User.id == comment.user_id).first()
    
    parent_comment_username = None
    parent_comment_text = None
    if comment.parent_comment_id:
        parent_comment = db.query(FeatureRequestComment).filter(
            FeatureRequestComment.id == comment.parent_comment_id
        ).first()
        if parent_comment:
            parent_user = db.query(User).filter(User.id == parent_comment.user_id).first()
            parent_comment_username = parent_user.username if parent_user else "Unknown"
            parent_comment_text = parent_comment.comment
    
    return FeatureRequestCommentOut(
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
    )


@router.delete("/{feature_request_id}/comments/{comment_id}")
def delete_comment(
    feature_request_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a comment (owner or admin) - soft delete to preserve reply chains"""
    comment = db.query(FeatureRequestComment).filter(
        FeatureRequestComment.id == comment_id,
        FeatureRequestComment.feature_request_id == feature_request_id
    ).first()
    
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only the owner or admin can delete
    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the comment owner or an admin can delete it"
        )
    
    # Soft delete: mark as deleted instead of actually deleting
    # This preserves the reply chain - replies will still show "[deleted]" as the parent
    comment.is_deleted = True
    comment.comment = "[deleted]"  # Replace content with placeholder
    db.commit()
    
    return {"message": "Comment deleted successfully"}


@router.patch("/{feature_request_id}/mark-done", response_model=FeatureRequestOut)
def mark_feature_done(
    feature_request_id: int,
    request: FeatureRequestMarkDoneRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a feature request as done/undone (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    feature_request = db.query(FeatureRequest).filter(
        FeatureRequest.id == feature_request_id
    ).first()
    
    if not feature_request:
        raise HTTPException(status_code=404, detail="Feature request not found")
    
    feature_request.is_done = request.is_done
    db.commit()
    db.refresh(feature_request)
    
    return _build_feature_request_response(feature_request, current_user.id, db)


def _build_feature_request_response(feature_request: FeatureRequest, current_user_id: int, db: Session) -> FeatureRequestOut:
    """Helper function to build FeatureRequestOut with vote counts and user vote"""
    # Count upvotes and downvotes
    upvotes = db.query(func.count(FeatureRequestVote.id)).filter(
        FeatureRequestVote.feature_request_id == feature_request.id,
        FeatureRequestVote.vote_type == "upvote"
    ).scalar() or 0
    
    downvotes = db.query(func.count(FeatureRequestVote.id)).filter(
        FeatureRequestVote.feature_request_id == feature_request.id,
        FeatureRequestVote.vote_type == "downvote"
    ).scalar() or 0
    
    # Get user's vote if any
    user_vote = None
    user_vote_obj = db.query(FeatureRequestVote).filter(
        FeatureRequestVote.feature_request_id == feature_request.id,
        FeatureRequestVote.user_id == current_user_id
    ).first()
    if user_vote_obj:
        user_vote = user_vote_obj.vote_type
    
    # Get comments with usernames (including deleted ones to preserve reply chains)
    comments = db.query(FeatureRequestComment).filter(
        FeatureRequestComment.feature_request_id == feature_request.id
    ).order_by(FeatureRequestComment.created_at).all()
    
    comment_outs = []
    for comment in comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        
        # Get parent comment info if this is a reply
        parent_comment_username = None
        parent_comment_text = None
        if comment.parent_comment_id:
            parent_comment = db.query(FeatureRequestComment).filter(
                FeatureRequestComment.id == comment.parent_comment_id
            ).first()
            if parent_comment:
                parent_user = db.query(User).filter(User.id == parent_comment.user_id).first()
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
    creator = db.query(User).filter(User.id == feature_request.user_id).first()
    
    return FeatureRequestOut(
        id=feature_request.id,
        title=feature_request.title,
        description=feature_request.description,
        user_id=feature_request.user_id,
        username=creator.username if creator else "Unknown",
        is_done=feature_request.is_done,
        created_at=feature_request.created_at,
        updated_at=feature_request.updated_at,
        upvotes=upvotes,
        downvotes=downvotes,
        user_vote=user_vote,
        comments=comment_outs,
        comment_count=len(comment_outs)
    )

