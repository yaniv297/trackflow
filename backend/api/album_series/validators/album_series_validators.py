"""Album Series validators and Pydantic models."""

from pydantic import BaseModel
from typing import List, Optional


class UpdateAlbumSeriesStatusRequest(BaseModel):
    status: str


class UpdateRgwPostUrlRequest(BaseModel):
    rgw_post_url: Optional[str] = None


class TracklistItem(BaseModel):
    spotify_track_id: Optional[str] = None
    title: str
    title_clean: str
    artist: str
    track_number: Optional[int] = None
    disc_number: Optional[int] = None
    in_pack: bool = False
    status: Optional[str] = None
    song_id: Optional[int] = None
    official: bool = False
    pre_existing: bool = False
    irrelevant: bool = False


class PreexistingUpdate(BaseModel):
    updates: List[dict]


class IrrelevantUpdate(BaseModel):
    updates: List[dict]


class DiscActionRequest(BaseModel):
    disc_number: int
    action: str  # "mark_irrelevant" or "unmark_irrelevant"


class AddMissingRequest(BaseModel):
    tracks: List[dict]
    pack_id: int


class OverrideRequest(BaseModel):
    spotify_track_id: Optional[str] = None
    title_clean: Optional[str] = None
    linked_song_id: int


class AlbumSeriesValidator:
    """Validator class for album series business rules."""
    
    @staticmethod
    def validate_status(status: str) -> bool:
        """Validate album series status."""
        valid_statuses = ["planned", "in_progress", "released"]
        return status in valid_statuses
    
    @staticmethod
    def validate_disc_action(action: str) -> bool:
        """Validate disc action."""
        valid_actions = ["mark_irrelevant", "unmark_irrelevant"]
        return action in valid_actions
    
    @staticmethod
    def get_valid_statuses() -> List[str]:
        """Get list of valid statuses."""
        return ["planned", "in_progress", "released"]