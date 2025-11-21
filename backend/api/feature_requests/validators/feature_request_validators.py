"""
Feature Requests API validation schemas.
"""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class FeatureRequestCommentOut(BaseModel):
    id: int
    feature_request_id: int
    user_id: int
    username: str
    is_admin: bool
    parent_comment_id: Optional[int] = None
    parent_comment_username: Optional[str] = None
    parent_comment_text: Optional[str] = None
    comment: str
    is_edited: bool
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class FeatureRequestOut(BaseModel):
    id: int
    title: str
    description: str
    user_id: int
    username: str
    is_done: bool
    is_rejected: bool
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    upvotes: int
    downvotes: int
    user_vote: Optional[str] = None  # "upvote", "downvote", or None
    comments: List[FeatureRequestCommentOut]
    comment_count: int


class FeatureRequestCreate(BaseModel):
    title: str
    description: str


class FeatureRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class FeatureRequestCommentCreate(BaseModel):
    comment: str
    parent_comment_id: Optional[int] = None


class FeatureRequestCommentUpdate(BaseModel):
    comment: str


class FeatureRequestVoteRequest(BaseModel):
    vote_type: str  # "upvote" or "downvote"


class FeatureRequestMarkDoneRequest(BaseModel):
    is_done: bool


class FeatureRequestMarkRejectedRequest(BaseModel):
    is_rejected: bool
    rejection_reason: Optional[str] = None


class DeleteResponse(BaseModel):
    message: str