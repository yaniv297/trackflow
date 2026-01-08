from pydantic import BaseModel
from models import SongStatus, PostType, UpdateType
from typing import Optional, List
from datetime import datetime
import json

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    display_name: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    discord_username: Optional[str] = None
    profile_image_url: Optional[str] = None
    website_url: Optional[str] = None
    song_count: Optional[int] = 0  # Total number of songs across all statuses
    
    class Config:
        from_attributes = True

class PublicUserProfileOut(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    discord_username: Optional[str] = None
    profile_image_url: Optional[str] = None
    website_url: Optional[str] = None
    created_at: datetime
    achievement_score: Optional[int] = 0
    leaderboard_rank: Optional[int] = None
    released_songs: List[dict] = []  # Song info
    released_packs: List[dict] = []  # Pack info with songs
    public_wip_songs: List[dict] = []  # Song info
    rarest_achievements: List[dict] = []  # Achievement info with rarity
    
    class Config:
        from_attributes = True

class SongCollaborationCreate(BaseModel):
    author: str  # Username of the collaborator
    role: Optional[str] = None

class SongCollaborationOut(BaseModel):
    id: int
    user_id: int
    username: str  # Username from user relationship
    collaboration_type: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class SongReleaseData(BaseModel):
    description: Optional[str] = None
    download_link: Optional[str] = None
    youtube_url: Optional[str] = None

class SongCreate(BaseModel):
    artist: str
    title: str
    album: Optional[str] = None
    pack_id: Optional[int] = None
    pack_name: Optional[str] = None
    pack: Optional[str] = None  # For new pack creation
    status: SongStatus
    priority: Optional[int] = None  # Priority for pack creation
    year: Optional[int] = None
    album_cover: Optional[str] = None
    notes: Optional[str] = None
    user_id: Optional[int] = None
    optional: Optional[bool] = None
    collaborations: Optional[List[SongCollaborationCreate]] = None
    content_rating: Optional[str] = None  # 'family_friendly', 'supervision', 'mature', or null

class AuthoringOut(BaseModel):
    id: int
    song_id: int
    demucs: bool
    midi: bool
    tempo_map: bool
    fake_ending: bool
    drums: bool
    bass: bool
    guitar: bool
    vocals: bool
    harmonies: bool
    pro_keys: bool
    keys: bool
    animations: bool
    drum_fills: bool
    overdrive: bool
    compile: bool

    class Config:
        from_attributes = True
        
class SongOut(BaseModel):
    id: int
    title: str
    artist: str
    album: Optional[str]
    status: SongStatus
    pack_id: Optional[int] = None
    pack_name: Optional[str] = None
    pack_priority: Optional[int] = None
    pack_owner_id: Optional[int] = None
    pack_owner_username: Optional[str] = None
    year: Optional[int]
    album_cover: Optional[str]
    notes: Optional[str] = None
    author: Optional[str]  # Username from user relationship
    user_id: Optional[int]
    collaborations: List[SongCollaborationOut] = []
    authoring: Optional[AuthoringOut] = None
    optional: Optional[bool] = None
    artist_image_url: Optional[str] = None
    album_series_id: Optional[int] = None
    album_series_number: Optional[int] = None
    album_series_name: Optional[str] = None
    is_editable: Optional[bool] = None
    is_public: Optional[bool] = None  # Whether song is publicly visible
    pack_collaboration: Optional[dict] = None
    released_at: Optional[datetime] = None  # When song was released
    release_description: Optional[str] = None  # Optional description for the release
    release_download_link: Optional[str] = None  # Download link for the song
    release_youtube_url: Optional[str] = None  # YouTube video URL for the release
    content_rating: Optional[str] = None  # 'family_friendly', 'supervision', 'mature', or null
    update_status: Optional[str] = None  # For dual-presence: None (normal), "future_plans", "in_progress"
    # Pack-level release metadata
    pack_release_description: Optional[str] = None  # Pack description for the release
    pack_release_download_link: Optional[str] = None  # Pack download link
    pack_release_youtube_url: Optional[str] = None  # Pack YouTube video URL
    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    

    class Config:
        from_attributes = True

class AuthoringUpdate(BaseModel):
    demucs: Optional[bool] = None
    midi: Optional[bool] = None
    tempo_map: Optional[bool] = None
    fake_ending: Optional[bool] = None
    drums: Optional[bool] = None
    bass: Optional[bool] = None
    guitar: Optional[bool] = None
    vocals: Optional[bool] = None
    harmonies: Optional[bool] = None
    pro_keys: Optional[bool] = None
    keys: Optional[bool] = None
    animations: Optional[bool] = None
    drum_fills: Optional[bool] = None
    overdrive: Optional[bool] = None
    compile: Optional[bool] = None

class EnhanceRequest(BaseModel):
    track_id: str

class AlbumSeriesResponse(BaseModel):
    id: int
    series_number: Optional[int] = None
    album_name: str
    artist_name: str
    year: Optional[int] = None
    cover_image_url: Optional[str] = None
    status: str
    description: Optional[str] = None
    rgw_post_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    song_count: int = 0
    authors: List[str] = []  # List of all authors in this series
    pack_owner_id: Optional[int] = None  # Pack owner ID for released series
    
    class Config:
        from_attributes = True

class AlbumSeriesDetailResponse(BaseModel):
    id: int
    series_number: Optional[int] = None
    album_name: str
    artist_name: str
    year: Optional[int] = None
    cover_image_url: Optional[str] = None
    status: str
    description: Optional[str] = None
    rgw_post_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    pack_id: Optional[int] = None
    pack_name: Optional[str] = None
    pack_owner_id: Optional[int] = None  # Pack owner ID for released series
    album_songs: List[SongOut]
    bonus_songs: List[SongOut]
    total_songs: int
    authors: List[str] = []  # List of all authors in this series
    
    class Config:
        from_attributes = True

class CreateAlbumSeriesRequest(BaseModel):
    pack_name: str
    artist_name: str
    album_name: str
    year: Optional[int] = None
    cover_image_url: Optional[str] = None
    description: Optional[str] = None
    # Optional explicit songs to assign to this series
    song_ids: Optional[list[int]] = None

class FeatureRequestCommentOut(BaseModel):
    id: int
    feature_request_id: int
    user_id: int
    username: str
    is_admin: bool = False
    parent_comment_id: Optional[int] = None
    parent_comment_username: Optional[str] = None
    parent_comment_text: Optional[str] = None
    comment: str
    is_edited: bool = False
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class FeatureRequestCommentCreate(BaseModel):
    comment: str
    parent_comment_id: Optional[int] = None

class FeatureRequestCommentUpdate(BaseModel):
    comment: str

class FeatureRequestUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class FeatureRequestOut(BaseModel):
    id: int
    title: str
    description: str
    user_id: int
    username: str
    is_done: bool = False
    is_rejected: bool = False
    rejection_reason: Optional[str] = None  # Admin explanation for rejection
    created_at: datetime
    updated_at: datetime
    upvotes: int = 0
    downvotes: int = 0
    user_vote: Optional[str] = None  # "upvote", "downvote", or None
    comments: List[FeatureRequestCommentOut] = []
    comment_count: int = 0
    
    class Config:
        from_attributes = True

class FeatureRequestCreate(BaseModel):
    title: str
    description: str

class FeatureRequestVoteRequest(BaseModel):
    vote_type: str  # "upvote" or "downvote"

class FeatureRequestMarkDoneRequest(BaseModel):
    is_done: bool

class FeatureRequestMarkRejectedRequest(BaseModel):
    is_rejected: bool
    rejection_reason: Optional[str] = None  # Admin explanation for rejection

class ActivityLogOut(BaseModel):
    id: int
    user_id: int
    username: str
    activity_type: str
    description: str
    metadata: Optional[dict] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class RecentlyAuthoredPartOut(BaseModel):
    id: int
    song_id: int
    song_title: Optional[str] = None
    song_artist: Optional[str] = None
    album_cover: Optional[str] = None
    step_name: str
    completed_at: datetime
    user_id: int
    username: str
    
    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    is_read: bool = False
    related_achievement_id: Optional[int] = None
    related_feature_request_id: Optional[int] = None
    related_comment_id: Optional[int] = None
    created_at: datetime
    read_at: Optional[datetime] = None
    
    # Optional related object data for convenience
    achievement: Optional[dict] = None
    feature_request: Optional[dict] = None
    
    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    type: str
    title: str
    message: str
    related_achievement_id: Optional[int] = None
    related_feature_request_id: Optional[int] = None
    related_comment_id: Optional[int] = None

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class NotificationCountOut(BaseModel):
    unread_count: int
    total_count: int

class ReleasePostCreate(BaseModel):
    post_type: PostType
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    banner_image_url: Optional[str] = None
    is_published: bool = False
    is_featured: bool = False
    published_at: Optional[datetime] = None
    pack_id: Optional[int] = None
    linked_song_ids: Optional[List[int]] = None
    slug: Optional[str] = None
    tags: Optional[List[str]] = None

class ReleasePostUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    banner_image_url: Optional[str] = None
    is_published: Optional[bool] = None
    is_featured: Optional[bool] = None
    published_at: Optional[datetime] = None
    pack_id: Optional[int] = None
    linked_song_ids: Optional[List[int]] = None
    slug: Optional[str] = None
    tags: Optional[List[str]] = None

class ReleasePostOut(BaseModel):
    id: int
    post_type: PostType
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    banner_image_url: Optional[str] = None
    author_id: int
    author_username: str
    is_published: bool
    is_featured: bool
    published_at: Optional[datetime] = None
    pack_id: Optional[int] = None
    pack_name: Optional[str] = None
    linked_song_ids: Optional[List[int]] = None
    linked_songs: Optional[List[SongOut]] = None
    slug: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UpdateCreate(BaseModel):
    title: str
    content: str
    type: UpdateType
    date: Optional[datetime] = None  # If not provided, uses current time

class UpdateUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[UpdateType] = None
    date: Optional[datetime] = None

class UpdateOut(BaseModel):
    id: int
    title: str
    content: str
    type: UpdateType
    author_id: int
    author: str  # Author username
    date: datetime
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True