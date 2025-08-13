import pytest
import os
import tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from database import get_db
from models import Base, User, Song, Pack, Collaboration, CollaborationType, Authoring, Artist, AlbumSeries, FileLink, WipCollaboration
from main import app
from api.auth import get_password_hash, create_access_token

# Set test environment variables
os.environ["SPOTIFY_CLIENT_ID"] = "test_client_id"
os.environ["SPOTIFY_CLIENT_SECRET"] = "test_client_secret"
os.environ["SECRET_KEY"] = "test_secret_key_for_testing_only"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"

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
def test_authoring(test_db, test_song_in_progress):
    """Create a test authoring record"""
    authoring = Authoring(song_id=test_song_in_progress.id)
    test_db.add(authoring)
    test_db.commit()
    test_db.refresh(authoring)
    return authoring

@pytest.fixture
def test_artist(test_db, test_user):
    """Create a test artist"""
    artist = Artist(
        name="Test Artist",
        image_url="http://example.com/artist.jpg",
        user_id=test_user.id
    )
    test_db.add(artist)
    test_db.commit()
    test_db.refresh(artist)
    return artist

@pytest.fixture
def test_album_series(test_db, test_pack):
    """Create a test album series"""
    album_series = AlbumSeries(
        series_number=1,
        album_name="Test Album",
        artist_name="Test Artist",
        year=2023,
        status="In Progress",
        description="Test description",
        pack_id=test_pack.id
    )
    test_db.add(album_series)
    test_db.commit()
    test_db.refresh(album_series)
    return album_series

@pytest.fixture
def test_collaboration(test_db, test_song, test_user2):
    """Create a test collaboration"""
    collaboration = Collaboration(
        song_id=test_song.id,
        user_id=test_user2.id,
        collaboration_type=CollaborationType.SONG_EDIT
    )
    test_db.add(collaboration)
    test_db.commit()
    test_db.refresh(collaboration)
    return collaboration

@pytest.fixture
def test_file_link(test_db, test_song_in_progress, test_user):
    """Create a test file link"""
    file_link = FileLink(
        song_id=test_song_in_progress.id,
        user_id=test_user.id,
        file_url="http://example.com/file.mid",
        message="Test file link"
    )
    test_db.add(file_link)
    test_db.commit()
    test_db.refresh(file_link)
    return file_link

@pytest.fixture
def test_wip_collaboration(test_db, test_song_in_progress):
    """Create a test WIP collaboration"""
    wip_collab = WipCollaboration(
        song_id=test_song_in_progress.id,
        collaborator="test_collaborator",
        field="drums"
    )
    test_db.add(wip_collab)
    test_db.commit()
    test_db.refresh(wip_collab)
    return wip_collab

@pytest.fixture
def sample_song_data():
    """Sample song data for testing"""
    return {
        "title": "Test Song",
        "artist": "Test Artist",
        "album": "Test Album",
        "year": 2023,
        "status": "Future Plans",
        "collaborations": []
    }

@pytest.fixture
def sample_song_data_with_collaborations():
    """Sample song data with collaborations for testing"""
    return {
        "title": "Test Song",
        "artist": "Test Artist",
        "album": "Test Album",
        "year": 2023,
        "status": "Future Plans",
        "collaborations": [
            {"author": "testuser2"}
        ]
    }

@pytest.fixture
def sample_pack_data():
    """Sample pack data for testing"""
    return {
        "name": "Test Pack"
    }

@pytest.fixture
def sample_album_series_data():
    """Sample album series data for testing"""
    return {
        "pack_name": "Test Pack",
        "artist_name": "Test Artist",
        "album_name": "Test Album",
        "year": 2023,
        "description": "Test description"
    }

@pytest.fixture
def sample_file_link_data():
    """Sample file link data for testing"""
    return {
        "file_url": "http://example.com/file.mid",
        "message": "Test file link"
    }

@pytest.fixture
def sample_collaboration_data():
    """Sample collaboration data for testing"""
    return {
        "user_id": 2  # Will be replaced with actual user ID in tests
    }

@pytest.fixture
def sample_pack_collaboration_data():
    """Sample pack collaboration data for testing"""
    return {
        "user_id": 2,  # Will be replaced with actual user ID in tests
        "permissions": ["pack_view", "pack_edit"]
    }

@pytest.fixture
def sample_user_settings_data():
    """Sample user settings data for testing"""
    return {
        "email": "updated@example.com",
        "preferred_contact_method": "email",
        "discord_username": "updateduser#5678"
    }

@pytest.fixture
def multiple_test_songs(test_db, test_user):
    """Create multiple test songs"""
    songs = []
    for i in range(5):
        song = Song(
            title=f"Test Song {i+1}",
            artist=f"Test Artist {i+1}",
            album=f"Test Album {i+1}",
            year=2023,
            status="Future Plans" if i % 2 == 0 else "In Progress",
            user_id=test_user.id
        )
        test_db.add(song)
        songs.append(song)
    
    test_db.commit()
    for song in songs:
        test_db.refresh(song)
    
    return songs

@pytest.fixture
def multiple_test_packs(test_db, test_user):
    """Create multiple test packs"""
    packs = []
    for i in range(3):
        pack = Pack(
            name=f"Test Pack {i+1}",
            user_id=test_user.id
        )
        test_db.add(pack)
        packs.append(pack)
    
    test_db.commit()
    for pack in packs:
        test_db.refresh(pack)
    
    return packs

@pytest.fixture
def authenticated_client(client, auth_headers):
    """Create an authenticated test client"""
    client.headers.update(auth_headers)
    return client

@pytest.fixture
def authenticated_client_user2(client, auth_headers_user2):
    """Create an authenticated test client for second user"""
    client.headers.update(auth_headers_user2)
    return client

# Helper functions for tests
def create_test_user_with_token(test_db, username="testuser", email="test@example.com"):
    """Helper function to create a test user and return token"""
    user = User(
        username=username,
        email=email,
        hashed_password=get_password_hash("testpassword123")
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    token = create_access_token(data={"sub": user.username})
    return user, token

def create_test_song_with_authoring(test_db, user, title="Test Song", status="In Progress"):
    """Helper function to create a test song with authoring"""
    song = Song(
        title=title,
        artist="Test Artist",
        status=status,
        user_id=user.id
    )
    test_db.add(song)
    test_db.flush()
    
    if status == "In Progress":
        authoring = Authoring(song_id=song.id)
        test_db.add(authoring)
    
    test_db.commit()
    test_db.refresh(song)
    return song

def create_test_pack_with_songs(test_db, user, pack_name="Test Pack", song_count=3):
    """Helper function to create a test pack with songs"""
    pack = Pack(name=pack_name, user_id=user.id)
    test_db.add(pack)
    test_db.flush()
    
    songs = []
    for i in range(song_count):
        song = Song(
            title=f"Song {i+1}",
            artist=f"Artist {i+1}",
            status="Future Plans",
            user_id=user.id,
            pack_id=pack.id
        )
        test_db.add(song)
        songs.append(song)
    
    test_db.commit()
    for song in songs:
        test_db.refresh(song)
    test_db.refresh(pack)
    
    return pack, songs 