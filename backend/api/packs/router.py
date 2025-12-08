"""Packs router configuration."""

from fastapi import APIRouter
from .routes import pack_routes, pack_completion_routes, pack_release_routes

router = APIRouter(prefix="/packs", tags=["Packs"])

# Include all pack-related routes
router.include_router(pack_routes.router)
router.include_router(pack_completion_routes.router) 
router.include_router(pack_release_routes.router)