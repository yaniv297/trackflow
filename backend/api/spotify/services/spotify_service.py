"""
Spotify service - main orchestrator for Spotify operations.
"""

from typing import List, Dict
from sqlalchemy.orm import Session

from schemas import SongOut
from .song_enhancement_service import SongEnhancementService
from .album_service import AlbumService
from .search_service import SearchService
from .song_response_service import SongResponseService
from .playlist_service import PlaylistService
from .artist_service import ArtistService
from ..validators.spotify_validators import (
    TracklistItem, SpotifyOptionResponse, SpotifyPlaylistImportRequest,
    ArtistImageFetchResponse, BulkImageFetchResponse
)


class SpotifyService:
    def __init__(self):
        self.enhancement_service = SongEnhancementService()
        self.album_service = AlbumService()
        self.search_service = SearchService()
        self.response_service = SongResponseService()
        self.playlist_service = PlaylistService()
        self.artist_service = ArtistService()

    def enhance_song_with_track_data(self, song_id: int, track_id: str, db: Session, 
                                   preserve_artist_album: bool = False):
        """Enhance a song with Spotify track data."""
        return self.enhancement_service.enhance_song_with_track_data(song_id, track_id, db, preserve_artist_album)

    def auto_enhance_song(self, song_id: int, db: Session, preserve_artist_album: bool = False) -> bool:
        """Automatically enhance song by searching for it on Spotify."""
        return self.enhancement_service.auto_enhance_song(song_id, db, preserve_artist_album)

    def get_album_tracklist(self, artist: str, album: str, db: Session) -> List[TracklistItem]:
        """Get Spotify tracklist for an album."""
        return self.album_service.get_album_tracklist(artist, album, db)

    def get_spotify_options_for_song(self, song_id: int, db: Session) -> List[SpotifyOptionResponse]:
        """Get Spotify track options for a song."""
        return self.search_service.get_spotify_options_for_song(song_id, db)

    def enhance_song_and_return_response(self, song_id: int, track_id: str, db: Session, current_user) -> SongOut:
        """Enhance song and return properly formatted response."""
        return self.response_service.enhance_song_and_return_response(song_id, track_id, db, current_user)

    def import_playlist(self, request: SpotifyPlaylistImportRequest, db: Session, current_user) -> Dict[str, int]:
        """Import all tracks from a Spotify playlist as songs."""
        return self.playlist_service.import_playlist(request, db, current_user)

    def fetch_artist_image(self, artist_id: int, db: Session) -> ArtistImageFetchResponse:
        """Fetch artist image from Spotify for a specific artist."""
        return self.artist_service.fetch_artist_image(artist_id, db)

    def fetch_all_missing_artist_images(self, db: Session) -> BulkImageFetchResponse:
        """Fetch artist images for all artists that don't have them."""
        return self.artist_service.fetch_all_missing_artist_images(db)

