"""Pack repository for data access operations."""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import datetime
from models import Pack, Song, SongStatus


class PackRepository:
    """Repository for pack data access operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_id(self, pack_id: int) -> Optional[Pack]:
        """Get pack by ID."""
        return self.db.query(Pack).filter(Pack.id == pack_id).first()
    
    def get_by_name_and_user(self, name: str, user_id: int) -> Optional[Pack]:
        """Get pack by name and user."""
        return self.db.query(Pack).filter(
            Pack.name.ilike(name),
            Pack.user_id == user_id
        ).first()
    
    def get_user_packs(self, user_id: int) -> List[Pack]:
        """Get all packs for a user."""
        return self.db.query(Pack).filter(
            Pack.user_id == user_id
        ).order_by(Pack.updated_at.desc()).all()
    
    def get_pack_with_songs(self, pack_id: int) -> Optional[Pack]:
        """Get pack with all its songs loaded."""
        return self.db.query(Pack).options(
            joinedload(Pack.songs)
        ).filter(Pack.id == pack_id).first()
    
    def get_user_packs_with_songs(self, user_id: int) -> List[Pack]:
        """Get all user packs with songs loaded."""
        return self.db.query(Pack).options(
            joinedload(Pack.songs)
        ).filter(Pack.user_id == user_id).order_by(Pack.updated_at.desc()).all()
    
    def create_pack(self, pack_data: dict) -> Pack:
        """Create a new pack."""
        pack_data['created_at'] = datetime.utcnow()
        pack_data['updated_at'] = datetime.utcnow()
        
        pack = Pack(**pack_data)
        self.db.add(pack)
        self.db.flush()  # Get the ID without committing
        return pack
    
    def update_pack(self, pack: Pack, update_data: dict) -> Pack:
        """Update pack data."""
        update_data['updated_at'] = datetime.utcnow()
        
        for field, value in update_data.items():
            if hasattr(pack, field):
                setattr(pack, field, value)
        return pack
    
    def delete_pack(self, pack: Pack):
        """Delete a pack."""
        self.db.delete(pack)
    
    def get_pack_song_count(self, pack_id: int) -> int:
        """Get total song count for a pack."""
        return self.db.query(Song).filter(Song.pack_id == pack_id).count()
    
    def get_pack_completion_data(self, pack_id: int) -> dict:
        """Get pack completion statistics."""
        songs = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        
        total_songs = len(songs)
        if total_songs == 0:
            return {
                'total_songs': 0,
                'completed_songs': 0,
                'incomplete_songs': 0,
                'completion_percentage': 0.0
            }
        
        # Count completed songs (those with status "Released") 
        completed_songs = sum(1 for song in songs if song.status == SongStatus.released)
        incomplete_songs = total_songs - completed_songs
        completion_percentage = (completed_songs / total_songs) * 100
        
        return {
            'total_songs': total_songs,
            'completed_songs': completed_songs,
            'incomplete_songs': incomplete_songs,
            'completion_percentage': completion_percentage
        }
    
    def commit(self):
        """Commit changes to database."""
        self.db.commit()
    
    def rollback(self):
        """Rollback changes."""
        self.db.rollback()