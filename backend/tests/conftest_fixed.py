import pytest
import os
import tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import get_db
from models import Base, User, Song, Pack, Collaboration, CollaborationType, Authoring, Artist, AlbumSeries, FileLink, WipCollaboration, RockBandDLC, AlbumSeriesPreexisting, AlbumSeriesOverride
from api.auth import get_password_hash, create_access_token

# Set test environment variables before importing app
os.environ["SPOTIFY_CLIENT_ID"] = "test_client_id"
os.environ["SPOTIFY_CLIENT_SECRET"] = "test_client_secret"
os.environ["SECRET_KEY"] = "test_secret_key_for_testing_only"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"

# Create a function to get the app with test database
def get_test_app():
    from main import app
    return app

@pytest.fixture(scope="function")
def test_db():
    """Create a test database"""
    # Create in-memory SQLite database for testing
    engine = create_engine("sqlite:///:memory:")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Get the test app
    app = get_test_app()
    
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
    app = get_test_app()
    return TestClient(app)

@pytest.fixture
def test_user(test_db):
    """Create a test user"""
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123")
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def test_user2(test_db):
    """Create a second test user for collaboration tests"""
    user = User(
        username="testuser2",
        email="test2@example.com",
        hashed_password=get_password_hash("testpassword123")
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user"""
    token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_user2(test_user2):
    """Create authentication headers for second test user"""
    token = create_access_token(data={"sub": test_user2.username})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_song(test_db, test_user):
    """Create a test song"""
    song = Song(
        title="Test Song",
        artist="Test Artist",
        album="Test Album",
        year=2023,
        status="Future Plans",
        user_id=test_user.id
    )
    test_db.add(song)
    test_db.commit()
    test_db.refresh(song)
    return song

@pytest.fixture
def test_song_in_progress(test_db, test_user):
    """Create a test song with 'In Progress' status"""
    song = Song(
        title="Test Song In Progress",
        artist="Test Artist",
        album="Test Album",
        year=2023,
        status="In Progress",
        user_id=test_user.id
    )
    test_db.add(song)
    test_db.commit()
    test_db.refresh(song)
    return song

@pytest.fixture
def test_pack(test_db, test_user):
    """Create a test pack"""
    pack = Pack(
        name="Test Pack",
        user_id=test_user.id
    )
    test_db.add(pack)
    test_db.commit()
    test_db.refresh(pack)
    return pack

@pytest.fixture
def test_album_series(test_db):
    """Create a test album series"""
    series = AlbumSeries(
        artist_name="Test Artist",
        album_name="Test Album",
        status="planned"
    )
    test_db.add(series)
    test_db.commit()
    test_db.refresh(series)
    return series 