import pytest
from pydantic import ValidationError
from schemas import (
    SongCreate, SongOut, SongCollaborationCreate, SongCollaborationOut,
    AuthoringUpdate, AuthoringOut, EnhanceRequest, AlbumSeriesResponse, AlbumSeriesDetailResponse
)

class TestSongCreate:
    def test_valid_song_create(self):
        """Test creating a valid song"""
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist",
            "status": "Future Plans",
            "author": "yaniv297",
            "collaborations": []
        }
        
        song = SongCreate(**song_data)
        assert song.title == "Test Song"
        assert song.artist == "Test Artist"
        assert song.status == "Future Plans"
        assert song.author == "yaniv297"
        assert len(song.collaborations) == 0

    def test_song_create_with_collaborations(self):
        """Test creating a song with collaborations"""
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist",
            "status": "Future Plans",
            "author": "yaniv297",
            "collaborations": [
                {"author": "author1", "parts": "vocals"},
                {"author": "author2", "parts": "guitar, bass"}
            ]
        }
        
        song = SongCreate(**song_data)
        assert len(song.collaborations) == 2
        assert song.collaborations[0].author == "author1"
        assert song.collaborations[0].parts == "vocals"
        assert song.collaborations[1].author == "author2"
        assert song.collaborations[1].parts == "guitar, bass"

    def test_song_create_invalid_status(self):
        """Test creating a song with invalid status"""
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist",
            "status": "Invalid Status",
            "author": "yaniv297",
            "collaborations": []
        }
        
        with pytest.raises(ValidationError):
            SongCreate(**song_data)

    def test_song_create_empty_title(self):
        """Test creating a song with empty title"""
        song_data = {
            "title": "",
            "artist": "Test Artist",
            "status": "Future Plans",
            "author": "yaniv297",
            "collaborations": []
        }
        
        # Empty title should be allowed by the schema
        song = SongCreate(**song_data)
        assert song.title == ""

    def test_song_create_missing_required_fields(self):
        """Test creating a song with missing required fields"""
        song_data = {
            "title": "Test Song",
            "artist": "Test Artist"
            # Missing status, author, collaborations
        }
        
        with pytest.raises(ValidationError):
            SongCreate(**song_data)

class TestSongOut:
    def test_song_out_creation(self):
        """Test creating a song output object"""
        song_data = {
            "id": 1,
            "title": "Test Song",
            "artist": "Test Artist",
            "album": "Test Album",
            "year": 2023,
            "status": "Future Plans",
            "author": "yaniv297",
            "album_cover": "http://example.com/cover.jpg",
            "collaborations": [],
            "pack": None,
            "authoring": None,
            "optional": None
        }
        
        song = SongOut(**song_data)
        assert song.id == 1
        assert song.title == "Test Song"
        assert song.artist == "Test Artist"
        assert song.album == "Test Album"
        assert song.year == 2023
        assert song.status == "Future Plans"
        assert song.author == "yaniv297"
        assert song.album_cover == "http://example.com/cover.jpg"

class TestSongCollaborationCreate:
    def test_valid_collaboration_create(self):
        """Test creating a valid collaboration"""
        collab_data = {
            "author": "test_author",
            "parts": "vocals, guitar"
        }
        
        collab = SongCollaborationCreate(**collab_data)
        assert collab.author == "test_author"
        assert collab.parts == "vocals, guitar"

    def test_collaboration_create_no_parts(self):
        """Test creating a collaboration without parts"""
        collab_data = {
            "author": "test_author"
        }
        
        collab = SongCollaborationCreate(**collab_data)
        assert collab.author == "test_author"
        assert collab.parts is None

    def test_collaboration_create_missing_author(self):
        """Test creating a collaboration with missing author"""
        collab_data = {
            "parts": "vocals"
        }
        
        with pytest.raises(ValidationError):
            SongCollaborationCreate(**collab_data)

class TestSongCollaborationOut:
    def test_collaboration_out_creation(self):
        """Test creating a collaboration output object"""
        from datetime import datetime
        
        collab_data = {
            "id": 1,
            "author": "test_author",
            "parts": "vocals, guitar",
            "created_at": datetime.now()
        }
        
        collab = SongCollaborationOut(**collab_data)
        assert collab.id == 1
        assert collab.author == "test_author"
        assert collab.parts == "vocals, guitar"

