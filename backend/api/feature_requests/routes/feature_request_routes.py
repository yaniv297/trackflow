"""
Feature Requests API routes - handles HTTP requests for feature request operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from api.auth import get_current_active_user
from models import User
from ..services.feature_request_service import FeatureRequestService
from ..validators.feature_request_validators import (
    FeatureRequestOut, FeatureRequestCreate, FeatureRequestUpdate,
    FeatureRequestCommentOut, FeatureRequestCommentCreate, FeatureRequestCommentUpdate,
    FeatureRequestVoteRequest, FeatureRequestMarkDoneRequest, FeatureRequestMarkRejectedRequest,
    DeleteResponse
)


router = APIRouter(prefix="/feature-requests", tags=["Feature Requests"])
feature_request_service = FeatureRequestService()


@router.post("/", response_model=FeatureRequestOut)
def create_feature_request(
    request: FeatureRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new feature request"""
    try:
        return feature_request_service.create_feature_request(db, request, current_user)
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Failed to create feature request: {error_msg}")


@router.get("/", response_model=List[FeatureRequestOut])
def list_feature_requests(
    sort_by: str = "upvotes",  # upvotes, newest, oldest, comments, activity
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all feature requests, sorted by specified criteria"""
    try:
        return feature_request_service.list_feature_requests(db, current_user, sort_by)
    except Exception as e:
        error_msg = str(e)
        raise HTTPException(status_code=500, detail=f"Failed to list feature requests: {error_msg}")


@router.get("/{feature_request_id}", response_model=FeatureRequestOut)
def get_feature_request(
    feature_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific feature request by ID"""
    try:
        return feature_request_service.get_feature_request(db, feature_request_id, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/{feature_request_id}/vote", response_model=FeatureRequestOut)
def vote_on_feature_request(
    feature_request_id: int,
    vote: FeatureRequestVoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Vote on a feature request (upvote or downvote)"""
    try:
        return feature_request_service.vote_on_feature_request(db, feature_request_id, vote, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/{feature_request_id}/comments", response_model=FeatureRequestCommentOut)
def add_comment(
    feature_request_id: int,
    comment: FeatureRequestCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a comment to a feature request (or reply to a comment)"""
    try:
        return feature_request_service.add_comment(db, feature_request_id, comment, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.patch("/{feature_request_id}", response_model=FeatureRequestOut)
def update_feature_request(
    feature_request_id: int,
    update: FeatureRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a feature request (owner only)"""
    try:
        return feature_request_service.update_feature_request(db, feature_request_id, update, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        elif "only the feature request owner" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.delete("/{feature_request_id}", response_model=DeleteResponse)
def delete_feature_request(
    feature_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a feature request (owner or admin)"""
    try:
        return feature_request_service.delete_feature_request(db, feature_request_id, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        elif "only the feature request owner or an admin" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.patch("/{feature_request_id}/comments/{comment_id}", response_model=FeatureRequestCommentOut)
def update_comment(
    feature_request_id: int,
    comment_id: int,
    update: FeatureRequestCommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a comment (owner only)"""
    try:
        return feature_request_service.update_comment(db, feature_request_id, comment_id, update, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        elif "only the comment owner" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.delete("/{feature_request_id}/comments/{comment_id}", response_model=DeleteResponse)
def delete_comment(
    feature_request_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a comment (owner or admin) - soft delete to preserve reply chains"""
    try:
        return feature_request_service.delete_comment(db, feature_request_id, comment_id, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        elif "only the comment owner or an admin" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.patch("/{feature_request_id}/mark-done", response_model=FeatureRequestOut)
def mark_feature_done(
    feature_request_id: int,
    request: FeatureRequestMarkDoneRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a feature request as done/undone (admin only)"""
    try:
        return feature_request_service.mark_feature_done(db, feature_request_id, request, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        elif "admin access required" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.patch("/{feature_request_id}/mark-rejected", response_model=FeatureRequestOut)
def mark_feature_rejected(
    feature_request_id: int,
    request: FeatureRequestMarkRejectedRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a feature request as rejected/not planned (admin only)"""
    try:
        return feature_request_service.mark_feature_rejected(db, feature_request_id, request, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        elif "admin access required" in error_msg.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)