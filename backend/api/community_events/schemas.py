"""Pydantic schemas for community events."""

from pydantic import BaseModel, validator, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum


class EventStatus(str, Enum):
    """Event status based on end_date and revealed_at."""
    ACTIVE = "active"  # event_end_date is NULL or in the future
    ENDED = "ended"  # event_end_date has passed


class ParticipationStage(int, Enum):
    """User's participation stage in a community event."""
    NOT_REGISTERED = 0  # User has no song and no registration
    REGISTERED = 1  # User registered interest but hasn't added a song
    IN_PROGRESS = 2  # User has a song but not all workflow steps complete
    COMPLETED = 3  # All workflow steps complete but not submitted
    SUBMITTED = 4  # Song submitted with RhythmVerse link


# ============================================
# Admin schemas (for creating/updating events)
# ============================================

class CommunityEventCreate(BaseModel):
    """Schema for creating a new community event."""
    name: str  # Pack name
    event_theme: str  # Theme name (required)
    event_description: Optional[str] = None
    event_banner_url: Optional[str] = None
    event_end_date: Optional[datetime] = None  # NULL = always open, admin must manually reveal
    rv_release_time: Optional[datetime] = None  # RhythmVerse server release time (CET timezone)
    
    @validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Event name is required")
        if len(v.strip()) > 200:
            raise ValueError("Event name must be less than 200 characters")
        return v.strip()
    
    @validator('event_theme')
    def validate_theme(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("Event theme is required")
        if len(v.strip()) > 255:
            raise ValueError("Event theme must be less than 255 characters")
        return v.strip()


class CommunityEventUpdate(BaseModel):
    """Schema for updating a community event."""
    name: Optional[str] = None
    event_theme: Optional[str] = None
    event_description: Optional[str] = None
    event_banner_url: Optional[str] = None
    event_end_date: Optional[datetime] = None
    rv_release_time: Optional[datetime] = None  # RhythmVerse server release time (CET timezone)
    
    @validator('name')
    def validate_name(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError("Event name cannot be empty")
        return v.strip() if v else v
    
    @validator('event_theme')
    def validate_theme(cls, v):
        if v is not None and len(v.strip()) == 0:
            raise ValueError("Event theme cannot be empty")
        return v.strip() if v else v


# ============================================
# Response schemas
# ============================================

class EventOrganizerInfo(BaseModel):
    """Brief info about the event organizer."""
    id: int
    username: str
    display_name: Optional[str] = None


class EventRegistrationResponse(BaseModel):
    """User registration info for an event."""
    id: int
    user_id: int
    username: str
    display_name: Optional[str] = None
    registered_at: datetime
    
    class Config:
        from_attributes = True


class EventSongResponse(BaseModel):
    """Public song info for event display (no workflow details)."""
    id: int
    title: str
    artist: str
    album: Optional[str] = None
    album_cover: Optional[str] = None
    user_id: int
    username: str
    display_name: Optional[str] = None
    status: str  # "In Progress", "Done", "Uploaded"
    is_event_submitted: bool
    # These are only included after event is revealed
    rhythmverse_link: Optional[str] = None
    event_submission_description: Optional[str] = None
    visualizer_link: Optional[str] = None
    preview_link: Optional[str] = None
    
    class Config:
        from_attributes = True


class EventParticipationStatus(BaseModel):
    """User's participation status in an event."""
    stage: ParticipationStage
    is_registered: bool
    has_song: bool
    song: Optional[EventSongResponse] = None
    # Additional info for the user's own view
    workflow_complete: bool = False
    can_submit: bool = False


class CommunityEventResponse(BaseModel):
    """Full community event response."""
    id: int
    name: str
    event_theme: str
    event_description: Optional[str] = None
    event_banner_url: Optional[str] = None
    event_end_date: Optional[datetime] = None
    rv_release_time: Optional[datetime] = None  # RhythmVerse server release time (CET)
    event_revealed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Computed fields
    status: EventStatus
    is_revealed: bool
    
    # Organizer info
    organizer: Optional[EventOrganizerInfo] = None
    
    # Stats
    participants_count: int = 0  # Total participants (with song + registered)
    songs_count: int = 0  # Songs added to event
    in_progress_count: int = 0  # Songs still being worked on
    done_count: int = 0  # Songs workflow complete but not submitted
    submitted_count: int = 0  # Songs submitted with RhythmVerse link
    registered_count: int = 0  # Users registered but no song yet (for internal use)
    
    # User's participation (only included when requesting as authenticated user)
    participation: Optional[EventParticipationStatus] = None
    
    class Config:
        from_attributes = True


class CommunityEventListResponse(BaseModel):
    """List of community events."""
    events: List[CommunityEventResponse]
    total: int
    active_count: int
    ended_count: int


# ============================================
# Song submission schemas
# ============================================

class SongSubmissionData(BaseModel):
    """Data for submitting a song to an event."""
    rhythmverse_link: str  # Required
    event_submission_description: Optional[str] = None
    visualizer_link: Optional[str] = None
    preview_link: Optional[str] = None
    
    @validator('rhythmverse_link')
    def validate_rhythmverse_link(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("RhythmVerse link is required")
        v = v.strip()
        # Basic URL validation
        if not v.startswith('http://') and not v.startswith('https://'):
            raise ValueError("RhythmVerse link must be a valid URL")
        return v


class SongSubmissionUpdate(BaseModel):
    """Data for updating an event song submission."""
    rhythmverse_link: Optional[str] = None
    event_submission_description: Optional[str] = None
    visualizer_link: Optional[str] = None
    preview_link: Optional[str] = None
    
    @validator('rhythmverse_link')
    def validate_rhythmverse_link(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                raise ValueError("RhythmVerse link cannot be empty")
            if not v.startswith('http://') and not v.startswith('https://'):
                raise ValueError("RhythmVerse link must be a valid URL")
        return v


# ============================================
# Song movement schemas
# ============================================

class AddSongToEventRequest(BaseModel):
    """Request to add a song to an event."""
    # Either create new song or move existing
    song_id: Optional[int] = None  # If provided, move this existing song
    # If creating new song, these fields are required
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    year: Optional[int] = None
    album_cover: Optional[str] = None
    
    @validator('title')
    def validate_title(cls, v, values):
        # Only required if not moving an existing song
        if values.get('song_id') is None and (v is None or len(v.strip()) == 0):
            raise ValueError("Title is required when creating a new song")
        return v.strip() if v else v
    
    @validator('artist')
    def validate_artist(cls, v, values):
        # Only required if not moving an existing song
        if values.get('song_id') is None and (v is None or len(v.strip()) == 0):
            raise ValueError("Artist is required when creating a new song")
        return v.strip() if v else v


class SwapSongRequest(BaseModel):
    """Request to swap a song in an event."""
    # The new song (either existing or to create)
    new_song_id: Optional[int] = None  # If provided, use this existing song
    # If creating new song
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    year: Optional[int] = None
    album_cover: Optional[str] = None
    # Where to put the old song
    old_song_destination: str  # "original_pack", "another_pack", "delete"
    old_song_new_pack_id: Optional[int] = None  # Required if destination is "another_pack"
    
    @validator('old_song_destination')
    def validate_destination(cls, v):
        valid = ["original_pack", "another_pack", "delete"]
        if v not in valid:
            raise ValueError(f"old_song_destination must be one of: {', '.join(valid)}")
        return v
    
    @validator('old_song_new_pack_id')
    def validate_new_pack_id(cls, v, values):
        if values.get('old_song_destination') == 'another_pack' and v is None:
            raise ValueError("old_song_new_pack_id is required when destination is 'another_pack'")
        return v


class RemoveSongRequest(BaseModel):
    """Request to remove a song from an event."""
    destination: str  # "original_pack", "another_pack", "delete"
    new_pack_id: Optional[int] = None  # Required if destination is "another_pack"
    
    @validator('destination')
    def validate_destination(cls, v):
        valid = ["original_pack", "another_pack", "delete"]
        if v not in valid:
            raise ValueError(f"destination must be one of: {', '.join(valid)}")
        return v
    
    @validator('new_pack_id')
    def validate_new_pack_id(cls, v, values):
        if values.get('destination') == 'another_pack' and v is None:
            raise ValueError("new_pack_id is required when destination is 'another_pack'")
        return v

