import pytest
from sqlalchemy.orm import Session
from models import Song, SongCollaboration, AuthoringProgress, SongStatus
from api.data_access import (
    get_songs, 
    create_song_in_db, 
    get_authoring_by_song_id,
    update_authoring_progress,
    delete_song_from_db
)
from schemas import SongCreate, AuthoringUpdate

class TestDataAccess:
    def test_get_songs_empty(self, test_db: Session):
        """Test getting songs when database is empty"""
        songs = get_songs(test_db)
        assert len(songs) == 0

    def test_get_songs_with_data(self, test_db: Session):
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
        
        songs = get_songs(test_db)
        assert len(songs) == 2
        assert songs[0].title == "Song 1"
        assert songs[1].title == "Song 2"

    def test_create_song_basic(self, test_db: Session):
        """Test creating a basic song"""
        song_data = SongCreate(
            title="Test Song",
            artist="Test Artist",
            status="Future Plans",
            author="yaniv297",
            collaborations=[]
        )
        
        song = create_song_in_db(test_db, song_data)
        
        assert song.id is not None
        assert song.title == "Test Song"
        assert song.artist == "Test Artist"
        assert song.status.value == "Future Plans"
        assert song.author == "yaniv297"

    def test_create_song_with_collaborations(self, test_db: Session):
        """Test creating a song with collaborations"""
        from schemas import SongCollaborationCreate
        
        song_data = SongCreate(
            title="Test Song",
            artist="Test Artist",
            status="Future Plans",
            author="yaniv297",
            collaborations=[
                SongCollaborationCreate(author="author1", parts="vocals"),
                SongCollaborationCreate(author="author2", parts="guitar, bass")
            ]
        )
        
        song = create_song_in_db(test_db, song_data)
        
        assert song.id is not None
        assert len(song.collaborations) == 2
        assert song.collaborations[0].author == "author1"
        assert song.collaborations[0].parts == "vocals"
        assert song.collaborations[1].author == "author2"
        assert song.collaborations[1].parts == "guitar, bass"

    def test_create_song_in_progress_creates_authoring(self, test_db: Session):
        """Test that creating a song with 'In Progress' status creates authoring row"""
        song_data = SongCreate(
            title="Test Song",
            artist="Test Artist",
            status="In Progress",
            author="yaniv297",
            collaborations=[]
        )
        
        song = create_song_in_db(test_db, song_data)
        
        # Check that authoring row was created
        authoring = get_authoring_by_song_id(test_db, song.id)
        assert authoring is not None
        assert authoring.song_id == song.id

    def test_get_authoring_by_song_id(self, test_db: Session):
        """Test getting authoring progress by song ID"""
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
        
        # Test retrieval
        result = get_authoring_by_song_id(test_db, song.id)
        assert result is not None
        assert result.song_id == song.id
        assert result.demucs is True
        assert result.midi is True

    def test_get_authoring_by_song_id_not_found(self, test_db: Session):
        """Test getting authoring progress for non-existent song"""
        result = get_authoring_by_song_id(test_db, 999)
        assert result is None

    def test_update_authoring_progress(self, test_db: Session):
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
        
        # Update authoring
        updates = AuthoringUpdate(
            demucs=True,
            midi=True
        )
        
        result = update_authoring_progress(test_db, song.id, updates)
        
        assert result is not None
        assert result.demucs is True
        assert result.midi is True
        
        # Verify the update actually persisted
        test_db.refresh(result)
        assert result.demucs is True
        assert result.midi is True

    def test_update_authoring_progress_not_found(self, test_db: Session):
        """Test updating authoring progress for non-existent song"""
        updates = AuthoringUpdate(demucs=True)
        result = update_authoring_progress(test_db, 999, updates)
        assert result is None

    def test_delete_song_success(self, test_db: Session):
        """Test successful song deletion"""
        # Create song with collaborations and authoring
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.wip,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.flush()
        
        # Add collaboration
        collab = SongCollaboration(
            song_id=song.id,
            author="test_author",
            parts="vocals"
        )
        test_db.add(collab)
        
        # Add authoring
        authoring = AuthoringProgress(song_id=song.id)
        test_db.add(authoring)
        test_db.commit()
        
        # Delete song
        result = delete_song_from_db(test_db, song.id)
        
        assert result is True
        
        # Verify song is deleted
        deleted_song = test_db.query(Song).filter_by(id=song.id).first()
        assert deleted_song is None
        
        # Verify collaborations are deleted
        deleted_collabs = test_db.query(SongCollaboration).filter_by(song_id=song.id).all()
        assert len(deleted_collabs) == 0
        
        # Verify authoring is deleted
        deleted_authoring = test_db.query(AuthoringProgress).filter_by(song_id=song.id).first()
        assert deleted_authoring is None

    def test_delete_song_not_found(self, test_db: Session):
        """Test deleting non-existent song"""
        result = delete_song_from_db(test_db, 999)
        assert result is False

    def test_delete_song_with_multiple_collaborations(self, test_db: Session):
        """Test deleting song with multiple collaborations"""
        # Create song
        song = Song(
            title="Test Song",
            artist="Test Artist",
            status=SongStatus.future,
            author="yaniv297"
        )
        test_db.add(song)
        test_db.flush()
        
        # Add multiple collaborations
        collabs = [
            SongCollaboration(song_id=song.id, author="author1", parts="vocals"),
            SongCollaboration(song_id=song.id, author="author2", parts="guitar"),
            SongCollaboration(song_id=song.id, author="author3", parts="bass")
        ]
        test_db.add_all(collabs)
        test_db.commit()
        
        # Delete song
        result = delete_song_from_db(test_db, song.id)
        
        assert result is True
        
        # Verify all collaborations are deleted
        remaining_collabs = test_db.query(SongCollaboration).filter_by(song_id=song.id).all()
        assert len(remaining_collabs) == 0 