"""
Search service - handles Spotify search operations.
"""

from typing import List
from sqlalchemy.orm import Session

from ..repositories.spotify_repository import SpotifyRepository
from ..validators.spotify_validators import SpotifyOptionResponse


class SearchService:
    def __init__(self):
        self.repository = SpotifyRepository()

    def get_spotify_options_for_song(self, song_id: int, db: Session) -> List[SpotifyOptionResponse]:
        """Get Spotify track options for a song."""
        sp = self.repository.get_spotify_client()
        if sp is None:
            raise Exception("Spotify credentials not configured")

        song = self.repository.get_song_by_id(db, song_id)
        if not song:
            raise Exception("Song not found")

        try:
            # Try specific search first, then broader search
            search_queries = [
                f'track:"{song.title}" artist:"{song.artist}"',
                f"{song.title} {song.artist}"
            ]
            
            items = []
            for query in search_queries:
                results = sp.search(q=query.strip(), type="track", limit=5)
                items = (results.get("tracks") or {}).get("items") or []
                if items:
                    break
            
            options = []
            for track in items:
                album = track.get("album") or {}
                artists = track.get("artists") or []
                artist_name = artists[0].get("name") if artists else "Unknown"
                
                options.append(SpotifyOptionResponse(
                    track_id=track.get("id"),
                    title=track.get("name"),
                    artist=artist_name,
                    album=album.get("name"),
                    year=album.get("release_date", "")[:4] if album.get("release_date") else None,
                    album_cover=album.get("images", [{}])[0].get("url") if album.get("images") else None,
                    duration_ms=track.get("duration_ms"),
                    popularity=track.get("popularity")
                ))
            
            return options
            
        except Exception as e:
            print(f"Error in get_spotify_options: {str(e)}")
            raise Exception(f"Failed to fetch Spotify options: {str(e)}")