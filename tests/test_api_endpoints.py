import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models import Song, SongCollaboration, AuthoringProgress, SongStatus

class TestSongsAPI:
    def test_get_songs_empty(self, client: TestClient):
        """Test getting songs when database is empty"""
        response = client.get("/songs/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_get_songs_with_data(self, client: TestClient, test_db: Session):
        """Test getting songs with data"""
        # Create test songs
        song1 = Song(
            title="Song 1",
            artist="Artist 1",
            status=SongStatus.future,
            author="yaniv297"
        )
        song2 = Song(
            title="Song 2",
            artist="Artist 2", 
            status=SongStatus.wip,
            author="yaniv297"
        )
        test_db.add_all([song1, song2])
        test_db.commit()
        
        response = client.get("/songs/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "Song 1"
        assert data[1]["title"] == "Song 2"

    def test_create_song_basic(self, client: TestClient):
        """Test creating a basic song"""
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist",
            "status": "Future Plans",
            "author": "yaniv297",
            "collaborations": []
        }
        
        response = client.post("/songs/", json=song_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["title"] == "Test Song"
        assert data["artist"] == "Test Artist"
        assert data["status"] == "Future Plans"
        assert data["author"] == "yaniv297"

    def test_create_song_with_collaborations(self, client: TestClient):
        """Test creating a song with collaborations"""
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist",
            "status": "Future Plans",
            "author": "yaniv297",
            "collaborations": [
                {"author": "author1", "parts": ["vocals"]},
                {"author": "author2", "parts": ["guitar", "bass"]}
            ]
        }
        
        response = client.post("/songs/", json=song_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["title"] == "Test Song"
        assert len(data["collaborations"]) == 2
        assert data["collaborations"][0]["author"] == "author1"
        assert data["collaborations"][1]["author"] == "author2"

    def test_create_song_invalid_data(self, client: TestClient):
        """Test creating a song with invalid data"""
        song_data = {
            "title": "",  # Empty title
            "artist": "Test Artist",
            "status": "Future Plans",
            "author": "yaniv297",
            "collaborations": []
        }
        
        response = client.post("/songs/", json=song_data)
        assert response.status_code == 422  # Validation error

    def test_delete_song_success(self, client: TestClient, test_db: Session):
        """Test successful song deletion"""
        # Create a song
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        response = client.delete(f"/songs/{song.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Song deleted successfully"

    def test_delete_song_not_found(self, client: TestClient):
        """Test deleting non-existent song"""
        response = client.delete("/songs/999")
        assert response.status_code == 404

class TestAuthoringAPI:
    def test_get_authoring_not_found(self, client: TestClient):
        """Test getting authoring for non-existent song"""
        response = client.get("/authoring/999")
        assert response.status_code == 404

    def test_get_authoring_success(self, client: TestClient, test_db: Session):
        """Test getting authoring for existing song"""
        # Create song and authoring
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.wip,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.flush()
        
        authoring = AuthoringProgress(
            song_id=song.id,
            demucs=True,
            midi=True
        )
        test_db.add(authoring)
        test_db.commit()
        
        response = client.get(f"/authoring/{song.id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["song_id"] == song.id
        assert data["demucs"] is True
        assert data["midi"] is True

    def test_update_authoring_success(self, client: TestClient, test_db: Session):
        """Test updating authoring progress"""
        # Create song and authoring
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.wip,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.flush()
        
        authoring = AuthoringProgress(song_id=song.id)
        test_db.add(authoring)
        test_db.commit()
        
        update_data = {
            "demucs": True,
            "midi": True
        }
        
        response = client.put(f"/authoring/{song.id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Authoring updated"

    def test_update_authoring_not_found(self, client: TestClient):
        """Test updating authoring for non-existent song"""
        update_data = {"demucs": True}
        response = client.put("/authoring/999", json=update_data)
        assert response.status_code == 404

class TestSpotifyAPI:
    def test_get_spotify_options_not_found(self, client: TestClient):
        """Test getting Spotify options for non-existent song"""
        response = client.get("/spotify/999/spotify-options")
        assert response.status_code == 404

    def test_enhance_song_not_found(self, client: TestClient):
        """Test enhancing non-existent song"""
        enhance_data = {"track_id": "test_track_id"}
        response = client.post("/spotify/999/enhance", json=enhance_data)
        assert response.status_code == 404

    def test_enhance_song_invalid_track_id(self, client: TestClient, test_db: Session):
        """Test enhancing song with invalid track ID"""
        # Create a song
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        enhance_data = {"track_id": "invalid_track_id"}
        response = client.post(f"/spotify/{song.id}/enhance", json=enhance_data)
        # This might fail due to invalid track ID, but should not crash
        assert response.status_code in [400, 404, 500]

class TestStatsAPI:
    def test_get_stats_empty(self, client: TestClient):
        """Test getting stats when database is empty"""
        response = client.get("/stats/")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_songs"] == 0
        assert data["songs_by_status"]["Future Plans"] == 0
        assert data["songs_by_status"]["In Progress"] == 0
        assert data["songs_by_status"]["Released"] == 0

    def test_get_stats_with_data(self, client: TestClient, test_db: Session):
        """Test getting stats with data"""
        # Create songs with different statuses
        songs = [
            Song(title="Song 1", artist="Artist 1", status=SongStatus.future, author="yaniv297"),
            Song(title="Song 2", artist="Artist 2", status=SongStatus.future, author="yaniv297"),
            Song(title="Song 3", artist="Artist 3", status=SongStatus.wip, author="yaniv297"),
            Song(title="Song 4", artist="Artist 4", status=SongStatus.released, author="yaniv297"),
        ]
        test_db.add_all(songs)
        test_db.commit()
        
        response = client.get("/stats/")
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_songs"] == 4
        assert data["songs_by_status"]["Future Plans"] == 2
        assert data["songs_by_status"]["In Progress"] == 1
        assert data["songs_by_status"]["Released"] == 1

class TestAlbumSeriesAPI:
    def test_get_album_series_empty(self, client: TestClient):
        """Test getting album series when database is empty"""
        response = client.get("/album-series/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    def test_get_album_series_with_data(self, client: TestClient, test_db: Session):
        """Test getting album series with data"""
        from models import AlbumSeries
        
        # Create album series
        series1 = AlbumSeries(album_name="Series 1", artist_name="Artist 1", series_number=1, status="active")
        series2 = AlbumSeries(album_name="Series 2", artist_name="Artist 2", series_number=2, status="active")
        test_db.add_all([series1, series2])
        test_db.commit()
        
        response = client.get("/album-series/")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 2
        assert data[0]["album_name"] == "Series 1"
        assert data[1]["album_name"] == "Series 2"

class TestToolsAPI:
    def test_bulk_clean_remaster_tags(self, client: TestClient, test_db: Session):
        """Test bulk cleaning remaster tags"""
        # Create songs with remaster tags
        songs = [
            Song(title="Song (Remastered)", artist="Artist 1", status=SongStatus.future, author="yaniv297"),
            Song(title="Song (Remastered 2023)", artist="Artist 2", status=SongStatus.future, author="yaniv297"),
            Song(title="Song (Remaster)", artist="Artist 3", status=SongStatus.future, author="yaniv297"),
        ]
        test_db.add_all(songs)
        test_db.commit()
        
        song_ids = [song.id for song in songs]
        response = client.post("/tools/bulk-clean", json=song_ids)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 3

    def test_bulk_clean_remaster_tags_no_songs(self, client: TestClient):
        """Test bulk cleaning remaster tags with no songs"""
        response = client.post("/tools/bulk-clean", json=[])
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 0 