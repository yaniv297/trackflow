from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum, UniqueConstraint, Index, TypeDecorator
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.types import UserDefinedType
from datetime import datetime
import enum

Base = declarative_base()


class SafeDateTime(DateTime):
    """A DateTime type that gracefully handles empty strings by converting them to None.
    
    This is a more robust approach that overrides SQLAlchemy's built-in datetime handling.
    """
    
    def bind_processor(self, dialect):
        """Override bind processor to handle empty strings going to DB."""
        super_proc = super().bind_processor(dialect)
        
        def process(value):
            if value == '' or (isinstance(value, str) and value.strip() == ''):
                return None
            if super_proc:
                return super_proc(value)
            return value
        return process
    
    def result_processor(self, dialect, coltype):
        """Override result processor to handle empty strings coming from DB."""
        super_proc = super().result_processor(dialect, coltype)
        
        def process(value):
            if value == '' or (isinstance(value, str) and value.strip() == ''):
                return None
            if super_proc and value is not None:
                try:
                    return super_proc(value)
                except (ValueError, TypeError):
                    # If datetime parsing fails, return None instead of crashing
                    print(f"Warning: Failed to parse datetime value '{value}', returning None")
                    return None
            return value
        return process


# Re-export Base for compatibility
__all__ = ['Base', 'SafeDateTime', 'User', 'Song', 'Pack', 'Collaboration', 'CollaborationType', 'AlbumSeries', 'Authoring', 'Artist', 'SongStatus', 'WipCollaboration', 'FileLink', 'AlbumSeriesPreexisting', 'RockBandDLC', 'FeatureRequest', 'FeatureRequestComment', 'FeatureRequestVote', 'ActivityLog', 'Achievement', 'UserAchievement', 'UserStats', 'Notification', 'NotificationType', 'ReleasePost', 'PostType', 'PasswordResetToken', 'CollaborationRequest', 'SongProgress']

class SongStatus(str, enum.Enum):
    released = "Released"
    wip = "In Progress"
    future = "Future Plans"

class CollaborationType(enum.Enum):
    PACK_VIEW = "pack_view"
    PACK_EDIT = "pack_edit"
    SONG_EDIT = "song_edit"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)  # NULL = unclaimed user
    
    # User settings fields
    display_name = Column(String, nullable=True)  # Optional display name (different from username)
    preferred_contact_method = Column(String, nullable=True)  # "email" or "discord"
    discord_username = Column(String, nullable=True)  # Discord username for contact
    profile_image_url = Column(String, nullable=True)  # URL to profile image
    website_url = Column(String, nullable=True)  # Personal website or profile URL (e.g., RhythmVerse)
    auto_spotify_fetch_enabled = Column(Boolean, default=True)  # Enable automatic Spotify metadata fetching
    default_public_sharing = Column(Boolean, default=False)  # Global public sharing setting
    
    # Relationships
    songs = relationship("Song", back_populates="user")
    packs = relationship("Pack", back_populates="user")
    collaborations = relationship("Collaboration", back_populates="user")
    artists = relationship("Artist", back_populates="user")

class Pack(Base):
    __tablename__ = "packs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    priority = Column(Integer, nullable=True)  # 1-5 scale, 5 is highest priority, null if not set
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    released_at = Column(DateTime, nullable=True)  # When pack was released
    release_title = Column(String, nullable=True)  # Optional title for the release post
    release_description = Column(Text, nullable=True)  # Optional description for the release
    release_download_link = Column(String, nullable=True)  # Download link for the pack
    release_youtube_url = Column(String, nullable=True)  # YouTube video URL for the release
    show_on_homepage = Column(Boolean, default=True, nullable=False)  # Whether to show this pack on the homepage
    # Relationships
    user = relationship("User", back_populates="packs")
    songs = relationship("Song", back_populates="pack_obj")
    collaborations = relationship("Collaboration", back_populates="pack")

