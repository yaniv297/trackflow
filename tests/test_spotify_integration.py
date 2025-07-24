import pytest
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session
from models import Song, Artist, SongStatus
from api.spotify import auto_enhance_song, enhance_song_with_track_data

class TestSpotifyIntegration:
    @patch('api.spotify.Spotify')
    def test_auto_enhance_song_success(self, mock_spotify, test_db: Session):
        """Test successful auto-enhancement of a song"""
        # Create a test song
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        # Mock Spotify responses
        mock_sp = Mock()
        mock_spotify.return_value = mock_sp
        
        # Mock search response
        mock_sp.search.side_effect = [
            {
                "tracks": {
                    "items": [{
                        "id": "test_track_id",
                        "name": "Test Song",
                        "artists": [{"name": "Test Artist"}],
                        "album": {
                            "name": "Test Album",
                            "images": [{"url": "http://example.com/cover.jpg"}],
                            "release_date": "2023-01-01"
                        }
                    }]
                }
            },
            {
                "artists": {
                    "items": [{
                        "name": "Test Artist",
                        "images": [{"url": "http://example.com/artist.jpg"}]
                    }]
                }
            }
        ]
        
        # Mock track response
        mock_sp.track.return_value = {
            "id": "test_track_id",
            "name": "Test Song",
            "artists": [{"name": "Test Artist"}],
            "album": {
                "name": "Test Album",
                "images": [{"url": "http://example.com/cover.jpg"}],
                "release_date": "2023-01-01"
            }
        }
        
        # Test auto-enhancement
        result = auto_enhance_song(song.id, test_db)
        
        assert result is True
        
        # Verify song was enhanced
        test_db.refresh(song)
        assert song.album == "Test Album"
        assert song.album_cover == "http://example.com/cover.jpg"
        assert song.year == 2023

    @patch('api.spotify.Spotify')
    def test_auto_enhance_song_no_match(self, mock_spotify, test_db: Session):
        """Test auto-enhancement when no Spotify match is found"""
        # Create a test song
        song = Song(
            title="Unknown Song",
            artist="Unknown Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        # Mock Spotify responses
        mock_sp = Mock()
        mock_spotify.return_value = mock_sp
        
        # Mock empty search response
        mock_sp.search.return_value = {
            "tracks": {
                "items": []
            }
        }
        
        # Test auto-enhancement
        result = auto_enhance_song(song.id, test_db)
        
        assert result is False
        
        # Verify song was not changed
        test_db.refresh(song)
        assert song.album is None
        assert song.album_cover is None
        assert song.year is None

    def test_auto_enhance_song_no_credentials(self, test_db: Session):
        """Test auto-enhancement when Spotify credentials are not available"""
        # Temporarily remove credentials
        import os
        original_id = os.environ.get("SPOTIFY_CLIENT_ID")
        original_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
        
        # Clear credentials
        os.environ["SPOTIFY_CLIENT_ID"] = ""
        os.environ["SPOTIFY_CLIENT_SECRET"] = ""
        
        # Create a test song
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        # Test auto-enhancement
        result = auto_enhance_song(song.id, test_db)
        
        assert result is False
        
        # Restore credentials
        if original_id:
            os.environ["SPOTIFY_CLIENT_ID"] = original_id
        if original_secret:
            os.environ["SPOTIFY_CLIENT_SECRET"] = original_secret

    @patch('api.spotify.Spotify')
    def test_enhance_song_with_track_data(self, mock_spotify, test_db: Session):
        """Test enhancing a song with specific track data"""
        # Create a test song
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        # Mock Spotify responses
        mock_sp = Mock()
        mock_spotify.return_value = mock_sp
        
        # Mock track response
        mock_sp.track.return_value = {
            "id": "test_track_id",
            "name": "Test Song",
            "artists": [{"name": "Test Artist"}],
            "album": {
                "name": "Test Album",
                "images": [{"url": "http://example.com/cover.jpg"}],
                "release_date": "2023-01-01"
            }
        }
        
        # Mock artist search response
        mock_sp.search.return_value = {
            "artists": {
                "items": [{
                    "name": "Test Artist",
                    "images": [{"url": "http://example.com/artist.jpg"}]
                }]
            }
        }
        
        # Test enhancement
        result = enhance_song_with_track_data(song.id, "test_track_id", test_db)
        
        assert result is not None
        assert result.album == "Test Album"
        assert result.album_cover == "http://example.com/cover.jpg"
        assert result.year == 2023

    @patch('api.spotify.Spotify')
    def test_enhance_song_creates_artist(self, mock_spotify, test_db: Session):
        """Test that enhancement creates artist if it doesn't exist"""
        # Create a test song
        song = Song(
            title="Test Song",
            artist="New Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        # Mock Spotify responses
        mock_sp = Mock()
        mock_spotify.return_value = mock_sp
        
        # Mock track response
        mock_sp.track.return_value = {
            "id": "test_track_id",
            "name": "Test Song",
            "artists": [{"name": "New Artist"}],
            "album": {
                "name": "Test Album",
                "images": [{"url": "http://example.com/cover.jpg"}],
                "release_date": "2023-01-01"
            }
        }
        
        # Mock artist search response
        mock_sp.search.return_value = {
            "artists": {
                "items": [{
                    "name": "New Artist",
                    "images": [{"url": "http://example.com/artist.jpg"}]
                }]
            }
        }
        
        # Test enhancement
        result = enhance_song_with_track_data(song.id, "test_track_id", test_db)
        
        # Verify artist was created
        artist = test_db.query(Artist).filter_by(name="New Artist").first()
        assert artist is not None
        assert artist.image_url == "http://example.com/artist.jpg"
        assert result.artist_obj == artist

    @patch('api.spotify.Spotify')
    def test_enhance_song_uses_existing_artist(self, mock_spotify, test_db: Session):
        """Test that enhancement uses existing artist if it exists"""
        # Create an existing artist
        artist = Artist(name="Existing Artist", image_url="http://example.com/existing.jpg")
        test_db.add(artist)
        test_db.flush()
        
        # Create a test song
        song = Song(
            title="Test Song",
            artist="Existing Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        # Mock Spotify responses
        mock_sp = Mock()
        mock_spotify.return_value = mock_sp
        
        # Mock track response
        mock_sp.track.return_value = {
            "id": "test_track_id",
            "name": "Test Song",
            "artists": [{"name": "Existing Artist"}],
            "album": {
                "name": "Test Album",
                "images": [{"url": "http://example.com/cover.jpg"}],
                "release_date": "2023-01-01"
            }
        }
        
        # Test enhancement
        result = enhance_song_with_track_data(song.id, "test_track_id", test_db)
        
        # Verify existing artist was used
        assert result.artist_obj == artist
        assert result.artist_obj.image_url == "http://example.com/existing.jpg"

    def test_auto_enhance_song_not_found(self, test_db: Session):
        """Test auto-enhancement for non-existent song"""
        result = auto_enhance_song(999, test_db)
        assert result is False

    @patch('api.spotify.Spotify')
    def test_auto_enhance_song_spotify_error(self, mock_spotify, test_db: Session):
        """Test auto-enhancement when Spotify API fails"""
        # Create a test song
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        # Mock Spotify to raise an exception
        mock_sp = Mock()
        mock_spotify.return_value = mock_sp
        mock_sp.search.side_effect = Exception("Spotify API error")
        
        # Test auto-enhancement
        result = auto_enhance_song(song.id, test_db)
        
        assert result is False
        
        # Verify song was not changed
        test_db.refresh(song)
        assert song.album is None
        assert song.album_cover is None
        assert song.year is None 