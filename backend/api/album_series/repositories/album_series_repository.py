"""Album Series repository for data access operations."""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime

from models import (
    AlbumSeries, Song, Collaboration, CollaborationType, SongStatus, 
    User, Pack, AlbumSeriesPreexisting, AlbumSeriesOverride, RockBandDLC
)


class AlbumSeriesRepository:
    """Repository for album series data access operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_all(self) -> List[AlbumSeries]:
        """Get all album series ordered by series number and created_at."""
        return self.db.query(AlbumSeries).order_by(
            AlbumSeries.series_number.nulls_last(),
            AlbumSeries.created_at.desc()
        ).all()
    
    def get_by_id(self, series_id: int) -> Optional[AlbumSeries]:
        """Get album series by ID."""
        return self.db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    
    def get_by_artist_album(self, artist_name: str, album_name: str) -> Optional[AlbumSeries]:
        """Get album series by artist and album name."""
        return self.db.query(AlbumSeries).filter(
            AlbumSeries.artist_name == artist_name,
            AlbumSeries.album_name == album_name
        ).first()
    
    def create(self, **kwargs) -> AlbumSeries:
        """Create a new album series."""
        album_series = AlbumSeries(**kwargs)
        self.db.add(album_series)
        self.db.commit()
        self.db.refresh(album_series)
        return album_series
    
    def update(self, series: AlbumSeries) -> AlbumSeries:
        """Update an existing album series."""
        series.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(series)
        return series
    
    def delete(self, series: AlbumSeries) -> None:
        """Delete an album series."""
        self.db.delete(series)
        self.db.commit()
    
    def get_song_counts_bulk(self, series_ids: List[int]) -> Dict[int, int]:
        """Get song counts for multiple series IDs."""
        song_counts_query = self.db.query(
            Song.album_series_id,
            func.count(Song.id).label('count')
        ).filter(
            Song.album_series_id.in_(series_ids)
        ).group_by(Song.album_series_id).all()
        return {row[0]: row[1] for row in song_counts_query}
    
    def get_user_owned_series(self, series_ids: List[int], user_id: int) -> set:
        """Get series IDs where user owns songs."""
        return set(
            row[0] for row in self.db.query(Song.album_series_id).filter(
                Song.album_series_id.in_(series_ids),
                Song.user_id == user_id
            ).distinct().all()
        )
    
    def get_user_collab_series(self, series_ids: List[int], user_id: int) -> set:
        """Get series IDs where user is collaborator."""
        return set(
            row[0] for row in self.db.query(Song.album_series_id).join(Collaboration).filter(
                Song.album_series_id.in_(series_ids),
                Collaboration.user_id == user_id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            ).distinct().all()
        )
    
    def get_authors_bulk(self, series_ids: List[int]) -> Dict[int, List[str]]:
        """Get authors for multiple series IDs."""
        # Get song authors
        song_authors_query = self.db.query(
            Song.album_series_id,
            User.username
        ).join(User, Song.user_id == User.id).filter(
            Song.album_series_id.in_(series_ids),
            User.username.isnot(None)
        ).distinct().all()
        
        # Get collaboration authors
        collab_authors_query = self.db.query(
            Song.album_series_id,
            User.username
        ).join(Collaboration, Collaboration.song_id == Song.id).join(
            User, Collaboration.user_id == User.id
        ).filter(
            Song.album_series_id.in_(series_ids),
            User.username.isnot(None)
        ).distinct().all()
        
        # Build authors map
        authors_map = {}
        for series_id, username in song_authors_query + collab_authors_query:
            if series_id not in authors_map:
                authors_map[series_id] = set()
            authors_map[series_id].add(username)
        
        # Convert sets to sorted lists
        for series_id in authors_map:
            authors_map[series_id] = sorted(list(authors_map[series_id]))
        
        return authors_map
    
    def get_songs_with_relations(self, series_id: int) -> List[Song]:
        """Get all songs for a series with loaded relations."""
        return self.db.query(Song).options(
            joinedload(Song.collaborations).joinedload(Collaboration.user),
            joinedload(Song.user),
            joinedload(Song.pack_obj),
            joinedload(Song.progress)
        ).filter(
            Song.album_series_id == series_id
        ).all()
    
    def get_next_series_number(self) -> int:
        """Get the next available series number."""
        max_series_number = self.db.query(AlbumSeries.series_number).filter(
            AlbumSeries.series_number.isnot(None)
        ).order_by(AlbumSeries.series_number.desc()).first()
        
        return 1 if max_series_number is None else max_series_number[0] + 1
    
    def get_series_without_cover_art(self) -> List[AlbumSeries]:
        """Get all series that don't have cover art."""
        return self.db.query(AlbumSeries).filter(
            AlbumSeries.cover_image_url.is_(None)
        ).all()


