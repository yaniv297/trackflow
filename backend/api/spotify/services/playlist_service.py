"""
Playlist service - handles Spotify playlist import operations.
"""

from typing import Optional, Dict
from sqlalchemy.orm import Session

from models import SongStatus
from schemas import SongCreate
from api.data_access import create_song_in_db
from ..repositories.spotify_repository import SpotifyRepository
from ..validators.spotify_validators import SpotifyPlaylistImportRequest


class PlaylistService:
    def __init__(self):
        self.repository = SpotifyRepository()

    def import_playlist(self, request: SpotifyPlaylistImportRequest, db: Session, current_user) -> Dict[str, int]:
        """Import all tracks from a Spotify playlist as songs."""
        sp = self.repository.get_spotify_client()
        if sp is None:
            raise Exception("Spotify credentials not configured")

        # Map status string to enum
        status_map = {
            "Future Plans": SongStatus.future,
            "In Progress": SongStatus.wip,
            "Released": SongStatus.released,
        }
        target_status = status_map.get(request.status, SongStatus.future)

        # Resolve or create pack
        pack_id: Optional[int] = None
        if request.pack and request.pack.strip():
            pack_name = request.pack.strip()
            existing_pack = self.repository.get_pack_by_name(db, pack_name, current_user.id)
            if existing_pack:
                pack_id = existing_pack.id
            else:
                new_pack = self.repository.create_pack(db, pack_name, current_user.id)
                pack_id = new_pack.id

        imported_count = 0

        try:
            results = sp.playlist_tracks(request.playlist_url)
        except Exception as e:
            raise Exception(f"Failed to read playlist from Spotify: {str(e)}")

        while results:
            for item in results.get("items", []):
                track = item.get("track")
                if not track:
                    continue

                title = track.get("name")
                artists = track.get("artists") or []
                artist_name = artists[0].get("name") if artists else None
                album = (track.get("album") or {}).get("name")

                rd = (track.get("album") or {}).get("release_date")
                year = None
                if isinstance(rd, str) and len(rd) >= 4 and rd[:4].isdigit():
                    year = int(rd[:4])

                album_images = (track.get("album") or {}).get("images") or []
                cover = album_images[0].get("url") if album_images else None

                if not title or not artist_name:
                    continue

                song_kwargs = dict(
                    artist=artist_name,
                    title=title,
                    album=album,
                    status=target_status,
                    year=year,
                    album_cover=cover,
                )
                if pack_id:
                    song_kwargs["pack_id"] = pack_id
                song_payload = SongCreate(**song_kwargs)

                try:
                    create_song_in_db(db, song_payload, current_user, auto_enhance=True)
                    imported_count += 1
                except Exception as e:
                    # Skip duplicates; bubble up other errors
                    if not ("already exists" in str(e)):
                        raise
                except Exception:
                    # Log and continue on unexpected errors
                    import traceback
                    traceback.print_exc()

            if results.get("next"):
                try:
                    results = sp.next(results)
                except Exception:
                    break
            else:
                break

        return {"imported_count": imported_count}