class Song(Base):
    __tablename__ = "songs"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True)
    artist_id = Column(Integer, ForeignKey("artists.id"), nullable=True)
    album = Column(String, index=True)
    year = Column(Integer)
    status = Column(String, index=True)  # "Future Plans", "In Progress", "Released"
    album_cover = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    pack_id = Column(Integer, ForeignKey("packs.id"), index=True)
    optional = Column(Boolean, default=False)  # Whether this song is optional for pack completion
    notes = Column(Text, nullable=True)  # Progress notes for the song
    is_public = Column(Boolean, default=False, index=True)  # Whether this song is public
    created_at = Column(SafeDateTime, default=datetime.utcnow)
    updated_at = Column(SafeDateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    released_at = Column(SafeDateTime, nullable=True)  # When song was released
    release_description = Column(Text, nullable=True)  # Optional description for the release
    release_download_link = Column(String, nullable=True)  # Download link for the song
    release_youtube_url = Column(String, nullable=True)  # YouTube video URL for the release
    
    # Composite indexes for common query patterns
    __table_args__ = (
        Index('idx_song_user_status', 'user_id', 'status'),
        Index('idx_song_pack_status', 'pack_id', 'status'),
        Index('idx_song_artist_title', 'artist', 'title'),
    )
    
    # Relationships
    user = relationship("User", back_populates="songs")
    pack_obj = relationship("Pack", back_populates="songs")
    artist_obj = relationship("Artist", back_populates="songs")
    authoring = relationship(
        "Authoring",
        back_populates="song",
        uselist=False,
        cascade="",  # Do not auto-delete or update authoring (can be a DB view)
        passive_deletes=True,
    )
    progress = relationship("SongProgress", backref="song", cascade="all, delete-orphan")
    collaborations = relationship("Collaboration", back_populates="song")
    # Song-level album series override (nullable)
    album_series_id = Column(Integer, ForeignKey("album_series.id"), nullable=True, index=True)
    album_series_obj = relationship("AlbumSeries", foreign_keys=[album_series_id], uselist=False)

class Collaboration(Base):
    __tablename__ = "collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    pack_id = Column(Integer, ForeignKey("packs.id"), nullable=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    collaboration_type = Column(Enum(CollaborationType), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Ensure either pack_id or song_id is set, but not both
    __table_args__ = (
        UniqueConstraint('pack_id', 'song_id', 'user_id', 'collaboration_type', name='unique_collaboration'),
        # Composite indexes for common query patterns
        Index('idx_collab_user_type', 'user_id', 'collaboration_type'),
        Index('idx_collab_song_user', 'song_id', 'user_id'),
        Index('idx_collab_pack_user', 'pack_id', 'user_id'),
    )
    
    # Relationships
    pack = relationship("Pack", back_populates="collaborations")
    song = relationship("Song", back_populates="collaborations")
    user = relationship("User", back_populates="collaborations")

class Artist(Base):
    __tablename__ = "artists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    image_url = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable - artists are shared entities
    
    # Relationships
    songs = relationship("Song", back_populates="artist_obj")
    user = relationship("User", back_populates="artists")

class AlbumSeries(Base):
    __tablename__ = "album_series"
    
    id = Column(Integer, primary_key=True, index=True)
    series_number = Column(Integer, unique=True, index=True)
    album_name = Column(String, nullable=False)
    artist_name = Column(String, nullable=False)
    year = Column(Integer)
    cover_image_url = Column(String)
    status = Column(String)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    pack_id = Column(Integer, ForeignKey("packs.id"))
    
    # Relationships
    pack = relationship("Pack", foreign_keys=[pack_id])

# Legacy SongCollaboration model removed - use unified Collaboration model instead

class AlbumSeriesPreexisting(Base):
    __tablename__ = "album_series_preexisting"
    
    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("album_series.id"), nullable=False, index=True)
    spotify_track_id = Column(String, nullable=True, index=True)
    title_clean = Column(String, nullable=True, index=True)
    artist = Column(String, nullable=True, index=True)
    pre_existing = Column(Boolean, default=False)  # User marked as "already done"
    irrelevant = Column(Boolean, default=False)    # User marked as "irrelevant"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('series_id', 'spotify_track_id', name='uq_preexisting_series_spotify'),
        UniqueConstraint('series_id', 'title_clean', name='uq_preexisting_series_titleclean'),
    )