class DLCRepository:
    """Repository for DLC-related data access."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_dlc_status(self, title: str, artist: str) -> bool:
        """Check if a song is already official Rock Band DLC."""
        dlc_entry = self.db.query(RockBandDLC).filter(
            RockBandDLC.title.ilike(title),
            RockBandDLC.artist.ilike(artist)
        ).first()
        return dlc_entry is not None


class PreexistingRepository:
    """Repository for preexisting tracks data access."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_flags_for_series(self, series_id: int) -> List[AlbumSeriesPreexisting]:
        """Get all preexisting flags for a series."""
        return self.db.query(AlbumSeriesPreexisting).filter(
            AlbumSeriesPreexisting.series_id == series_id
        ).all()
    
    def upsert_preexisting(self, series_id: int, spotify_track_id: Optional[str], 
                          title_clean: str, pre_existing: bool) -> AlbumSeriesPreexisting:
        """Create or update preexisting flag."""
        row = None
        if spotify_track_id:
            row = self.db.query(AlbumSeriesPreexisting).filter(
                AlbumSeriesPreexisting.series_id == series_id,
                AlbumSeriesPreexisting.spotify_track_id == spotify_track_id
            ).first()
        
        if not row and title_clean:
            row = self.db.query(AlbumSeriesPreexisting).filter(
                AlbumSeriesPreexisting.series_id == series_id,
                AlbumSeriesPreexisting.title_clean == title_clean
            ).first()
        
        if not row:
            row = AlbumSeriesPreexisting(
                series_id=series_id,
                spotify_track_id=spotify_track_id,
                title_clean=title_clean,
                pre_existing=pre_existing
            )
            self.db.add(row)
        else:
            row.pre_existing = pre_existing
        
        return row
    
    def upsert_irrelevant(self, series_id: int, spotify_track_id: Optional[str], 
                         title_clean: str, irrelevant: bool) -> AlbumSeriesPreexisting:
        """Create or update irrelevant flag."""
        row = None
        if spotify_track_id:
            row = self.db.query(AlbumSeriesPreexisting).filter(
                AlbumSeriesPreexisting.series_id == series_id,
                AlbumSeriesPreexisting.spotify_track_id == spotify_track_id
            ).first()
        
        if not row and title_clean:
            row = self.db.query(AlbumSeriesPreexisting).filter(
                AlbumSeriesPreexisting.series_id == series_id,
                AlbumSeriesPreexisting.title_clean == title_clean
            ).first()
        
        if not row:
            row = AlbumSeriesPreexisting(
                series_id=series_id,
                spotify_track_id=spotify_track_id,
                title_clean=title_clean,
                irrelevant=irrelevant
            )
            self.db.add(row)
        else:
            row.irrelevant = irrelevant
        
        return row


