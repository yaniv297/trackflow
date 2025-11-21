"""
Song response service - handles formatting song responses.
"""

from typing import Dict, Any
from sqlalchemy.orm import Session, joinedload

from models import Song, User, Collaboration
from schemas import SongOut
from ..repositories.spotify_repository import SpotifyRepository
from .song_enhancement_service import SongEnhancementService


class SongResponseService:
    def __init__(self):
        self.repository = SpotifyRepository()
        self.enhancement_service = SongEnhancementService()

    def enhance_song_and_return_response(self, song_id: int, track_id: str, db: Session, current_user) -> SongOut:
        """Enhance song and return properly formatted response."""
        enhanced_song = self.enhancement_service.enhance_song_with_track_data(song_id, track_id, db, preserve_artist_album=False)
        if not enhanced_song:
            # Check various failure reasons
            sp = self.repository.get_spotify_client()
            if sp is None:
                raise Exception("Spotify service not available - credentials may be missing")
            
            song_exists = self.repository.get_song_by_id(db, song_id)
            if not song_exists:
                raise Exception("Song not found")
            
            raise Exception("Failed to enhance song - track may not be available on Spotify")
        
        # Clean remaster/version tags from title and album
        try:
            from api.tools import clean_string
            db.refresh(enhanced_song)
            cleaned_title = clean_string(enhanced_song.title or "")
            cleaned_album = clean_string(enhanced_song.album or "")
            if cleaned_title != enhanced_song.title or cleaned_album != enhanced_song.album:
                enhanced_song.title = cleaned_title
                enhanced_song.album = cleaned_album
                db.add(enhanced_song)
                db.commit()
                db.refresh(enhanced_song)
        except Exception:
            db.rollback()
        
        # Load the song with all necessary relationships
        song_with_user = db.query(Song).options(
            joinedload(Song.user),
            joinedload(Song.pack_obj),
            joinedload(Song.collaborations).joinedload(Collaboration.user),
            joinedload(Song.authoring)
        ).filter(Song.id == song_id).first()
        
        if not song_with_user:
            raise Exception("Song not found")
        
        # Build response with proper collaboration formatting
        song_dict = self.build_song_dict(song_with_user, db)
        
        return SongOut.model_validate(song_dict)

    def build_song_dict(self, song: Song, db: Session) -> Dict[str, Any]:
        """Build song dictionary for response."""
        song_dict = {
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "album": song.album,
            "status": song.status,
            "pack_id": song.pack_id,
            "year": song.year,
            "album_cover": song.album_cover,
            "user_id": song.user_id,
        }
        
        # Author username
        if song.user:
            song_dict["author"] = song.user.username
            
        # Pack info
        if song.pack_obj:
            song_dict["pack_name"] = song.pack_obj.name
            song_dict["pack_owner_id"] = song.pack_obj.user_id
            try:
                pack_owner = db.query(User).filter(User.id == song.pack_obj.user_id).first()
                if pack_owner:
                    song_dict["pack_owner_username"] = pack_owner.username
            except Exception:
                pass
                
        # Collaborations with username
        collaborations_with_username = []
        if hasattr(song, "collaborations") and song.collaborations:
            for collab in song.collaborations:
                collaborations_with_username.append({
                    "id": collab.id,
                    "user_id": collab.user_id,
                    "username": getattr(collab.user, "username", None),
                    "collaboration_type": getattr(collab.collaboration_type, "value", None),
                    "created_at": collab.created_at,
                })
        song_dict["collaborations"] = collaborations_with_username
        
        return song_dict