class AlbumSeriesOverride(Base):
    __tablename__ = "album_series_overrides"
    
    id = Column(Integer, primary_key=True, index=True)
    series_id = Column(Integer, ForeignKey("album_series.id"), nullable=False, index=True)
    spotify_track_id = Column(String, nullable=True, index=True)
    title_clean = Column(String, nullable=True, index=True)
    linked_song_id = Column(Integer, ForeignKey("songs.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('series_id', 'spotify_track_id', name='uq_override_series_spotify'),
        UniqueConstraint('series_id', 'title_clean', name='uq_override_series_titleclean'),
    )

class WipCollaboration(Base):
    __tablename__ = "wip_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"))
    collaborator = Column(String)  # Username string for now
    field = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    song = relationship("Song")

class Authoring(Base):
    __tablename__ = "authoring"
    
    id = Column(Integer, primary_key=True, index=True)
    # Keep FK for ORM navigation, but don't rely on DB to enforce cascades
    song_id = Column(Integer, ForeignKey("songs.id"), unique=True, nullable=False)
    demucs = Column(Boolean, default=False)
    midi = Column(Boolean, default=False)
    tempo_map = Column(Boolean, default=False)
    fake_ending = Column(Boolean, default=False)
    drums = Column(Boolean, default=False)
    bass = Column(Boolean, default=False)
    guitar = Column(Boolean, default=False)
    vocals = Column(Boolean, default=False)
    harmonies = Column(Boolean, default=False)
    pro_keys = Column(Boolean, default=False)
    keys = Column(Boolean, default=False)
    animations = Column(Boolean, default=False)
    drum_fills = Column(Boolean, default=False)
    overdrive = Column(Boolean, default=False)
    compile = Column(Boolean, default=False)
    
    # Relationships
    song = relationship("Song", back_populates="authoring")

class FileLink(Base):
    __tablename__ = "file_links"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    file_url = Column(String)
    message = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    song = relationship("Song")
    user = relationship("User")

class RockBandDLC(Base):
    __tablename__ = "rock_band_dlc"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True)
    origin = Column(String, index=True)  # RB1, RB2, DLC, Beatles, etc.
    linked_song_id = Column(Integer, ForeignKey("songs.id"), nullable=True, index=True)  # Link to our songs if matched
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Composite indexes for common query patterns
    __table_args__ = (
        Index('idx_dlc_artist_title', 'artist', 'title'),
        Index('idx_dlc_origin', 'origin'),
    )
    
    # Relationships
    linked_song = relationship("Song", foreign_keys=[linked_song_id])

class FeatureRequest(Base):
    __tablename__ = "feature_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_done = Column(Boolean, default=False, index=True)
    is_rejected = Column(Boolean, default=False, index=True)
    rejection_reason = Column(Text, nullable=True)  # Admin explanation for rejection
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    comments = relationship("FeatureRequestComment", back_populates="feature_request", cascade="all, delete-orphan")
    votes = relationship("FeatureRequestVote", back_populates="feature_request", cascade="all, delete-orphan")

class FeatureRequestComment(Base):
    __tablename__ = "feature_request_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    feature_request_id = Column(Integer, ForeignKey("feature_requests.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    parent_comment_id = Column(Integer, ForeignKey("feature_request_comments.id"), nullable=True, index=True)
    comment = Column(Text, nullable=False)
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    feature_request = relationship("FeatureRequest", back_populates="comments")
    user = relationship("User")
    parent_comment = relationship("FeatureRequestComment", remote_side=[id], backref="replies")