class OverrideRepository:
    """Repository for override tracks data access."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_overrides_for_series(self, series_id: int) -> List[AlbumSeriesOverride]:
        """Get all overrides for a series."""
        return self.db.query(AlbumSeriesOverride).filter(
            AlbumSeriesOverride.series_id == series_id
        ).all()
    
    def upsert_override(self, series_id: int, spotify_track_id: Optional[str], 
                       title_clean: Optional[str], linked_song_id: int) -> AlbumSeriesOverride:
        """Create or update override."""
        row = None
        if spotify_track_id:
            row = self.db.query(AlbumSeriesOverride).filter(
                AlbumSeriesOverride.series_id == series_id,
                AlbumSeriesOverride.spotify_track_id == spotify_track_id
            ).first()
        
        if not row and title_clean and title_clean.strip():
            row = self.db.query(AlbumSeriesOverride).filter(
                AlbumSeriesOverride.series_id == series_id,
                AlbumSeriesOverride.title_clean == title_clean
            ).first()
        
        if not row:
            row = AlbumSeriesOverride(
                series_id=series_id,
                spotify_track_id=spotify_track_id,
                title_clean=title_clean,
                linked_song_id=linked_song_id
            )
            self.db.add(row)
        else:
            row.linked_song_id = linked_song_id
        
        return row
    
    def delete_override(self, series_id: int, spotify_track_id: Optional[str] = None, 
                       title_clean: Optional[str] = None) -> bool:
        """Delete override by spotify_track_id or title_clean."""
        query = self.db.query(AlbumSeriesOverride).filter(
            AlbumSeriesOverride.series_id == series_id
        )
        
        if spotify_track_id:
            query = query.filter(AlbumSeriesOverride.spotify_track_id == spotify_track_id)
        elif title_clean:
            query = query.filter(AlbumSeriesOverride.title_clean == title_clean)
        else:
            return False
        
        row = query.first()
        if not row:
            return False
        
        self.db.delete(row)
        return True


class SongRepository:
    """Repository for song-related operations within album series."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_songs_by_pack_and_status(self, pack_id: int, statuses: List[SongStatus]) -> List[Song]:
        """Get songs by pack ID and status list."""
        return self.db.query(Song).filter(
            Song.pack_id == pack_id,
            Song.status.in_(statuses)
        ).all()
    
    def get_songs_by_series(self, series_id: int) -> List[Song]:
        """Get all songs for a series."""
        return self.db.query(Song).filter(Song.album_series_id == series_id).all()
    
    def get_songs_by_ids(self, song_ids: List[int]) -> List[Song]:
        """Get songs by list of IDs."""
        return self.db.query(Song).filter(Song.id.in_(song_ids)).all()
    
    def get_songs_by_artist(self, artist: str) -> List[Song]:
        """Get all songs by artist (case insensitive)."""
        return self.db.query(Song).filter(Song.artist.ilike(f"%{artist}%")).all()
    
    def check_song_exists_in_series(self, series_id: int, title: str) -> Optional[Song]:
        """Check if song with title exists in series."""
        return self.db.query(Song).filter(
            Song.album_series_id == series_id,
            Song.title.ilike(title)
        ).first()
    
    def create_song(self, **kwargs) -> Song:
        """Create a new song."""
        song = Song(**kwargs)
        self.db.add(song)
        self.db.flush()  # Get ID but don't commit yet
        return song
    
    def update_songs_status(self, songs: List[Song], status: SongStatus) -> None:
        """Update status for multiple songs."""
        from api.achievements.repositories.achievements_repository import AchievementsRepository
        from datetime import datetime
        from collections import defaultdict
        
        achievements_repo = AchievementsRepository()
        
        # Track points and songs per user for aggregated notifications
        user_releases = defaultdict(lambda: {'points': 0, 'song_count': 0})
        
        for song in songs:
            old_status = song.status
            song.status = status
            
            # If releasing a song, set released_at and award points
            if status == SongStatus.released and old_status != SongStatus.released:
                song.released_at = datetime.utcnow()
                
                # Award 10 points for releasing a song (but don't send notification yet)
                try:
                    achievements_repo.update_user_total_points(self.db, song.user_id, 10, commit=False)
                    
                    # Track for aggregated notification
                    user_releases[song.user_id]['points'] += 10
                    user_releases[song.user_id]['song_count'] += 1
                except Exception as e:
                    print(f"⚠️ Failed to award release points: {e}")
        
        # Send aggregated notifications for each user
        if user_releases:
            try:
                from api.notifications.services.notification_service import NotificationService
                notification_service = NotificationService(self.db)
                
                for release_user_id, release_info in user_releases.items():
                    points = release_info['points']
                    song_count = release_info['song_count']
                    
                    if song_count == 1:
                        message = f"You earned {points} points for releasing 1 song"
                    else:
                        message = f"You earned {points} points for releasing {song_count} songs"
                    
                    notification_service.create_general_notification(
                        user_id=release_user_id,
                        title="🎉 Album Series Released!",
                        message=message
                    )
                    print(f"✅ Sent aggregated notification to user {release_user_id}: {message}")
            except Exception as e:
                print(f"⚠️ Failed to create aggregated album series release notification: {e}")
    
    def get_user_songs_in_series(self, series_id: int, user_id: int) -> List[Song]:
        """Get user's songs in a specific series."""
        return self.db.query(Song).filter(
            Song.album_series_id == series_id,
            Song.user_id == user_id
        ).all()


class PackRepository:
    """Repository for pack-related operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_name(self, pack_name: str) -> Optional[Pack]:
        """Get pack by name."""
        return self.db.query(Pack).filter(Pack.name == pack_name).first()
    
    def get_by_id(self, pack_id: int) -> Optional[Pack]:
        """Get pack by ID."""
        return self.db.query(Pack).filter(Pack.id == pack_id).first()


class UserRepository:
    """Repository for user-related operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()