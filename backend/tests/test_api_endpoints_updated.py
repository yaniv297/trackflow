import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models import User, Song, Pack, Collaboration, CollaborationType, Authoring, AlbumSeries, FileLink
from api.auth import create_access_token, get_password_hash

class TestAuthentication:
    def test_register_user(self, client: TestClient):
        """Test user registration"""
        response = client.post("/auth/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "testuser"
        assert data["user"]["email"] == "test@example.com"

    def test_login_user(self, client: TestClient, test_db: Session):
        """Test user login"""
        # Create user first
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=get_password_hash("testpassword123")
        )
        test_db.add(user)
        test_db.commit()
        
        response = client.post("/auth/login", data={
            "username": "testuser",
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == "testuser"

    def test_get_current_user(self, client: TestClient, test_db: Session):
        """Test getting current user info"""
        # Create user and token
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password=get_password_hash("testpassword123")
        )
        test_db.add(user)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    def test_get_users(self, client: TestClient, test_db: Session):
        """Test getting all users for collaboration dropdown"""
        # Create users
        user1 = User(username="user1", email="user1@example.com", hashed_password="hash")
        user2 = User(username="user2", email="user2@example.com", hashed_password="hash")
        test_db.add_all([user1, user2])
        test_db.commit()
        
        token = create_access_token(data={"sub": user1.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/auth/users/", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

class TestSongsAPI:
    def test_create_song(self, client: TestClient, test_db: Session):
        """Test creating a song"""
        # Create user
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist",
            "album": "Test Album",
            "year": 2023,
            "status": "Future Plans",
            "collaborations": []
        }
        
        response = client.post("/songs/", json=song_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Song"
        assert data["artist"] == "Test Artist"
        assert data["album"] == "Test Album"
        assert data["year"] == 2023
        assert data["status"] == "Future Plans"

    def test_get_songs(self, client: TestClient, test_db: Session):
        """Test getting songs with filters"""
        # Create user and songs
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song1 = Song(title="Song 1", artist="Artist 1", status="Future Plans", user_id=user.id)
        song2 = Song(title="Song 2", artist="Artist 2", status="In Progress", user_id=user.id)
        test_db.add_all([song1, song2])
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test getting all songs
        response = client.get("/songs/", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        
        # Test filtering by status
        response = client.get("/songs/?status=Future+Plans", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(song["status"] == "Future Plans" for song in data)

    def test_update_song(self, client: TestClient, test_db: Session):
        """Test updating a song"""
        # Create user and song
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Original Title", artist="Original Artist", status="Future Plans", user_id=user.id)
        test_db.add(song)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        updates = {
            "title": "Updated Title",
            "artist": "Updated Artist"
        }
        
        response = client.patch(f"/songs/{song.id}", json=updates, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["artist"] == "Updated Artist"

    def test_delete_song(self, client: TestClient, test_db: Session):
        """Test deleting a song"""
        # Create user and song
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="Future Plans", user_id=user.id)
        test_db.add(song)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.delete(f"/songs/{song.id}", headers=headers)
        
        assert response.status_code == 204
        
        # Verify song is deleted
        response = client.get(f"/songs/{song.id}", headers=headers)
        assert response.status_code == 404

    def test_create_songs_batch(self, client: TestClient, test_db: Session):
        """Test creating multiple songs at once"""
        # Create user
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        songs_data = [
            {
                "title": "Song 1",
                "artist": "Artist 1",
                "status": "Future Plans",
                "collaborations": []
            },
            {
                "title": "Song 2",
                "artist": "Artist 2",
                "status": "In Progress",
                "collaborations": []
            }
        ]
        
        response = client.post("/songs/batch", json=songs_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "Song 1"
        assert data[1]["title"] == "Song 2"

class TestAuthoringAPI:
    def test_get_authoring(self, client: TestClient, test_db: Session):
        """Test getting authoring data for a song"""
        # Create user, song, and authoring
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="In Progress", user_id=user.id)
        test_db.add(song)
        test_db.flush()
        
        authoring = Authoring(song_id=song.id)
        test_db.add(authoring)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get(f"/authoring/{song.id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["song_id"] == song.id
        assert data["demucs"] is False
        assert data["drums"] is False

    def test_update_authoring(self, client: TestClient, test_db: Session):
        """Test updating authoring data"""
        # Create user, song, and authoring
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="In Progress", user_id=user.id)
        test_db.add(song)
        test_db.flush()
        
        authoring = Authoring(song_id=song.id)
        test_db.add(authoring)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        updates = {
            "drums": True,
            "bass": True,
            "guitar": True
        }
        
        response = client.put(f"/authoring/{song.id}", json=updates, headers=headers)
        
        assert response.status_code == 200
        
        # Verify updates
        response = client.get(f"/authoring/{song.id}", headers=headers)
        data = response.json()
        assert data["drums"] is True
        assert data["bass"] is True
        assert data["guitar"] is True

    def test_mark_all_authoring_complete(self, client: TestClient, test_db: Session):
        """Test marking all authoring fields as complete"""
        # Create user and song
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="In Progress", user_id=user.id)
        test_db.add(song)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.post(f"/authoring/complete/{song.id}", headers=headers)
        
        assert response.status_code == 200
        
        # Verify all fields are True
        response = client.get(f"/authoring/{song.id}", headers=headers)
        data = response.json()
        assert data["demucs"] is True
        assert data["drums"] is True
        assert data["bass"] is True
        assert data["guitar"] is True
        assert data["vocals"] is True
        assert data["compile"] is True

class TestCollaborationsAPI:
    def test_add_song_collaborator(self, client: TestClient, test_db: Session):
        """Test adding a collaborator to a song"""
        # Create users
        user1 = User(username="user1", email="user1@example.com", hashed_password="hash")
        user2 = User(username="user2", email="user2@example.com", hashed_password="hash")
        test_db.add_all([user1, user2])
        test_db.flush()
        
        # Create song
        song = Song(title="Test Song", artist="Test Artist", status="Future Plans", user_id=user1.id)
        test_db.add(song)
        test_db.commit()
        
        token = create_access_token(data={"sub": user1.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        collab_data = {"user_id": user2.id}
        
        response = client.post(f"/collaborations/songs/{song.id}/collaborate", json=collab_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == user2.id
        assert data["song_id"] == song.id
        assert data["collaboration_type"] == "song_edit"

    def test_add_pack_collaborator(self, client: TestClient, test_db: Session):
        """Test adding a collaborator to a pack"""
        # Create users
        user1 = User(username="user1", email="user1@example.com", hashed_password="hash")
        user2 = User(username="user2", email="user2@example.com", hashed_password="hash")
        test_db.add_all([user1, user2])
        test_db.flush()
        
        # Create pack
        pack = Pack(name="Test Pack", user_id=user1.id)
        test_db.add(pack)
        test_db.commit()
        
        token = create_access_token(data={"sub": user1.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        collab_data = {
            "user_id": user2.id,
            "permissions": ["pack_view", "pack_edit"]
        }
        
        response = client.post(f"/collaborations/packs/{pack.id}/collaborate", json=collab_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2  # Should create 2 collaboration records

    def test_get_song_collaborators(self, client: TestClient, test_db: Session):
        """Test getting collaborators for a song"""
        # Create users
        user1 = User(username="user1", email="user1@example.com", hashed_password="hash")
        user2 = User(username="user2", email="user2@example.com", hashed_password="hash")
        test_db.add_all([user1, user2])
        test_db.flush()
        
        # Create song and collaboration
        song = Song(title="Test Song", artist="Test Artist", status="Future Plans", user_id=user1.id)
        test_db.add(song)
        test_db.flush()
        
        collab = Collaboration(
            song_id=song.id,
            user_id=user2.id,
            collaboration_type=CollaborationType.SONG_EDIT
        )
        test_db.add(collab)
        test_db.commit()
        
        token = create_access_token(data={"sub": user1.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get(f"/collaborations/songs/{song.id}/collaborators", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["user_id"] == user2.id

    def test_get_my_collaborations(self, client: TestClient, test_db: Session):
        """Test getting current user's collaborations"""
        # Create users
        user1 = User(username="user1", email="user1@example.com", hashed_password="hash")
        user2 = User(username="user2", email="user2@example.com", hashed_password="hash")
        test_db.add_all([user1, user2])
        test_db.flush()
        
        # Create song and collaboration
        song = Song(title="Test Song", artist="Test Artist", status="Future Plans", user_id=user1.id)
        test_db.add(song)
        test_db.flush()
        
        collab = Collaboration(
            song_id=song.id,
            user_id=user2.id,
            collaboration_type=CollaborationType.SONG_EDIT
        )
        test_db.add(collab)
        test_db.commit()
        
        token = create_access_token(data={"sub": user2.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/collaborations/my-collaborations", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["song_id"] == song.id

class TestPacksAPI:
    def test_create_pack(self, client: TestClient, test_db: Session):
        """Test creating a pack"""
        # Create user
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        pack_data = {"name": "Test Pack"}
        
        response = client.post("/packs/", json=pack_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Pack"
        assert data["user_id"] == user.id

    def test_get_packs(self, client: TestClient, test_db: Session):
        """Test getting packs for current user"""
        # Create user and packs
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        pack1 = Pack(name="Pack 1", user_id=user.id)
        pack2 = Pack(name="Pack 2", user_id=user.id)
        test_db.add_all([pack1, pack2])
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/packs/", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    def test_update_pack(self, client: TestClient, test_db: Session):
        """Test updating a pack"""
        # Create user and pack
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        pack = Pack(name="Original Name", user_id=user.id)
        test_db.add(pack)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        updates = {"name": "Updated Name"}
        
        response = client.patch(f"/packs/{pack.id}", json=updates, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

class TestAlbumSeriesAPI:
    def test_create_album_series_from_pack(self, client: TestClient, test_db: Session):
        """Test creating an album series from a pack"""
        # Create user and pack
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        pack = Pack(name="Test Pack", user_id=user.id)
        test_db.add(pack)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        series_data = {
            "pack_name": "Test Pack",
            "artist_name": "Test Artist",
            "album_name": "Test Album",
            "year": 2023,
            "description": "Test description"
        }
        
        response = client.post("/album-series/create-from-pack", json=series_data, headers=headers)
        
        assert response.status_code == 200

    def test_get_album_series(self, client: TestClient, test_db: Session):
        """Test getting album series"""
        # Create user, pack, and album series
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        pack = Pack(name="Test Pack", user_id=user.id)
        test_db.add(pack)
        test_db.flush()
        
        album_series = AlbumSeries(
            series_number=1,
            album_name="Test Album",
            artist_name="Test Artist",
            year=2023,
            status="In Progress",
            pack_id=pack.id
        )
        test_db.add(album_series)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/album-series/", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

class TestFileLinksAPI:
    def test_create_file_link(self, client: TestClient, test_db: Session):
        """Test creating a file link"""
        # Create user and song
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="In Progress", user_id=user.id)
        test_db.add(song)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        file_link_data = {
            "file_url": "http://example.com/file.mid",
            "message": "Test file link"
        }
        
        response = client.post(f"/file-links/{song.id}", json=file_link_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["file_url"] == "http://example.com/file.mid"
        assert data["message"] == "Test file link"
        assert data["song_id"] == song.id

    def test_get_file_links(self, client: TestClient, test_db: Session):
        """Test getting file links for a song"""
        # Create user, song, and file link
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="In Progress", user_id=user.id)
        test_db.add(song)
        test_db.flush()
        
        file_link = FileLink(
            song_id=song.id,
            user_id=user.id,
            file_url="http://example.com/file.mid",
            message="Test file link"
        )
        test_db.add(file_link)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get(f"/file-links/{song.id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["file_url"] == "http://example.com/file.mid"

class TestUserSettingsAPI:
    def test_get_user_settings(self, client: TestClient, test_db: Session):
        """Test getting user settings"""
        # Create user with settings
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password="hash",
            display_name="Test User",
            preferred_contact_method="discord",
            discord_username="testuser#1234"
        )
        test_db.add(user)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/user-settings/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    def test_update_user_settings(self, client: TestClient, test_db: Session):
        """Test updating user settings"""
        # Create user
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.commit()
        
        token = create_access_token(data={"sub": user.username})
        headers = {"Authorization": f"Bearer {token}"}
        
        updates = {
            "email": "updated@example.com",
            "preferred_contact_method": "email",
            "discord_username": "updateduser#5678"
        }
        
        response = client.put("/user-settings/me", json=updates, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "updated@example.com"
        assert data["preferred_contact_method"] == "email"
        assert data["discord_username"] == "updateduser#5678"

class TestHealthAndRoot:
    def test_health_check(self, client: TestClient):
        """Test health check endpoint"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "TrackFlow API is running" in data["message"]

    def test_root_endpoint(self, client: TestClient):
        """Test root endpoint"""
        response = client.get("/")
        
        assert response.status_code == 200 