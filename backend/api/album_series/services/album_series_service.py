"""Album Series service layer for business logic."""

import os
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials

from models import AlbumSeries, Song, SongStatus, User
from schemas import AlbumSeriesResponse, AlbumSeriesDetailResponse, CreateAlbumSeriesRequest
from ..repositories.album_series_repository import (
    AlbumSeriesRepository, DLCRepository, PreexistingRepository, 
    OverrideRepository, SongRepository, PackRepository, UserRepository
)
from ..validators.album_series_validators import (
    TracklistItem, AlbumSeriesValidator
)
from api.tools import clean_string, normalize_title, titles_similar

# Spotify credentials
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")


class AlbumSeriesService:
    """Service for album series business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.album_series_repo = AlbumSeriesRepository(db)
        self.song_repo = SongRepository(db)
        self.pack_repo = PackRepository(db)
        self.user_repo = UserRepository(db)
    
    def get_all_album_series(self, current_user: User) -> List[AlbumSeriesResponse]:
        """Get all album series with song count and authors."""
        # Get all series
        all_series = self.album_series_repo.get_all()
        if not all_series:
            return []
        
        series_ids = [s.id for s in all_series]
        
        # Bulk fetch data
        song_count_map = self.album_series_repo.get_song_counts_bulk(series_ids)
        user_owned_series = self.album_series_repo.get_user_owned_series(series_ids, current_user.id)
        user_collab_series = self.album_series_repo.get_user_collab_series(series_ids, current_user.id)
        authors_map = self.album_series_repo.get_authors_bulk(series_ids)
        
        # Filter series based on user involvement
        filtered_series = []
        for s in all_series:
            # Always include released series
            if s.status == "released":
                filtered_series.append(s)
                continue
            
            # For in_progress and planned series, check if user is involved
            user_involved = s.id in user_owned_series or s.id in user_collab_series
            if user_involved:
                filtered_series.append(s)
        
        # Build response with cached data
        result = []
        for s in filtered_series:
            song_count = song_count_map.get(s.id, 0)
            authors = authors_map.get(s.id, [])
            
            response_data = {
                "id": s.id,
                "series_number": s.series_number,
                "album_name": s.album_name,
                "artist_name": s.artist_name,
                "year": s.year,
                "cover_image_url": s.cover_image_url,
                "status": s.status,
                "description": s.description,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
                "song_count": song_count,
                "authors": authors
            }
            result.append(AlbumSeriesResponse(**response_data))
        
        return result
    
    def get_album_series_detail(self, series_id: int) -> Dict[str, Any]:
        """Get detailed information about a specific album series."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            return None
        
        # Get all songs for this series with relations
        songs = self.album_series_repo.get_songs_with_relations(series_id)
        
        # Split songs into album songs and bonus songs
        album_songs = [song for song in songs if song.album and song.album.lower() == series.album_name.lower()]
        bonus_songs = [song for song in songs if song not in album_songs]
        
        # Format songs
        formatted_album_songs = [self._format_song_for_response(song) for song in album_songs]
        formatted_bonus_songs = [self._format_song_for_response(song) for song in bonus_songs]
        
        # Get unique authors
        authors = self._get_unique_authors_for_series(series_id)
        
        # Get pack data if available
        pack_id = None
        pack_name = None
        if series.pack_id:
            pack = self.pack_repo.get_by_id(series.pack_id)
            if pack:
                pack_id = pack.id
                pack_name = pack.name
        
        return {
            "id": series.id,
            "series_number": series.series_number,
            "album_name": series.album_name,
            "artist_name": series.artist_name,
            "year": series.year,
            "cover_image_url": series.cover_image_url,
            "status": series.status,
            "description": series.description,
            "created_at": series.created_at,
            "updated_at": series.updated_at,
            "pack_id": pack_id,
            "pack_name": pack_name,
            "album_songs": formatted_album_songs,
            "bonus_songs": formatted_bonus_songs,
            "total_songs": len(songs),
            "authors": authors
        }
    
    def create_from_pack(self, request: CreateAlbumSeriesRequest) -> AlbumSeries:
        """Create an album series from a pack of WIP or Future songs."""
        # Check if pack exists and has qualifying songs
        pack = self.pack_repo.get_by_name(request.pack_name)
        if not pack:
            raise ValueError(f"Pack '{request.pack_name}' not found")
        
        songs = self.song_repo.get_songs_by_pack_and_status(
            pack.id, [SongStatus.wip, SongStatus.future]
        )
        if not songs:
            raise ValueError(f"No WIP or Future songs found for pack '{request.pack_name}'")
        
        # Check if album series already exists
        existing_series = self.album_series_repo.get_by_artist_album(
            request.artist_name, request.album_name
        )
        if existing_series:
            raise ValueError(f"Album series already exists for {request.artist_name} - {request.album_name}")
        
        # Determine status
        song_statuses = [song.status for song in songs]
        status = "in_progress" if SongStatus.wip in song_statuses else "planned"
        
        # Create album series
        album_series = self.album_series_repo.create(
            pack_id=pack.id,
            series_number=None,
            album_name=request.album_name,
            artist_name=request.artist_name,
            year=request.year,
            cover_image_url=request.cover_image_url,
            status=status,
            description=request.description,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Assign songs to this album series
        self._assign_songs_to_series(songs, album_series, request)
        
        # Auto-fetch album art if not provided
        if not request.cover_image_url:
            self._auto_fetch_album_art(album_series)
        
        # Check achievements
        try:
            from api.achievements import check_album_series_achievements
            check_album_series_achievements(self.db, pack.user_id)
        except Exception as e:
            print(f"⚠️ Failed to check achievements: {e}")
        
        return album_series
    
    def release_series(self, series_id: int) -> Dict[str, Any]:
        """Release an album series and assign it a series number."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        if series.status == "released":
            raise ValueError("Album series is already released")
        
        # Get next series number
        next_series_number = self.album_series_repo.get_next_series_number()
        
        # Update series
        series.series_number = next_series_number
        series.status = "released"
        self.album_series_repo.update(series)
        
        # Update all songs in the series to released status
        songs = self.song_repo.get_songs_by_series(series_id)
        self.song_repo.update_songs_status(songs, SongStatus.released)
        self.db.commit()
        
        # Check achievements
        try:
            from api.achievements import check_album_series_achievements
            if series.pack_id:
                pack = self.pack_repo.get_by_id(series.pack_id)
                if pack:
                    check_album_series_achievements(self.db, pack.user_id)
        except Exception as e:
            print(f"⚠️ Failed to check achievements: {e}")
        
        return {
            "message": f"Album series '{series.album_name}' by {series.artist_name} released as series #{next_series_number}",
            "series_number": next_series_number
        }
    
    def update_status(self, series_id: int, new_status: str) -> Dict[str, Any]:
        """Update the status of an album series."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        if not AlbumSeriesValidator.validate_status(new_status):
            valid_statuses = AlbumSeriesValidator.get_valid_statuses()
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        series.status = new_status
        self.album_series_repo.update(series)
        
        return {
            "message": f"Album series '{series.album_name}' status updated to '{new_status}'",
            "status": new_status
        }
    
    def delete_series(self, series_id: int, current_user: User) -> Dict[str, Any]:
        """Delete an album series and all its songs."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        # Check if user owns any songs in this series
        user_songs = self.song_repo.get_user_songs_in_series(series_id, current_user.id)
        if not user_songs:
            raise PermissionError("You don't have permission to delete this album series")
        
        # Get all songs in the series for count
        all_songs = self.song_repo.get_songs_by_series(series_id)
        song_count = len(all_songs)
        
        # Delete all songs in the series
        for song in all_songs:
            self.db.delete(song)
        
        # Delete the album series
        self.album_series_repo.delete(series)
        
        return {"message": f"Album series '{series.album_name}' and {song_count} songs deleted successfully"}
    
    def _format_song_for_response(self, song: Song) -> Dict[str, Any]:
        """Format song for API response."""
        try:
            song_dict = {
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "album": song.album,
                "status": song.status,
                "pack_name": song.pack_obj.name if song.pack_obj else None,
                "year": song.year,
                "album_cover": song.album_cover,
                "author": song.user.username if song.user else None,
                "user_id": song.user_id,
                "optional": song.optional,
                "album_series_id": song.album_series_id,
                "collaborations": [],
                "authoring": song.authoring
            }
            
            # Format collaborations
            if song.collaborations:
                song_dict["collaborations"] = [
                    {
                        "id": collab.id,
                        "collaborator_id": collab.collaborator_id,
                        "author": collab.collaborator.username if collab.collaborator else None,
                        "role": collab.role,
                        "created_at": collab.created_at
                    }
                    for collab in song.collaborations
                    if collab.collaborator
                ]
            
            return song_dict
        except Exception as e:
            print(f"Error formatting song {song.id}: {e}")
            # Return minimal song dict if there's an error
            return {
                "id": song.id,
                "title": song.title or "Unknown",
                "artist": song.artist or "Unknown",
                "album": song.album,
                "status": song.status,
                "pack_name": song.pack_obj.name if song.pack_obj else None,
                "year": song.year,
                "album_cover": song.album_cover,
                "author": song.user.username if song.user else None,
                "user_id": song.user_id,
                "optional": song.optional,
                "album_series_id": song.album_series_id,
                "collaborations": [],
                "authoring": song.authoring
            }
    
    def _get_unique_authors_for_series(self, series_id: int) -> List[str]:
        """Get unique authors for a series from both songs and collaborations."""
        authors_map = self.album_series_repo.get_authors_bulk([series_id])
        return authors_map.get(series_id, [])
    
    def _assign_songs_to_series(self, songs: List[Song], album_series: AlbumSeries, 
                               request: CreateAlbumSeriesRequest) -> None:
        """Assign songs to the album series."""
        target_songs = []
        if request.song_ids:
            # If specific song IDs are provided, only assign those
            target_songs = self.song_repo.get_songs_by_ids(request.song_ids)
        else:
            # Default: assign ALL songs in the pack to the album series
            # Songs that match artist/album will be "album songs"
            # Songs that don't match will be "bonus songs"
            target_songs = songs
        
        for s in target_songs:
            s.album_series_id = album_series.id
        
        self.db.commit()
    
    def _auto_fetch_album_art(self, album_series: AlbumSeries) -> None:
        """Auto-fetch album art for series."""
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            return
        
        try:
            sp = Spotify(auth_manager=SpotifyClientCredentials(
                client_id=SPOTIFY_CLIENT_ID,
                client_secret=SPOTIFY_CLIENT_SECRET
            ))
            
            search_query = f"artist:{album_series.artist_name} album:{album_series.album_name}"
            results = sp.search(q=search_query, type="album", limit=1)
            
            if results["albums"]["items"]:
                album = results["albums"]["items"][0]
                if album["images"]:
                    album_series.cover_image_url = album["images"][0]["url"]
                    self.album_series_repo.update(album_series)
        except Exception as e:
            print(f"Failed to fetch album art for {album_series.artist_name} - {album_series.album_name}: {e}")


class SpotifyService:
    """Service for Spotify-related operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.album_series_repo = AlbumSeriesRepository(db)
        self.song_repo = SongRepository(db)
        self.dlc_repo = DLCRepository(db)
        self.preexisting_repo = PreexistingRepository(db)
        self.override_repo = OverrideRepository(db)
    
    def fetch_album_art(self, series_id: int) -> Dict[str, Any]:
        """Fetch album art for an album series using Spotify API."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            raise ValueError("Spotify credentials not configured")
        
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        search_query = f"artist:{series.artist_name} album:{series.album_name}"
        results = sp.search(q=search_query, type="album", limit=1)
        
        if results["albums"]["items"]:
            album = results["albums"]["items"][0]
            if album["images"]:
                series.cover_image_url = album["images"][0]["url"]
                self.album_series_repo.update(series)
                
                return {
                    "message": f"Album art fetched successfully for {series.artist_name} - {series.album_name}",
                    "cover_image_url": series.cover_image_url
                }
            else:
                raise ValueError("No album art found for this album")
        else:
            raise ValueError("Album not found on Spotify")
    
    def fetch_all_album_art(self) -> Dict[str, Any]:
        """Fetch album art for all album series that don't have it."""
        series_without_art = self.album_series_repo.get_series_without_cover_art()
        
        if not series_without_art:
            return {"message": "All album series already have cover art"}
        
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            raise ValueError("Spotify credentials not configured")
        
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        updated_count = 0
        for series in series_without_art:
            try:
                search_query = f"artist:{series.artist_name} album:{series.album_name}"
                results = sp.search(q=search_query, type="album", limit=1)
                
                if results["albums"]["items"]:
                    album = results["albums"]["items"][0]
                    if album["images"]:
                        series.cover_image_url = album["images"][0]["url"]
                        series.updated_at = datetime.utcnow()
                        updated_count += 1
            except Exception as e:
                print(f"Failed to fetch album art for {series.artist_name} - {series.album_name}: {e}")
                continue
        
        self.db.commit()
        
        return {
            "message": f"Updated album art for {updated_count} out of {len(series_without_art)} series",
            "updated_count": updated_count,
            "total_series": len(series_without_art)
        }