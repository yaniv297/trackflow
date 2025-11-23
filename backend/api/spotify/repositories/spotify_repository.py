"""
Spotify repository - handles data access for Spotify-related operations.
"""

import os
from typing import Optional, List, Set
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, text
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials

from models import Song, Artist, Pack, FeatureRequest, User, RockBandDLC
from ..validators.spotify_validators import SpotifyOptionResponse


class SpotifyRepository:
    def __init__(self):
        # Don't load credentials at init time - load them lazily when needed
        # This ensures .env file is loaded before we try to read credentials
        pass

    def get_spotify_client(self) -> Optional[Spotify]:
        """Get authenticated Spotify client."""
        # Load credentials lazily to ensure .env is loaded
        client_id = os.getenv("SPOTIFY_CLIENT_ID")
        client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        
        if not client_id or not client_secret:
            print(f"Spotify credentials missing: CLIENT_ID={'set' if client_id else 'missing'}, CLIENT_SECRET={'set' if client_secret else 'missing'}")
            return None
        
        auth = SpotifyClientCredentials(
            client_id=client_id,
            client_secret=client_secret,
        )
        return Spotify(auth_manager=auth)

    def get_song_by_id(self, db: Session, song_id: int) -> Optional[Song]:
        """Get song by ID."""
        return db.query(Song).get(song_id)

    def get_artist_by_name(self, db: Session, artist_name: str) -> Optional[Artist]:
        """Get artist by name."""
        return db.query(Artist).filter(Artist.name == artist_name).first()

    def create_artist(self, db: Session, artist_name: str, image_url: Optional[str] = None) -> Optional[Artist]:
        """Create new artist with sequence fix for PostgreSQL."""
        try:
            # Fix PostgreSQL sequence if needed
            db_url = str(db.bind.url)
            if 'postgresql' in db_url.lower():
                try:
                    db.execute(text("""
                        SELECT setval('artists_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM artists), false)
                    """))
                    db.commit()
                except Exception as seq_error:
                    print(f"Sequence reset skipped: {seq_error}")
            
            # Create the artist (no user_id - artists are shared entities)
            artist = Artist(name=artist_name, image_url=image_url, user_id=None)
            db.add(artist)
            db.flush()
            print(f"Successfully created artist {artist_name} with ID {artist.id}")
            return artist
            
        except Exception as e:
            print(f"Failed to create artist {artist_name}: {e}")
            db.rollback()
            
            # Try to get existing artist (might have been created by another request)
            artist = self.get_artist_by_name(db, artist_name)
            if not artist:
                print(f"Could not create or find artist {artist_name}")
                return None
            else:
                print(f"Found existing artist {artist_name} with ID {artist.id} after creation failure")
                return artist

    def update_artist_image(self, db: Session, artist: Artist, image_url: str):
        """Update artist image URL."""
        artist.image_url = image_url
        db.commit()
        db.refresh(artist)

    def get_songs_by_artist(self, db: Session, artist_name: str) -> List[Song]:
        """Get all songs by artist name (case-insensitive)."""
        try:
            return db.query(Song).filter(Song.artist.ilike(f"%{artist_name}%")).all()
        except Exception:
            return []

    def check_dlc_exists(self, db: Session, title: str, artist: str) -> bool:
        """Check if song exists as Rock Band DLC."""
        try:
            dlc_entry = db.query(RockBandDLC).filter(
                RockBandDLC.title.ilike(title),
                RockBandDLC.artist.ilike(artist)
            ).first()
            return dlc_entry is not None
        except Exception as e:
            print(f"Error checking DLC status for {title}: {e}")
            return False

    def get_pack_by_name(self, db: Session, pack_name: str, user_id: int) -> Optional[Pack]:
        """Get pack by name for specific user."""
        return db.query(Pack).filter(
            Pack.name.ilike(pack_name), 
            Pack.user_id == user_id
        ).first()

    def create_pack(self, db: Session, pack_name: str, user_id: int) -> Pack:
        """Create new pack for user."""
        new_pack = Pack(name=pack_name, user_id=user_id)
        db.add(new_pack)
        db.commit()
        db.refresh(new_pack)
        return new_pack

    def get_artist_by_id(self, db: Session, artist_id: int) -> Optional[Artist]:
        """Get artist by ID."""
        return db.query(Artist).filter(Artist.id == artist_id).first()

    def get_artists_without_images(self, db: Session) -> List[Artist]:
        """Get all artists without image URLs."""
        return db.query(Artist).filter(
            (Artist.image_url.is_(None)) | (Artist.image_url == "")
        ).all()

    def get_songs_with_missing_artists(self, db: Session) -> List[str]:
        """Get unique artist names from songs that don't have artist entries."""
        songs_with_missing_artists = db.query(
            distinct(Song.artist).label('artist_name')
        ).filter(
            Song.artist.isnot(None),
            Song.artist != "",
            Song.artist_id.is_(None)
        ).group_by(Song.artist).all()
        
        return [artist_name for (artist_name,) in songs_with_missing_artists]

    def artist_exists_case_insensitive(self, db: Session, artist_name: str) -> bool:
        """Check if artist exists (case-insensitive)."""
        existing = db.query(Artist).filter(
            func.lower(Artist.name) == func.lower(artist_name)
        ).first()
        return existing is not None