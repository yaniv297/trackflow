import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from database import engine
from models import Base
import asyncio
from contextlib import asynccontextmanager
from api import songs as songs
from api import authoring as authoring
from api import tools as tools
from api import stats as stats
from api import album_series as album_series
from api import auth as auth
from api import packs as packs
from api import collaborations as collaborations
from api import user_settings as user_settings
from api import file_links as file_links
from api import spotify as spotify
from api import rockband_dlc as rockband_dlc
from api import workflows as workflows
from api import bug_reports as bug_reports
from api import admin as admin
from api import feature_requests as feature_requests
from api import achievements as achievements
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os

app = FastAPI(
    title="TrackFlow API",
    description="API for TrackFlow music management system",
    version="1.0.0"
)

# Add trusted host middleware to handle Railway's forwarded headers
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Allow all hosts in production
)

# Add CORS middleware FIRST (before routes)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://trackflow-front.onrender.com",
        "https://frontend-production-4e01.up.railway.app",
        "https://trackflow-frontend.up.railway.app",
        "https://trackflow-frontend.railway.app",
        "https://www.trackflow.site",
        "https://trackflow.site",
    ],
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
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"⚠️ Warning: Could not create database tables: {e}")
        print("The app will start but database operations may fail")

# Register route modules
app.include_router(auth.router)
app.include_router(songs.router)
app.include_router(authoring.router)
app.include_router(spotify.router)
app.include_router(tools.router)
app.include_router(stats.router)
app.include_router(album_series.router)
app.include_router(packs.router)
app.include_router(collaborations.router)
app.include_router(user_settings.router)
app.include_router(file_links.router)
app.include_router(rockband_dlc.router)
app.include_router(workflows.router)
app.include_router(bug_reports.router)
app.include_router(admin.router)
app.include_router(feature_requests.router)
app.include_router(achievements.router)

# Timeout middleware removed - was causing more problems than it solved

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()

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


