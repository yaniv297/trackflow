"""
Spotify API request/response validation schemas.
"""

from pydantic import BaseModel
from typing import Optional, List


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


class SpotifyEnhanceRequest(BaseModel):
    track_id: str


class SpotifyPlaylistImportRequest(BaseModel):
    playlist_url: str
    status: str = "Future Plans"  # "Future Plans", "In Progress", "Released"
    pack: Optional[str] = None


class SpotifyOptionResponse(BaseModel):
    track_id: str
    title: str
    artist: str
    album: Optional[str] = None
    year: Optional[str] = None
    album_cover: Optional[str] = None
    duration_ms: Optional[int] = None
    popularity: Optional[int] = None


class ArtistImageFetchResponse(BaseModel):
    message: str
    image_url: Optional[str] = None


class BulkImageFetchResponse(BaseModel):
    message: str
    updated_count: int
    total_artists: int
    created_count: int
    failed_artists: List[str] = []
    failed_count: int
    log: List[str] = []