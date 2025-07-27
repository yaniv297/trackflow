import pytest
import os
import tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import get_db
from models import Base
from main import app

# Set test environment variables
os.environ["SPOTIFY_CLIENT_ID"] = "test_client_id"
os.environ["SPOTIFY_CLIENT_SECRET"] = "test_client_secret"

@pytest.fixture(scope="function")
def test_db():
    """Create a test database"""
    # Create in-memory SQLite database for testing
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Override the get_db dependency
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    db = TestingSessionLocal()
    yield db
    
    # Cleanup
    db.close()
    app.dependency_overrides.clear()

@pytest.fixture
def client(test_db):
    """Create a test client that uses the same database as test_db"""
    # The test_db fixture already sets up the database and overrides get_db
    # So the client will use the same database
    # We need to ensure the tables are created in the same engine that the client uses
    return TestClient(app)



@pytest.fixture
def sample_song_data():
    """Sample song data for testing"""
    return {
        "title": "Test Song",
        "artist": "Test Artist",
        "album": "Test Album",
        "year": 2023,
        "status": "Future Plans",
        "author": "yaniv297",
        "collaborations": []
    }

@pytest.fixture
def sample_collaboration_data():
    """Sample collaboration data for testing"""
    return {
        "author": "test_author",
        "parts": "vocals, guitar"  # Changed from list to string
    } 