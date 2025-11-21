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

# Export the main components for external use
__all__ = ["router", "SpotifyService"]