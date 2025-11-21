from fastapi import APIRouter

from .song_routes import router as song_router
from .autocomplete_routes import router as autocomplete_router
from .debug_routes import router as debug_router

# Create main router with prefix and tags
router = APIRouter(prefix="/songs", tags=["Songs"])

# Include all sub-routers
router.include_router(song_router)
router.include_router(autocomplete_router)
router.include_router(debug_router)