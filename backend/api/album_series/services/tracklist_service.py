"""Tracklist service for Spotify tracklist operations."""

import os
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials

from models import AlbumSeries, Song, SongStatus, User
from ..repositories.album_series_repository import (
    AlbumSeriesRepository, DLCRepository, PreexistingRepository, 
    OverrideRepository, SongRepository, UserRepository
)
from ..validators.album_series_validators import (
    TracklistItem, PreexistingUpdate, IrrelevantUpdate, 
    DiscActionRequest, AddMissingRequest, OverrideRequest
)
from api.tools import clean_string, normalize_title, titles_similar

# Spotify credentials
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")


class TracklistService:
    """Service for tracklist-related operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.album_series_repo = AlbumSeriesRepository(db)
        self.song_repo = SongRepository(db)
        self.dlc_repo = DLCRepository(db)
        self.preexisting_repo = PreexistingRepository(db)
        self.override_repo = OverrideRepository(db)
        self.user_repo = UserRepository(db)
    
    def get_spotify_tracklist(self, series_id: int) -> List[TracklistItem]:
        """Get Spotify tracklist for an album series."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            raise ValueError("Spotify credentials not configured")
        
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        # Get Spotify album tracks
        tracks = self._search_spotify_tracks(sp, series)
        if not tracks:
            return []
        
        # Get existing data for mapping
        songs_map = self._build_songs_map(series_id)
        global_songs = self._get_global_songs(series.artist_name)
        preexisting_map, irrelevant_map = self._build_flag_maps(series_id)
        override_map = self._build_override_map(series_id)
        
        # Build tracklist items
        items = []
        for t in tracks.get('items', []):
            item = self._build_tracklist_item(
                t, series, songs_map, global_songs, 
                preexisting_map, irrelevant_map, override_map
            )
            items.append(item)
        
        # Sort by disc, track number, then title
        items.sort(key=lambda x: (x.disc_number or 1, x.track_number or 1e9, x.title_clean.lower()))
        return items
    
    def set_preexisting_flags(self, series_id: int, payload: PreexistingUpdate) -> Dict[str, Any]:
        """Set preexisting flags for tracks."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        for u in payload.updates:
            spotify_track_id = u.get('spotify_track_id')
            title_clean = clean_string(u.get('title_clean') or u.get('title') or '')
            pre_existing = bool(u.get('pre_existing'))
            
            self.preexisting_repo.upsert_preexisting(
                series_id, spotify_track_id, title_clean, pre_existing
            )
        
        self.db.commit()
        return {"ok": True}
    
    def set_irrelevant_flags(self, series_id: int, payload: IrrelevantUpdate) -> Dict[str, Any]:
        """Set irrelevant flags for tracks."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        for u in payload.updates:
            spotify_track_id = u.get('spotify_track_id')
            title_clean = clean_string(u.get('title_clean') or u.get('title') or '')
            irrelevant = bool(u.get('irrelevant'))
            
            self.preexisting_repo.upsert_irrelevant(
                series_id, spotify_track_id, title_clean, irrelevant
            )
        
        self.db.commit()
        return {"ok": True}
    
    def disc_action(self, series_id: int, payload: DiscActionRequest) -> Dict[str, Any]:
        """Mark/unmark entire disc as irrelevant."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            raise ValueError("Spotify credentials not configured")
        
        # Get tracks for the specified disc
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        tracks = self._search_spotify_tracks(sp, series)
        if not tracks:
            raise ValueError("Album not found on Spotify")
        
        # Filter tracks for the specified disc
        disc_tracks = [t for t in tracks.get('items', []) if t.get('disc_number', 1) == payload.disc_number]
        if not disc_tracks:
            raise ValueError(f"No tracks found for disc {payload.disc_number}")
        
        # Update all tracks in this disc
        for t in disc_tracks:
            spotify_track_id = t.get('id')
            title_clean = clean_string(t.get('name') or '')
            irrelevant = payload.action == "mark_irrelevant"
            
            self.preexisting_repo.upsert_irrelevant(
                series_id, spotify_track_id, title_clean, irrelevant
            )
        
        self.db.commit()
        return {"ok": True, "tracks_updated": len(disc_tracks)}
    
    def check_dlc_status(self, series_id: int) -> Dict[str, Any]:
        """Check all songs in an album series against the Rock Band DLC database."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            raise ValueError("Spotify credentials not configured")
        
        # Get Spotify tracklist
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        tracks = self._search_spotify_tracks(sp, series)
        if not tracks:
            raise ValueError("Album not found on Spotify")
        
        checked_count = 0
        dlc_count = 0
        
        for t in tracks.get('items', []):
            raw_title = t.get('name') or ''
            clean_title = clean_string(raw_title)
            
            # Check DLC status
            is_dlc = self.dlc_repo.check_dlc_status(raw_title, series.artist_name)
            
            checked_count += 1
            if is_dlc:
                dlc_count += 1
        
        return {
            "message": f"Checked {checked_count} songs, found {dlc_count} that are already official Rock Band DLC",
            "checked_count": checked_count,
            "dlc_count": dlc_count
        }
    
    def add_missing_tracks(self, series_id: int, request: AddMissingRequest, 
                          current_user: User) -> List[int]:
        """Add missing tracks to the album series."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        new_ids = []
        for track_data in request.tracks:
            title = clean_string(track_data.get('title') or '')
            
            # Skip if already exists in series
            if self.song_repo.check_song_exists_in_series(series_id, title):
                continue
            
            song = self.song_repo.create_song(
                title=title,
                artist=series.artist_name,
                album=series.album_name,
                year=track_data.get('year'),
                status=SongStatus.future,
                user_id=current_user.id,
                pack_id=request.pack_id,
                album_series_id=series_id
            )
            new_ids.append(song.id)
        
        self.db.commit()
        
        # Auto-enhance songs if user has it enabled
        self._auto_enhance_new_songs(new_ids, current_user)
        
        return new_ids
    
    def set_override(self, series_id: int, request: OverrideRequest) -> Dict[str, Any]:
        """Set override for a track to link to a specific song."""
        series = self.album_series_repo.get_by_id(series_id)
        if not series:
            raise ValueError("Album series not found")
        
        song = self.song_repo.get_songs_by_ids([request.linked_song_id])
        if not song:
            raise ValueError("Song not found")
        
        self.override_repo.upsert_override(
            series_id, request.spotify_track_id, request.title_clean, request.linked_song_id
        )
        self.db.commit()
        return {"ok": True}
    
    def delete_override(self, series_id: int, spotify_track_id: Optional[str] = None, 
                       title_clean: Optional[str] = None) -> Dict[str, Any]:
        """Delete override for a track."""
        if not spotify_track_id and not title_clean:
            raise ValueError("spotify_track_id or title_clean required")
        
        success = self.override_repo.delete_override(series_id, spotify_track_id, title_clean)
        if not success:
            raise ValueError("Override not found")
        
        self.db.commit()
        return {"ok": True}
    
    def _search_spotify_tracks(self, sp: Spotify, series: AlbumSeries) -> Optional[Dict]:
        """Search for album tracks on Spotify."""
        # Handle cases where artist and album names are identical
        if series.artist_name.lower() == series.album_name.lower():
            search_queries = [
                f'album:"{series.album_name}" artist:"{series.artist_name}"',
                f'album:{series.album_name}',
                f'artist:{series.artist_name} album:{series.album_name}',
                f'"{series.album_name}" "{series.artist_name}"',
            ]
        else:
            search_queries = [
                f'album:"{series.album_name}" artist:"{series.artist_name}"',
                f'album:{series.album_name} artist:{series.artist_name}',
            ]
        
        results = None
        for query in search_queries:
            try:
                results = sp.search(q=query, type="album", limit=1)
                if results["albums"]["items"]:
                    print(f"Found results with query: {query}")
                    break
            except Exception as e:
                print(f"Search query failed: {query} - {e}")
                continue
        
        if not results or not results["albums"]["items"]:
            print(f"No results found for album '{series.album_name}' by artist '{series.artist_name}'")
            return None
        
        album = results["albums"]["items"][0]
        return sp.album_tracks(album["id"])
    
    def _build_songs_map(self, series_id: int) -> Dict[str, Song]:
        """Build map of normalized titles to songs for the series."""
        songs = self.song_repo.get_songs_by_series(series_id)
        return {normalize_title((s.title or "")): s for s in songs}
    
    def _get_global_songs(self, artist_name: str) -> List[Song]:
        """Get all songs by the same artist globally."""
        try:
            return self.song_repo.get_songs_by_artist(artist_name)
        except Exception:
            return []
    
    def _build_flag_maps(self, series_id: int) -> tuple:
        """Build preexisting and irrelevant flag maps."""
        user_flags = self.preexisting_repo.get_flags_for_series(series_id)
        preexisting_map = {}
        irrelevant_map = {}
        
        for f in user_flags:
            key = f.spotify_track_id or (f.title_clean or "").lower()
            if key:
                if f.pre_existing:
                    preexisting_map[key] = True
                if f.irrelevant:
                    irrelevant_map[key] = True
        
        return preexisting_map, irrelevant_map
    
    def _build_override_map(self, series_id: int) -> Dict[str, Song]:
        """Build override map for manual song linkings."""
        overrides = self.override_repo.get_overrides_for_series(series_id)
        override_map = {}
        
        for ov in overrides:
            key = ov.spotify_track_id or (ov.title_clean or "").lower()
            if key and ov.linked_song_id:
                songs = self.song_repo.get_songs_by_ids([ov.linked_song_id])
                if songs:
                    override_map[key] = songs[0]
        
        return override_map
    
    def _build_tracklist_item(self, track: Dict, series: AlbumSeries, songs_map: Dict, 
                             global_songs: List[Song], preexisting_map: Dict, 
                             irrelevant_map: Dict, override_map: Dict) -> TracklistItem:
        """Build a single tracklist item from Spotify track data."""
        raw_title = track.get('name') or ''
        clean_title = clean_string(raw_title)
        key = normalize_title(clean_title)
        spotify_id = track.get('id')
        
        # Find matching song (override first, then series, then global)
        series_song = override_map.get(spotify_id) or override_map.get(key)
        if not series_song:
            series_song = songs_map.get(key)
        if not series_song:
            # Fuzzy match against existing song titles in this series
            for cand_key, cand_song in songs_map.items():
                if titles_similar(key, cand_key, threshold=0.92):
                    series_song = cand_song
                    break
        
        # Try to recognize releases globally by the same artist
        global_song = None
        if not series_song and global_songs:
            normalized_series_artist = normalize_title(series.artist_name or "")
            # Exact normalized title + artist match
            for gs in global_songs:
                if (normalize_title(gs.title or "") == key and 
                    normalize_title(gs.artist or "").find(normalized_series_artist) != -1):
                    global_song = gs
                    break
            
            # Fuzzy title match with same artist
            if not global_song:
                for gs in global_songs:
                    if (normalize_title(gs.artist or "").find(normalized_series_artist) == -1 and 
                        normalized_series_artist.find(normalize_title(gs.artist or "")) == -1):
                        continue
                    if titles_similar(key, normalize_title(gs.title or ""), threshold=0.92):
                        global_song = gs
                        break
        
        # Check DLC status
        official = False
        try:
            official = self.dlc_repo.check_dlc_status(clean_title, series.artist_name)
        except Exception as e:
            print(f"Error checking DLC status for {raw_title}: {e}")
        
        # Get flags
        preexisting = preexisting_map.get(spotify_id) or preexisting_map.get(key) or False
        irrelevant = irrelevant_map.get(spotify_id) or irrelevant_map.get(key) or False
        
        # Determine status/in_pack/song_id
        in_pack = bool(series_song)
        status_val = (series_song.status if series_song else 
                     (global_song.status if global_song else None))
        song_id_val = series_song.id if series_song else None
        
        return TracklistItem(
            spotify_track_id=spotify_id,
            title=raw_title,
            title_clean=clean_title,
            artist=series.artist_name,
            track_number=track.get('track_number'),
            disc_number=track.get('disc_number'),
            in_pack=in_pack,
            status=status_val,
            song_id=song_id_val,
            official=bool(official),
            pre_existing=bool(preexisting),
            irrelevant=bool(irrelevant)
        )
    
    def _auto_enhance_new_songs(self, song_ids: List[int], current_user: User) -> None:
        """Auto-enhance newly created songs if user has it enabled."""
        # Check if user has auto-enhance enabled
        db_user = self.user_repo.get_by_id(current_user.id)
        if not db_user:
            return
        
        auto_enhance_enabled = getattr(db_user, 'auto_spotify_fetch_enabled', True)
        if auto_enhance_enabled is None:
            auto_enhance_enabled = True
        else:
            auto_enhance_enabled = bool(auto_enhance_enabled)
        
        if not auto_enhance_enabled:
            return
        
        try:
            from api.spotify import auto_enhance_song
            from api.tools import clean_string as _clean
            
            for song_id in song_ids:
                try:
                    auto_enhance_song(song_id, self.db, preserve_artist_album=True)
                    song = self.db.query(Song).get(song_id)
                    if song:
                        cleaned_title = _clean(song.title)
                        cleaned_album = _clean(song.album or "")
                        if cleaned_title != song.title or cleaned_album != song.album:
                            song.title = cleaned_title
                            song.album = cleaned_album
                            self.db.add(song)
                    self.db.commit()
                except Exception:
                    self.db.rollback()
                    continue
        except Exception:
            pass
        
        # Optional: run cleaner on new songs (legacy polyfill)
        try:
            from api.tools import bulk_clean_remaster_tags_function
            bulk_clean_remaster_tags_function(song_ids, self.db, current_user.id)
        except Exception:
            pass