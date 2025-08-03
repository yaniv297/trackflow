# backend/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os

SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./songs.db")

# Only use check_same_thread for SQLite
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30  # 30 second timeout
    connect_args["isolation_level"] = None  # Autocommit mode
elif SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
    # Optimize for PostgreSQL/Supabase
    connect_args["connect_timeout"] = 10
    connect_args["application_name"] = "trackflow"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    # Optimize pool size for Render
    pool_size=5,
    max_overflow=10,
    pool_timeout=30
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

print(f"📦 Connected to database: {SQLALCHEMY_DATABASE_URL}")

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    print(f"📦 Connected to database: {SQLALCHEMY_DATABASE_URL}")
    try:
        yield db
    finally:
        db.close()