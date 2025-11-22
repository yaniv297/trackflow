"""
Song enhancement service - handles enhancing songs with Spotify track data.
"""

from typing import Optional
from sqlalchemy.orm import Session, joinedload

from models import Song, Artist, Collaboration
from ..repositories.spotify_repository import SpotifyRepository


class SongEnhancementService:
    def __init__(self):
        self.repository = SpotifyRepository()

    def enhance_song_with_track_data(self, song_id: int, track_id: str, db: Session, 
                                   preserve_artist_album: bool = False) -> Optional[Song]:
        """Enhance a song with Spotify track data."""
        sp = self.repository.get_spotify_client()
        if sp is None:
            print(f"Spotify client not available for song {song_id}")
            return None

        song = self.repository.get_song_by_id(db, song_id)
        if not song:
            print(f"Song {song_id} not found in database")
            return None

        try:
            print(f"Fetching track {track_id} from Spotify for song {song_id}")
            track = sp.track(track_id)
            if not track:
                print(f"Track {track_id} not found on Spotify")
                return None
            print(f"Successfully fetched track: {track.get('name', 'Unknown')} by {track.get('artists', [{}])[0].get('name', 'Unknown')}")

            album = track.get("album") or {}
            images = album.get("images") or []
            year = None
            rd = album.get("release_date")
            if isinstance(rd, str) and len(rd) >= 4 and rd[:4].isdigit():
                year = int(rd[:4])

            # Only update album if we're not preserving it
            if not preserve_artist_album:
                album_name = album.get("name")
                song.album = album_name or song.album
            
            # Always update album cover and year
            if images:
                song.album_cover = images[0].get("url") or song.album_cover
            if year:
                song.year = year

            # Handle artist creation/update
            artist_name = (track.get("artists") or [{}])[0].get("name")
            if artist_name:
                artist = self._ensure_artist_exists(db, sp, artist_name)
                
                # Only update artist if we're not preserving it
                if not preserve_artist_album and artist:
                    song.artist = artist_name
                    song.artist_id = artist.id

            print(f"Updating song {song_id} in database")
            db.add(song)
            db.commit()
            db.refresh(song)
            print(f"Successfully enhanced song {song_id}")
            return song
            
        except Exception as e:
            print(f"Exception during enhancement of song {song_id}: {str(e)}")
            import traceback
            traceback.print_exc()
            db.rollback()
            return None

    def auto_enhance_song(self, song_id: int, db: Session, preserve_artist_album: bool = False) -> bool:
        """Automatically enhance song by searching for it on Spotify."""
        sp = self.repository.get_spotify_client()
        if sp is None:
            return False

        song = self.repository.get_song_by_id(db, song_id)
        if not song:
            return False

        try:
            query = f"{song.title} {song.artist}".strip()
            results = sp.search(q=query, type="track", limit=1)
            items = (results.get("tracks") or {}).get("items") or []
            if not items:
                return False
            track_id = items[0].get("id")
            if not track_id:
                return False
            return self.enhance_song_with_track_data(song_id, track_id, db, preserve_artist_album) is not None
        except Exception:
            return False

    def _ensure_artist_exists(self, db: Session, sp, artist_name: str) -> Optional[Artist]:
        """Ensure artist exists, creating if necessary."""
        from .artist_service import ArtistService
        
        artist_service = ArtistService()
        artist = self.repository.get_artist_by_name(db, artist_name)
        
        if not artist:
            # Try to fetch artist image
            artist_img = artist_service.fetch_artist_image_from_spotify(artist_name, sp)
            artist = self.repository.create_artist(db, artist_name, artist_img)
        else:
            print(f"Found existing artist {artist_name} with ID {artist.id}")
            # If artist exists but has no image, try to fetch it
            if not artist.image_url and sp:
                try:
                    image_url = artist_service.fetch_artist_image_from_spotify(artist_name, sp)
                    if image_url:
                        self.repository.update_artist_image(db, artist, image_url)
                        print(f"Fetched image for existing artist {artist_name}")
                except Exception:
                    pass
        
        return artist