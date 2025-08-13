import pytest
from sqlalchemy.orm import Session
from models import (
    User, Song, Pack, Collaboration, CollaborationType, Authoring, 
    Artist, AlbumSeries, WipCollaboration, FileLink, SongStatus
)
from datetime import datetime

class TestUserModel:
    def test_create_user(self, test_db: Session):
        """Test creating a basic user"""
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password="hashed_password_123"
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        
        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"
        assert user.hashed_password == "hashed_password_123"
        assert user.is_active is True
        assert user.created_at is not None

    def test_user_with_settings(self, test_db: Session):
        """Test user with display name and contact settings"""
        user = User(
            username="testuser",
            email="test@example.com",
            hashed_password="hashed_password_123",
            display_name="Test User",
            preferred_contact_method="discord",
            discord_username="testuser#1234"
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        
        assert user.display_name == "Test User"
        assert user.preferred_contact_method == "discord"
        assert user.discord_username == "testuser#1234"

class TestSongModel:
    def test_create_song(self, test_db: Session):
        """Test creating a basic song"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(
            title="Test Song",
            artist="Test Artist",
            album="Test Album",
            year=2023,
            status="Future Plans",
            user_id=user.id
        )
        test_db.add(song)
        test_db.commit()
        test_db.refresh(song)
        
        assert song.id is not None
        assert song.title == "Test Song"
        assert song.artist == "Test Artist"
        assert song.album == "Test Album"
        assert song.year == 2023
        assert song.status == "Future Plans"
        assert song.user_id == user.id

    def test_song_with_artist_obj(self, test_db: Session):
        """Test song with artist object"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        artist = Artist(name="Test Artist", image_url="http://example.com/image.jpg", user_id=user.id)
        test_db.add(artist)
        test_db.flush()
        
        song = Song(
            title="Test Song",
            artist="Test Artist",
            artist_id=artist.id,
            status="Future Plans",
            user_id=user.id
        )
        test_db.add(song)
        test_db.commit()
        test_db.refresh(song)
        
        assert song.artist_obj is not None
        assert song.artist_obj.name == "Test Artist"

    def test_song_relationships(self, test_db: Session):
        """Test song relationships with user, pack, and authoring"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        pack = Pack(name="Test Pack", user_id=user.id)
        test_db.add(pack)
        test_db.flush()
        
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status="In Progress",
            user_id=user.id,
            pack_id=pack.id
        )
        test_db.add(song)
        test_db.commit()
        test_db.refresh(song)
        
        # Test relationships
        assert song.user.username == "testuser"
        assert song.pack_obj.name == "Test Pack"

class TestPackModel:
    def test_create_pack(self, test_db: Session):
        """Test creating a basic pack"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        pack = Pack(name="Test Pack", user_id=user.id)
        test_db.add(pack)
        test_db.commit()
        test_db.refresh(pack)
        
        assert pack.id is not None
        assert pack.name == "Test Pack"
        assert pack.user_id == user.id
        assert pack.created_at is not None
        assert pack.updated_at is not None

    def test_pack_with_album_series(self, test_db: Session):
        """Test pack with album series"""
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
            pack_id=pack.id
        )
        test_db.add(album_series)
        test_db.flush()
        
        pack.album_series_id = album_series.id
        test_db.commit()
        test_db.refresh(pack)
        
        assert pack.album_series is not None
        assert pack.album_series.album_name == "Test Album"

class TestCollaborationModel:
    def test_create_song_collaboration(self, test_db: Session):
        """Test creating a song collaboration"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="Future Plans", user_id=user.id)
        test_db.add(song)
        test_db.flush()
        
        collab = Collaboration(
            song_id=song.id,
            user_id=user.id,
            collaboration_type=CollaborationType.SONG_EDIT
        )
        test_db.add(collab)
        test_db.commit()
        test_db.refresh(collab)
        
        assert collab.id is not None
        assert collab.song_id == song.id
        assert collab.user_id == user.id
        assert collab.collaboration_type == CollaborationType.SONG_EDIT

    def test_create_pack_collaboration(self, test_db: Session):
        """Test creating a pack collaboration"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        pack = Pack(name="Test Pack", user_id=user.id)
        test_db.add(pack)
        test_db.flush()
        
        collab = Collaboration(
            pack_id=pack.id,
            user_id=user.id,
            collaboration_type=CollaborationType.PACK_VIEW
        )
        test_db.add(collab)
        test_db.commit()
        test_db.refresh(collab)
        
        assert collab.id is not None
        assert collab.pack_id == pack.id
        assert collab.user_id == user.id
        assert collab.collaboration_type == CollaborationType.PACK_VIEW

