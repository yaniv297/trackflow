from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from database import engine
from models import Base
from api import songs, authoring, spotify, tools, stats, album_series
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

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
        "https://trackflow-front.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables with error handling
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
except Exception as e:
    print(f"⚠️ Warning: Could not create database tables: {e}")
    print("The app will start but database operations may fail")

# Register route modules
app.include_router(songs.router)
app.include_router(authoring.router)
app.include_router(spotify.router)
app.include_router(tools.router)
app.include_router(stats.router)
app.include_router(album_series.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)


