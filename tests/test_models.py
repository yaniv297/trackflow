import pytest
from sqlalchemy.orm import Session
from models import Song, SongCollaboration, AuthoringProgress, Artist, AlbumSeries, SongStatus

class TestSongModel:
    def test_create_song(self, test_db: Session):
        """Test creating a basic song"""
        song = Song(
            title="Test Song",
            artist="Test Artist",
            album="Test Album",
            year=2023,
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        test_db.refresh(song)
        
        assert song.id is not None
        assert song.title == "Test Song"
        assert song.artist == "Test Artist"
        assert song.album == "Test Album"
        assert song.year == 2023
        assert song.status == SongStatus.future
        assert song.author == "yaniv297"

    def test_song_with_artist_obj(self, test_db: Session):
        """Test song with artist object"""
        artist = Artist(name="Test Artist", image_url="http://example.com/image.jpg")
        test_db.add(artist)
        test_db.flush()
        
        song = Song(
            title="Test Song",
            artist="Test Artist",
            artist_obj=artist,
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        test_db.refresh(song)
        
        assert song.artist_obj is not None
        assert song.artist_obj.name == "Test Artist"

    def test_song_status_enum(self, test_db: Session):
        """Test song status enum values"""
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.wip,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.commit()
        
        assert song.status.value == "In Progress"

class TestSongCollaborationModel:
    def test_create_collaboration(self, test_db: Session):
        """Test creating a collaboration"""
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.flush()
        
        collab = SongCollaboration(
            song_id=song.id,
            author="test_author",
            parts="vocals, guitar"
        )
        test_db.add(collab)
        test_db.commit()
        test_db.refresh(collab)
        
        assert collab.id is not None
        assert collab.song_id == song.id
        assert collab.author == "test_author"
        assert collab.parts == "vocals, guitar"

    def test_collaboration_relationship(self, test_db: Session):
        """Test collaboration relationship with song"""
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.flush()
        
        collab = SongCollaboration(
            song_id=song.id,
            author="test_author",
            parts="vocals"
        )
        test_db.add(collab)
        test_db.commit()
        
        # Test relationship
        assert len(song.collaborations) == 1
        assert song.collaborations[0].author == "test_author"

class TestAuthoringProgressModel:
    def test_create_authoring_progress(self, test_db: Session):
        """Test creating authoring progress"""
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
        test_db.refresh(authoring)
        
        assert authoring.id is not None
        assert authoring.song_id == song.id
        assert authoring.demucs is False
        assert authoring.drums is False

    def test_authoring_progress_with_data(self, test_db: Session):
        """Test authoring progress with all fields"""
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
            drums=True,
            vocals=True
        )
        test_db.add(authoring)
        test_db.commit()
        test_db.refresh(authoring)
        
        assert authoring.demucs is True
        assert authoring.drums is True
        assert authoring.vocals is True

class TestArtistModel:
    def test_create_artist(self, test_db: Session):
        """Test creating an artist"""
        artist = Artist(
            name="Test Artist",
            image_url="http://example.com/image.jpg"
        )
        test_db.add(artist)
        test_db.commit()
        test_db.refresh(artist)
        
        assert artist.id is not None
        assert artist.name == "Test Artist"
        assert artist.image_url == "http://example.com/image.jpg"

class TestAlbumSeriesModel:
    def test_create_album_series(self, test_db: Session):
        """Test creating an album series"""
        series = AlbumSeries(
            series_number=1,
            album_name="Test Album",
            artist_name="Test Artist",
            status="active"
        )
        test_db.add(series)
        test_db.commit()
        test_db.refresh(series)
        
        assert series.id is not None
        assert series.series_number == 1
        assert series.album_name == "Test Album"
        assert series.artist_name == "Test Artist"
        assert series.status == "active"

    def test_album_series_with_songs(self, test_db: Session):
        """Test album series with songs"""
        series = AlbumSeries(
            series_number=1,
            album_name="Test Album",
            artist_name="Test Artist",
            status="active"
        )
        test_db.add(series)
        test_db.flush()
        
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297",
            album_series_id=series.id
        )
        test_db.add(song)
        test_db.commit()
        
        assert len(series.songs) == 1
        assert series.songs[0].title == "Test Song" 