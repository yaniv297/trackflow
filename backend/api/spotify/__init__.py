"""
Spotify module - Clean architecture refactored Spotify API.

This module provides Spotify integration functionality with a clean architecture:
- Routes: HTTP request handling
- Services: Business logic
- Repositories: Data access
- Validators: Request/response validation

The module maintains backward compatibility with the original spotify.py API.
"""

from .routes.spotify_routes import router
from .services.spotify_service import SpotifyService

# Create a service instance for backward compatibility
_service = SpotifyService()

# Wrapper function for backward compatibility
def auto_enhance_song(song_id: int, db, preserve_artist_album: bool = False) -> bool:
    """Auto enhance song using Spotify data - backward compatibility wrapper"""
    return _service.auto_enhance_song(song_id, db, preserve_artist_album)

# Export the main components for external use
__all__ = ["router", "SpotifyService", "auto_enhance_song"]