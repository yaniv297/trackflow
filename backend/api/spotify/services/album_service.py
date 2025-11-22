"""
Album service - handles album and tracklist operations.
"""

from typing import List, Dict
from sqlalchemy.orm import Session

from ..repositories.spotify_repository import SpotifyRepository
from ..validators.spotify_validators import TracklistItem


class AlbumService:
    def __init__(self):
        self.repository = SpotifyRepository()

    def get_album_tracklist(self, artist: str, album: str, db: Session) -> List[TracklistItem]:
        """Get Spotify tracklist for an album."""
        sp = self.repository.get_spotify_client()
        if sp is None:
            raise Exception("Spotify credentials not configured")

        try:
            # Search for the album with multiple strategies
            search_queries = self._build_album_search_queries(artist, album)
            
            results = None
            for query in search_queries:
                try:
                    results = sp.search(q=query, type="album", limit=10)
                    if results["albums"]["items"]:
                        print(f"Found results with query: {query}")
                        break
                except Exception as e:
                    print(f"Search query failed: {query} - {e}")
                    continue
            
            if not results or not results["albums"]["items"]:
                print(f"No results found for album '{album}' by artist '{artist}' with any search query")
                return []
            
            # Find the original version (not deluxe, anniversary, etc.)
            original_album = self._select_original_album(results["albums"]["items"])
            album_id = original_album["id"]
            tracks = sp.album_tracks(album_id)

            # Build tracklist items
            return self._build_tracklist_items(tracks, artist, db)
            
        except Exception as e:
            raise Exception(f"Failed to fetch album tracklist: {str(e)}")

    def _build_album_search_queries(self, artist: str, album: str) -> List[str]:
        """Build search queries for album lookup."""
        if artist.lower() == album.lower():
            # Handle identical artist/album names
            return [
                f'album:"{album}" artist:"{artist}"',
                f'album:{album}',
                f'artist:{artist} album:{album}',
                f'"{album}" "{artist}"',
            ]
        else:
            # Normal case
            return [
                f'album:"{album}" artist:"{artist}"',
                f'album:{album} artist:{artist}',
            ]

    def _select_original_album(self, albums: List[Dict]) -> Dict:
        """Select the original album version (not deluxe, remastered, etc.)."""
        original_album = None
        
        for album_data in albums:
            album_name = album_data.get("name", "").lower()
            if not any(keyword in album_name for keyword in ["deluxe", "anniversary", "remastered", "expanded", "bonus", "special"]):
                original_album = album_data
                break
        
        return original_album or albums[0]

    def _build_tracklist_items(self, tracks: Dict, artist: str, db: Session) -> List[TracklistItem]:
        """Build tracklist items from Spotify track data."""
        from api.tools import clean_string, normalize_title, titles_similar
        
        # Get global songs by the same artist
        try:
            global_songs = self.repository.get_songs_by_artist(db, artist)
        except Exception:
            global_songs = []
        normalized_artist = normalize_title(artist or "")
        
        items: List[TracklistItem] = []
        for t in tracks.get('items', []):
            raw_title = t.get('name') or ''
            clean_title = clean_string(raw_title)
            key = normalize_title(clean_title)
            
            # Check if this song is already official Rock Band DLC
            is_dlc = self.repository.check_dlc_exists(db, clean_title, artist)
            
            # Check for existing songs by the same artist
            s_global = None
            status_val = None
            if global_songs:
                for gs in global_songs:
                    gs_artist_normalized = normalize_title(gs.artist or "")
                    if (gs_artist_normalized.find(normalized_artist) != -1 or 
                        normalized_artist.find(gs_artist_normalized) != -1):
                        gs_title_normalized = normalize_title(gs.title or "")
                        if titles_similar(key, gs_title_normalized, threshold=0.92):
                            s_global = gs
                            status_val = gs.status
                            break
            
            items.append(TracklistItem(
                spotify_track_id=t.get('id'),
                title=raw_title,
                title_clean=clean_title,
                artist=artist,
                track_number=t.get('track_number'),
                disc_number=t.get('disc_number'),
                in_pack=False,
                status=status_val,
                song_id=s_global.id if s_global else None,
                official=is_dlc,
                pre_existing=False
            ))

        # Sort by disc, track number, then title
        items.sort(key=lambda x: (x.disc_number or 1, x.track_number or 1e9, x.title_clean.lower()))
        return items