class FeatureRequestVote(Base):
    __tablename__ = "feature_request_votes"
    
    id = Column(Integer, primary_key=True, index=True)
    feature_request_id = Column(Integer, ForeignKey("feature_requests.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vote_type = Column(String, nullable=False)  # "upvote" or "downvote"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint('feature_request_id', 'user_id', name='unique_user_vote_per_request'),
    )
    
    # Relationships
    feature_request = relationship("FeatureRequest", back_populates="votes")
    user = relationship("User")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    activity_type = Column(String, nullable=False, index=True)  # e.g., "login", "create_song", "change_status", "import_spotify"
    description = Column(Text, nullable=False)  # Human-readable description
    metadata_json = Column(Text, nullable=True)  # JSON string for additional data
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_activity_created', 'created_at'),
        Index('idx_activity_user_type', 'user_id', 'activity_type'),
    )

class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)  # e.g., "first_song", "hundred_songs"
    name = Column(String, nullable=False)  # Display name
    description = Column(Text, nullable=False)  # What the user needs to do
    icon = Column(String, nullable=False)  # Emoji or icon identifier
    category = Column(String, nullable=False, index=True)  # "milestone", "activity", "quality", "social", "special"
    points = Column(Integer, nullable=False, default=10)  # Points awarded
    rarity = Column(String, nullable=False, default="common", index=True)  # "common", "uncommon", "rare", "epic", "legendary"
    target_value = Column(Integer, nullable=True)  # Target number for count-based achievements (e.g., 5, 10, 100)
    metric_type = Column(String, nullable=True)  # What metric this tracks (e.g., "total_future", "total_released", "wip_completions")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user_achievements = relationship("UserAchievement", back_populates="achievement")

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False, index=True)
    earned_at = Column(DateTime, default=datetime.utcnow, index=True)
    notified = Column(Boolean, default=False)  # Whether user has been notified (for Phase 2 notification system)
    is_public = Column(Boolean, default=True)  # Whether to show in community feed (for Phase 2)
    
    # Relationships
    user = relationship("User")
    achievement = relationship("Achievement", back_populates="user_achievements")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'achievement_id', name='unique_user_achievement'),
        Index('idx_user_achievement_earned', 'earned_at'),
    )

class UserStats(Base):
    __tablename__ = "user_stats"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True, index=True)
    total_songs = Column(Integer, default=0)
    total_released = Column(Integer, default=0)
    total_future = Column(Integer, default=0)
    total_future_created = Column(Integer, default=0)  # Lifetime Future Plans creations counter
    total_wip = Column(Integer, default=0)
    total_wip_created = Column(Integer, default=0)  # Lifetime WIP creations counter
    total_packs = Column(Integer, default=0)
    total_collaborations = Column(Integer, default=0)
    total_spotify_imports = Column(Integer, default=0)
    total_feature_requests = Column(Integer, default=0)
    login_streak = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    last_login_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", uselist=False)

class NotificationType(str, enum.Enum):
    ACHIEVEMENT_EARNED = "achievement_earned"
    COMMENT_REPLY = "comment_reply"
    FEATURE_REQUEST_UPDATE = "feature_request_update"
    WELCOME = "welcome"
    GENERAL = "general"
    PACK_RELEASE = "pack_release"

