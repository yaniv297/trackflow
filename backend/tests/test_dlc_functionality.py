import pytest
from sqlalchemy.orm import Session
from models import RockBandDLC, AlbumSeries, AlbumSeriesPreexisting, User
from api.album_series import check_and_cache_dlc_status
from api.tools import clean_string


class TestDLCFunctionality:
    """Test DLC checking and caching functionality"""

    def test_check_and_cache_dlc_status_new_entry(self, test_db: Session):
        """Test checking DLC status for a new entry"""
        # Create test user and album series
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.commit()
        
        album_series = AlbumSeries(
            artist_name="Test Artist",
            album_name="Test Album",
            status="planned"
        )
        test_db.add(album_series)
        test_db.commit()
        
        # Add a DLC entry to the database
        dlc_entry = RockBandDLC(
            title="Test Song",
            artist="Test Artist",
            origin="DLC"
        )
        test_db.add(dlc_entry)
        test_db.commit()
        
        # Test DLC checking
        is_dlc = check_and_cache_dlc_status(
            db=test_db,
            title="Test Song",
            artist="Test Artist",
            series_id=album_series.id,
            title_clean=clean_string("Test Song")
        )
        
        assert is_dlc is True
        
        # Check that result was cached
        cached_entry = test_db.query(AlbumSeriesPreexisting).filter(
            AlbumSeriesPreexisting.series_id == album_series.id,
            AlbumSeriesPreexisting.title_clean == clean_string("Test Song")
        ).first()
        
        assert cached_entry is not None
        assert cached_entry.pre_existing is True

    def test_check_and_cache_dlc_status_non_dlc(self, test_db: Session):
        """Test checking DLC status for a non-DLC song"""
        # Create test user and album series
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.commit()
        
        album_series = AlbumSeries(
            artist_name="Test Artist",
            album_name="Test Album",
            status="planned"
        )
        test_db.add(album_series)
        test_db.commit()
        
        # Test DLC checking for non-DLC song
        is_dlc = check_and_cache_dlc_status(
            db=test_db,
            title="Non-DLC Song",
            artist="Test Artist",
            series_id=album_series.id,
            title_clean=clean_string("Non-DLC Song")
        )
        
        assert is_dlc is False
        
        # Check that result was cached
        cached_entry = test_db.query(AlbumSeriesPreexisting).filter(
            AlbumSeriesPreexisting.series_id == album_series.id,
            AlbumSeriesPreexisting.title_clean == clean_string("Non-DLC Song")
        ).first()
        
        assert cached_entry is not None
        assert cached_entry.pre_existing is False

    def test_check_and_cache_dlc_status_case_insensitive(self, test_db: Session):
        """Test that DLC checking is case insensitive"""
        # Create test user and album series
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.commit()
        
        album_series = AlbumSeries(
            artist_name="Test Artist",
            album_name="Test Album",
            status="planned"
        )
        test_db.add(album_series)
        test_db.commit()
        
        # Add a DLC entry with lowercase
        dlc_entry = RockBandDLC(
            title="test song",
            artist="test artist",
            origin="DLC"
        )
        test_db.add(dlc_entry)
        test_db.commit()
        
        # Test DLC checking with different case
        is_dlc = check_and_cache_dlc_status(
            db=test_db,
            title="TEST SONG",
            artist="TEST ARTIST",
            series_id=album_series.id,
            title_clean=clean_string("TEST SONG")
        )
        
        assert is_dlc is True

    def test_check_and_cache_dlc_status_cached_result(self, test_db: Session):
        """Test that cached results are returned without re-checking"""
        # Create test user and album series
        user = User(username="testuser", email="test@example.com", hashed_password="hash")
        test_db.add(user)
        test_db.commit()
        
        album_series = AlbumSeries(
            artist_name="Test Artist",
            album_name="Test Album",
            status="planned"
        )
        test_db.add(album_series)
        test_db.commit()
        
        # Pre-cache a result
        cached_entry = AlbumSeriesPreexisting(
            series_id=album_series.id,
            title_clean=clean_string("Cached Song"),
            pre_existing=True
        )
        test_db.add(cached_entry)
        test_db.commit()
        
        # Test that cached result is returned
        is_dlc = check_and_cache_dlc_status(
            db=test_db,
            title="Cached Song",
            artist="Test Artist",
            series_id=album_series.id,
            title_clean=clean_string("Cached Song")
        )
        
        assert is_dlc is True
        
        # Verify no new cache entry was created
        cache_entries = test_db.query(AlbumSeriesPreexisting).filter(
            AlbumSeriesPreexisting.series_id == album_series.id,
            AlbumSeriesPreexisting.title_clean == clean_string("Cached Song")
        ).all()
        
        assert len(cache_entries) == 1  # Only the original cached entry 