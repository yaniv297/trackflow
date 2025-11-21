"""Main router for Album Series refactored endpoints."""

from fastapi import APIRouter
from .routes import album_series_routes, spotify_routes, tracklist_routes

# Create main router with prefix and tags
router = APIRouter(prefix="/album-series", tags=["Album Series"])

# Include all route modules
router.include_router(album_series_routes.router)
router.include_router(spotify_routes.router)
router.include_router(tracklist_routes.router)