class TestAuthoringModel:
    def test_create_authoring(self, test_db: Session):
        """Test creating authoring record"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="In Progress", user_id=user.id)
        test_db.add(song)
        test_db.flush()
        
        authoring = Authoring(song_id=song.id)
        test_db.add(authoring)
        test_db.commit()
        test_db.refresh(authoring)
        
        assert authoring.id is not None
        assert authoring.song_id == song.id
        assert authoring.demucs is False
        assert authoring.midi is False
        assert authoring.tempo_map is False
        assert authoring.fake_ending is False
        assert authoring.drums is False
        assert authoring.bass is False
        assert authoring.guitar is False
        assert authoring.vocals is False
        assert authoring.harmonies is False
        assert authoring.pro_keys is False
        assert authoring.keys is False
        assert authoring.animations is False
        assert authoring.drum_fills is False
        assert authoring.overdrive is False
        assert authoring.compile is False

    def test_authoring_relationships(self, test_db: Session):
        """Test authoring relationship with song"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="In Progress", user_id=user.id)
        test_db.add(song)
        test_db.flush()
        
        authoring = Authoring(song_id=song.id)
        test_db.add(authoring)
        test_db.commit()
        test_db.refresh(authoring)
        
        assert authoring.song.title == "Test Song"
        assert song.authoring is not None

class TestArtistModel:
    def test_create_artist(self, test_db: Session):
        """Test creating an artist"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        artist = Artist(
            name="Test Artist",
            image_url="http://example.com/image.jpg",
            user_id=user.id
        )
        test_db.add(artist)
        test_db.commit()
        test_db.refresh(artist)
        
        assert artist.id is not None
        assert artist.name == "Test Artist"
        assert artist.image_url == "http://example.com/image.jpg"
        assert artist.user_id == user.id

class TestAlbumSeriesModel:
    def test_create_album_series(self, test_db: Session):
        """Test creating an album series"""
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
            description="Test description",
            pack_id=pack.id
        )
        test_db.add(album_series)
        test_db.commit()
        test_db.refresh(album_series)
        
        assert album_series.id is not None
        assert album_series.series_number == 1
        assert album_series.album_name == "Test Album"
        assert album_series.artist_name == "Test Artist"
        assert album_series.year == 2023
        assert album_series.status == "In Progress"
        assert album_series.description == "Test description"
        assert album_series.pack_id == pack.id

class TestWipCollaborationModel:
    def test_create_wip_collaboration(self, test_db: Session):
        """Test creating a WIP collaboration"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song = Song(title="Test Song", artist="Test Artist", status="In Progress", user_id=user.id)
        test_db.add(song)
        test_db.flush()
        
        wip_collab = WipCollaboration(
            song_id=song.id,
            collaborator="test_collaborator",
            field="drums"
        )
        test_db.add(wip_collab)
        test_db.commit()
        test_db.refresh(wip_collab)
        
        assert wip_collab.id is not None
        assert wip_collab.song_id == song.id
        assert wip_collab.collaborator == "test_collaborator"
        assert wip_collab.field == "drums"

class TestFileLinkModel:
    def test_create_file_link(self, test_db: Session):
        """Test creating a file link"""
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
        test_db.refresh(file_link)
        
        assert file_link.id is not None
        assert file_link.song_id == song.id
        assert file_link.user_id == user.id
        assert file_link.file_url == "http://example.com/file.mid"
        assert file_link.message == "Test file link"
        assert file_link.created_at is not None

    def test_file_link_relationships(self, test_db: Session):
        """Test file link relationships"""
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
        test_db.refresh(file_link)
        
        assert file_link.song.title == "Test Song"
        assert file_link.user.username == "testuser"

class TestModelRelationships:
    def test_user_song_relationship(self, test_db: Session):
        """Test user-song relationship"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        song1 = Song(title="Song 1", artist="Artist 1", status="Future Plans", user_id=user.id)
        song2 = Song(title="Song 2", artist="Artist 2", status="Future Plans", user_id=user.id)
        test_db.add_all([song1, song2])
        test_db.commit()
        test_db.refresh(user)
        
        assert len(user.songs) == 2
        assert user.songs[0].title == "Song 1"
        assert user.songs[1].title == "Song 2"

    def test_pack_song_relationship(self, test_db: Session):
        """Test pack-song relationship"""
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.flush()
        
        pack = Pack(name="Test Pack", user_id=user.id)
        test_db.add(pack)
        test_db.flush()
        
        song1 = Song(title="Song 1", artist="Artist 1", status="Future Plans", user_id=user.id, pack_id=pack.id)
        song2 = Song(title="Song 2", artist="Artist 2", status="Future Plans", user_id=user.id, pack_id=pack.id)
        test_db.add_all([song1, song2])
        test_db.commit()
        test_db.refresh(pack)
        
        assert len(pack.songs) == 2
        assert pack.songs[0].title == "Song 1"
        assert pack.songs[1].title == "Song 2"

    def test_song_collaboration_relationship(self, test_db: Session):
        """Test song-collaboration relationship"""
        user1 = User(username="user1", email="user1@example.com", hashed_password="hash")
        user2 = User(username="user2", email="user2@example.com", hashed_password="hash")
        test_db.add_all([user1, user2])
        test_db.flush()
        
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
        test_db.refresh(song)
        
        assert len(song.collaborations) == 1
        assert song.collaborations[0].user.username == "user2"
        assert song.collaborations[0].collaboration_type == CollaborationType.SONG_EDIT 