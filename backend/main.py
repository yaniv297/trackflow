from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from database import engine
from models import Base
from api import songs, authoring, spotify, tools, stats, album_series, auth
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os

app = FastAPI(
    title="TrackFlow API",
    description="API for TrackFlow music management system",
    version="1.0.0"
)

# Add GZip compression for better performance
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://trackflow-front.onrender.com",
        "https://frontend-production-4e01.up.railway.app",
        "https://*.up.railway.app",  # Allow all Railway subdomains
        "https://*.railway.app",     # Allow all Railway domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)