class TestAuthoringUpdate:
    def test_valid_authoring_update(self):
        """Test creating a valid authoring update"""
        update_data = {
            "demucs": True,
            "tempo_map": False,
            "drums": True
        }
        
        update = AuthoringUpdate(**update_data)
        assert update.demucs is True
        assert update.tempo_map is False
        assert update.drums is True
        assert update.vocals is None

    def test_authoring_update_partial(self):
        """Test creating a partial authoring update"""
        update_data = {
            "bass": True
            # Missing other fields
        }
        
        update = AuthoringUpdate(**update_data)
        assert update.bass is True
        assert update.guitar is None

    def test_authoring_update_empty(self):
        """Test creating an empty authoring update"""
        update_data = {}
        
        update = AuthoringUpdate(**update_data)
        assert update.demucs is None
        assert update.tempo_map is None

class TestAuthoringOut:
    def test_authoring_out_creation(self):
        """Test creating an authoring output object"""
        authoring_data = {
            "id": 1,
            "song_id": 1,
            "demucs": True,
            "midi": False,
            "tempo_map": True,
            "fake_ending": False,
            "drums": True,
            "bass": False,
            "guitar": True,
            "vocals": False,
            "harmonies": True,
            "pro_keys": False,
            "keys": True,
            "animations": False,
            "drum_fills": True,
            "overdrive": False,
            "compile": True
        }
        
        authoring = AuthoringOut(**authoring_data)
        assert authoring.id == 1
        assert authoring.song_id == 1
        assert authoring.demucs is True
        assert authoring.midi is False
        assert authoring.drums is True
        assert authoring.bass is False

class TestEnhanceRequest:
    def test_valid_enhance_request(self):
        """Test creating a valid enhance request"""
        request_data = {
            "track_id": "test_track_id"
        }
        
        request = EnhanceRequest(**request_data)
        assert request.track_id == "test_track_id"

    def test_enhance_request_empty_track_id(self):
        """Test creating an enhance request with empty track ID"""
        request_data = {
            "track_id": ""
        }
        
        # Empty track_id should be allowed by the schema
        request = EnhanceRequest(**request_data)
        assert request.track_id == ""

    def test_enhance_request_missing_track_id(self):
        """Test creating an enhance request with missing track ID"""
        request_data = {}
        
        with pytest.raises(ValidationError):
            EnhanceRequest(**request_data)

class TestAlbumSeriesResponse:
    def test_album_series_response_creation(self):
        """Test creating an album series response object"""
        from datetime import datetime
        
        series_data = {
            "id": 1,
            "series_number": 1,
            "album_name": "Test Album",
            "artist_name": "Test Artist",
            "year": 2023,
            "status": "active",
            "description": "Test description",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "song_count": 5,
            "authors": ["yaniv297", "other_author"]
        }
        
        series = AlbumSeriesResponse(**series_data)
        assert series.id == 1
        assert series.series_number == 1
        assert series.album_name == "Test Album"
        assert series.artist_name == "Test Artist"
        assert series.year == 2023
        assert series.status == "active"
        assert series.song_count == 5
        assert len(series.authors) == 2

class TestAlbumSeriesDetailResponse:
    def test_album_series_detail_response_creation(self):
        """Test creating an album series detail response object"""
        from datetime import datetime
        
        series_data = {
            "id": 1,
            "series_number": 1,
            "album_name": "Test Album",
            "artist_name": "Test Artist",
            "year": 2023,
            "cover_image_url": "http://example.com/cover.jpg",
            "status": "active",
            "description": "Test description",
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "album_songs": [],
            "bonus_songs": [],
            "total_songs": 0,
            "authors": ["yaniv297"]
        }
        
        series = AlbumSeriesDetailResponse(**series_data)
        assert series.id == 1
        assert series.series_number == 1
        assert series.album_name == "Test Album"
        assert series.artist_name == "Test Artist"
        assert series.year == 2023
        assert series.cover_image_url == "http://example.com/cover.jpg"
        assert series.status == "active"
        assert series.total_songs == 0
        assert len(series.authors) == 1 