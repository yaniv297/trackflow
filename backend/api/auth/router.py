"""Auth router configuration."""

from fastapi import APIRouter
from .routes import auth_routes, user_routes, password_routes

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Include all auth-related routes
router.include_router(auth_routes.router, tags=["authentication"])
router.include_router(user_routes.router, tags=["users"])  
router.include_router(password_routes.router, tags=["password"])