class PostType(str, enum.Enum):
    PACK_RELEASE = "pack_release"      # Automatic pack release
    SONG_RELEASE = "song_release"      # Individual song release  
    FEATURE_UPDATE = "feature_update"  # New app features
    COMMUNITY_NEWS = "community_news"  # General community updates
    CURATED = "curated"               # Custom admin posts

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False, index=True)  # NotificationType enum value
    title = Column(String, nullable=False)  # Short notification title
    message = Column(Text, nullable=False)  # Notification content
    is_read = Column(Boolean, default=False, index=True)
    
    # Context data for linking to relevant content
    related_achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=True, index=True)
    related_feature_request_id = Column(Integer, ForeignKey("feature_requests.id"), nullable=True, index=True)
    related_comment_id = Column(Integer, ForeignKey("feature_request_comments.id"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    read_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User")
    related_achievement = relationship("Achievement", foreign_keys=[related_achievement_id])
    related_feature_request = relationship("FeatureRequest", foreign_keys=[related_feature_request_id])
    related_comment = relationship("FeatureRequestComment", foreign_keys=[related_comment_id])
    
    __table_args__ = (
        Index('idx_notification_user_read', 'user_id', 'is_read'),
        Index('idx_notification_user_created', 'user_id', 'created_at'),
    )

class ReleasePost(Base):
    """Admin-managed release posts for the home page"""
    __tablename__ = "release_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    post_type = Column(String, nullable=False, index=True)  # PostType enum value
    title = Column(String, nullable=False)  # "Fleetwood Mac - Rumours Album Series"
    subtitle = Column(String, nullable=True)  # "4 classic songs now available"
    description = Column(Text, nullable=True)  # Rich text description
    
    # Visual content
    cover_image_url = Column(String, nullable=True)  # Custom cover or pack cover
    banner_image_url = Column(String, nullable=True)  # Optional banner
    
    # Post metadata
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    is_published = Column(Boolean, default=False, index=True)
    is_featured = Column(Boolean, default=False, index=True)  # Featured posts shown first
    published_at = Column(DateTime, nullable=True, index=True)
    
    # Linked content
    pack_id = Column(Integer, ForeignKey("packs.id"), nullable=True, index=True)  # For pack releases
    linked_song_ids = Column(Text, nullable=True)  # JSON array of song IDs
    
    # SEO/social
    slug = Column(String, unique=True, nullable=True, index=True)  # URL slug
    tags = Column(Text, nullable=True)  # JSON array of tags
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    pack = relationship("Pack", foreign_keys=[pack_id])
    
    __table_args__ = (
        Index('idx_release_post_published', 'is_published', 'published_at'),
        Index('idx_release_post_featured', 'is_featured', 'published_at'),
        Index('idx_release_post_type', 'post_type', 'published_at'),
    )

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    token = Column(String, nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_token_email', 'email'),
        Index('idx_token_expires', 'expires_at'),
    )

class CollaborationRequest(Base):
    __tablename__ = "collaboration_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Request details
    message = Column(Text, nullable=False)  # Requester's message
    requested_parts = Column(Text, nullable=True)  # JSON array of requested authoring parts
    
    # Response from owner
    status = Column(String, default="pending", index=True)  # "pending", "accepted", "rejected"
    owner_response = Column(Text, nullable=True)  # Owner's message when accepting/rejecting
    assigned_parts = Column(Text, nullable=True)  # JSON array of parts assigned (for WIP songs)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    responded_at = Column(DateTime, nullable=True)
    
    # Ensure only one request per song per user
    __table_args__ = (
        UniqueConstraint('song_id', 'requester_id', name='unique_song_requester'),
        Index('idx_collab_req_song', 'song_id'),
        Index('idx_collab_req_requester', 'requester_id'),
        Index('idx_collab_req_owner', 'owner_id'),
        Index('idx_collab_req_status', 'status'),
    )
    
    # Relationships
    song = relationship("Song", foreign_keys=[song_id])
    requester = relationship("User", foreign_keys=[requester_id])
    owner = relationship("User", foreign_keys=[owner_id])

class SongProgress(Base):
    """
    Dynamic progress tracking for songs based on user's workflow
    Replaces the old fixed Authoring table
    """
    __tablename__ = "song_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False, index=True)
    step_name = Column(String, nullable=False)  # The workflow step name
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    notes = Column(Text)  # Optional notes for this step
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_song_progress_lookup', 'song_id', 'step_name'),
        UniqueConstraint('song_id', 'step_name', name='uq_song_step_progress'),
    )
