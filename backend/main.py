import os
from dotenv import load_dotenv

# Load environment variables FIRST, before any other imports
# This ensures env vars are available when modules are imported
env_paths = [
    os.path.join(os.path.dirname(__file__), '.env'),  # backend/.env
    os.path.join(os.path.dirname(__file__), '..', '.env'),  # root/.env
]

for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

# Now import everything else after .env is loaded
# Import traceback first (it's a standard library module)
import traceback

# Wrap imports in try/except to catch import errors and provide helpful messages
try:
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.middleware.gzip import GZipMiddleware
    from fastapi.middleware.trustedhost import TrustedHostMiddleware
    from fastapi.responses import JSONResponse
    from sqlalchemy import text
except ImportError as e:
    print(f"CRITICAL: Failed to import core dependencies: {e}")
    print(f"Traceback: {traceback.format_exc()}")
    import sys
    sys.exit(1)

# Import route modules with error handling
try:
    from api.songs import router as songs_router
    from api import authoring as authoring
    from api import tools as tools
    from api import stats as stats
    from api.album_series import router as album_series_router
    from api.auth import router as auth_router
    from api.packs import router as packs_router
    from api import dashboard as dashboard
    from api import collaborations as collaborations
    from api import user_settings as user_settings
    from api import file_links as file_links
    from api.spotify import router as spotify_router
    from api import rockband_dlc as rockband_dlc
    from api import workflows as workflows
    from api import bug_reports as bug_reports
    from api import admin as admin
    from api.feature_requests import router as feature_requests_router
    from api.achievements import router as achievements_router
    from api.notifications import router as notifications_router
    from api.public_songs import router as public_songs_router
    from api.collaboration_requests import router as collaboration_requests_router
    from api.community import router as community_router
    from api.public_profiles import router as public_profiles_router
    from api import updates as updates
    from api.community_events.routes.event_routes import router as community_events_router
    from api.community_events.routes.admin_routes import router as community_events_admin_router
    from database import engine, SQLALCHEMY_DATABASE_URL, get_db
    from models import Base
except ImportError as e:
    print(f"CRITICAL: Failed to import route modules: {e}")
    print(f"Traceback: {traceback.format_exc()}")
    import sys
    sys.exit(1)



app = FastAPI(
    title="TrackFlow API",
    description="API for TrackFlow music management system",
    version="1.0.0"
)

# Request logging middleware (disabled in production for cleaner logs)
# @app.middleware("http")
# async def log_requests(request, call_next):
#     import time
#     start_time = time.time()
#     response = await call_next(request)
#     process_time = time.time() - start_time
#     return response

# Add trusted host middleware to handle Railway's forwarded headers
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Allow all hosts in production
)

# Add CORS middleware FIRST (before routes)
# Use regex pattern to allow all Railway.app subdomains (for staging/preview deployments)
import re

# Build list of allowed origins
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://trackflow-front.onrender.com",
    "https://frontend-production-4e01.up.railway.app",
    "https://frontend-copy-production-3b1e.up.railway.app",
    "https://trackflow-frontend.up.railway.app",
    "https://trackflow-frontend.railway.app",
    "https://site-production-8de8.up.railway.app",
    "https://www.trackflow.site",
    "https://trackflow.site",
]

# Regex pattern to match any Railway.app subdomain
railway_regex = r"https?://.*\.railway\.app$|https?://.*\.up\.railway\.app$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=railway_regex,  # Allow all Railway subdomains via regex
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Length"],
)

# Add GZip compression for better performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

# No need to mount static files for uploads

# Create tables with error handling - don't block startup
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass  # Don't block startup if database is not available

# Register route modules
app.include_router(auth_router)
app.include_router(songs_router)
app.include_router(authoring.router)
app.include_router(spotify_router)
app.include_router(tools.router)
app.include_router(stats.router)
app.include_router(album_series_router)
app.include_router(packs_router)
app.include_router(dashboard.router)
app.include_router(collaborations.router)
app.include_router(user_settings.router)
app.include_router(file_links.router)
app.include_router(rockband_dlc.router)
app.include_router(workflows.router)
app.include_router(bug_reports.router)
app.include_router(admin.router)
app.include_router(feature_requests_router)
app.include_router(achievements_router)
app.include_router(notifications_router, prefix="/notifications")
app.include_router(public_songs_router, prefix="/api")
app.include_router(collaboration_requests_router, prefix="/api")
app.include_router(community_router)
app.include_router(public_profiles_router, prefix="/api")
app.include_router(updates.router, prefix="/api")
app.include_router(community_events_router, prefix="/api")
app.include_router(community_events_admin_router, prefix="/api")

# Timeout middleware removed - was causing more problems than it solved

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        print("🚀 Starting TrackFlow API...")
        init_db()
        print("✅ TrackFlow API started successfully")
    except Exception as e:
        print(f"❌ CRITICAL: Failed to start TrackFlow API: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        # Don't exit - let the server start anyway, but log the error

# Global exception handler to prevent crashes (but don't catch HTTPExceptions)
from fastapi.exceptions import HTTPException as FastAPIHTTPException

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions to prevent server crashes."""
    # Don't catch HTTPExceptions - let FastAPI handle those normally
    if isinstance(exc, FastAPIHTTPException):
        raise exc
    
    print(f"❌ Unhandled exception: {exc}")
    print(f"Traceback: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "TrackFlow API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Health check endpoint for Railway"""
    return {"status": "healthy", "message": "TrackFlow API is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        forwarded_allow_ips="*",  # Trust all forwarded IPs (Railway)
        proxy_headers=True,       # Handle proxy headers
        server_header=False,      # Don't expose server info
        # Optimize for concurrent requests
        workers=1,                # Single worker to avoid memory issues on Railway hobby
        limit_concurrency=50,     # Limit concurrent requests
        limit_max_requests=1000,  # Restart worker after 1000 requests
        timeout_keep_alive=5,     # Close idle connections faster
    )


