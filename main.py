from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from database import engine
from models import Base
from api import songs, authoring, spotify, tools, stats
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Register route modules
app.include_router(songs.router)
app.include_router(authoring.router)
app.include_router(spotify.router) 
app.include_router(tools.router)
app.include_router(stats.router)


