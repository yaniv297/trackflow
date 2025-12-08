"""Pack service layer for business logic."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Pack, Song, SongStatus
from ..repositories.pack_repository import PackRepository
from ..schemas import PackCreate, PackUpdate, PackStatusUpdate, PackResponse


class PackService:
    """Service for pack business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pack_repo = PackRepository(db)
    
    def get_pack_by_id(self, pack_id: int, user_id: int) -> Pack:
        """Get pack by ID with user ownership validation."""
        pack = self.pack_repo.get_by_id(pack_id)
        if not pack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pack not found"
            )
        
        if pack.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this pack"
            )
        
        return pack
    
    def get_user_packs(self, user_id: int) -> List[PackResponse]:
        """Get all packs for a user."""
        packs = self.pack_repo.get_user_packs(user_id)
        
        return [
            PackResponse(
                id=pack.id,
                name=pack.name,
                user_id=pack.user_id,
                priority=pack.priority,
                created_at=pack.created_at.isoformat() if pack.created_at else "",
                updated_at=pack.updated_at.isoformat() if pack.updated_at else "",
                released_at=pack.released_at.isoformat() if pack.released_at else None,
                release_title=pack.release_title,
                release_description=pack.release_description,
                release_download_link=pack.release_download_link,
                release_youtube_url=pack.release_youtube_url
            )
            for pack in packs
        ]
    
    def create_pack(self, pack_data: PackCreate, user_id: int) -> PackResponse:
        """Create a new pack."""
        # Check if pack with same name exists for user
        existing_pack = self.pack_repo.get_by_name_and_user(pack_data.name, user_id)
        if existing_pack:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pack with this name already exists"
            )
        
        # Create pack
        pack_dict = pack_data.dict()
        pack_dict['user_id'] = user_id
        
        pack = self.pack_repo.create_pack(pack_dict)
        self.pack_repo.commit()
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                self.db,
                user_id,
                "create_pack",
                f"Created new pack: {pack.name}"
            )
        except Exception as e:
            print(f"Failed to log pack creation: {e}")
        
        return PackResponse(
            id=pack.id,
            name=pack.name,
            user_id=pack.user_id,
            priority=pack.priority,
            created_at=pack.created_at.isoformat() if pack.created_at else "",
            updated_at=pack.updated_at.isoformat() if pack.updated_at else "",
            released_at=pack.released_at.isoformat() if pack.released_at else None,
            release_title=pack.release_title,
            release_description=pack.release_description,
            release_download_link=pack.release_download_link,
            release_youtube_url=pack.release_youtube_url
        )
    
    def update_pack(self, pack_id: int, pack_data: PackUpdate, user_id: int) -> PackResponse:
        """Update a pack."""
        pack = self.get_pack_by_id(pack_id, user_id)
        
        # Check for name conflicts if name is being changed
        if pack_data.name and pack_data.name != pack.name:
            existing_pack = self.pack_repo.get_by_name_and_user(pack_data.name, user_id)
            if existing_pack:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Pack with this name already exists"
                )
        
        # Update pack
        update_dict = pack_data.dict(exclude_unset=True)
        self.pack_repo.update_pack(pack, update_dict)
        self.pack_repo.commit()
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                self.db,
                user_id,
                "update_pack",
                f"Updated pack: {pack.name}"
            )
        except Exception as e:
            print(f"Failed to log pack update: {e}")
        
        return PackResponse(
            id=pack.id,
            name=pack.name,
            user_id=pack.user_id,
            priority=pack.priority,
            created_at=pack.created_at.isoformat() if pack.created_at else "",
            updated_at=pack.updated_at.isoformat() if pack.updated_at else "",
            released_at=pack.released_at.isoformat() if pack.released_at else None,
            release_title=pack.release_title,
            release_description=pack.release_description,
            release_download_link=pack.release_download_link,
            release_youtube_url=pack.release_youtube_url
        )
    
    def delete_pack(self, pack_id: int, user_id: int):
        """Delete a pack."""
        pack = self.get_pack_by_id(pack_id, user_id)
        
        # Check if pack has songs
        song_count = self.pack_repo.get_pack_song_count(pack_id)
        if song_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete pack with {song_count} songs. Move or delete songs first."
            )
        
        # Delete pack
        pack_name = pack.name
        self.pack_repo.delete_pack(pack)
        self.pack_repo.commit()
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                self.db,
                user_id,
                "delete_pack",
                f"Deleted pack: {pack_name}"
            )
        except Exception as e:
            print(f"Failed to log pack deletion: {e}")
    
    def get_pack_autocomplete_suggestions(self, query: str, user_id: int, limit: int = 10) -> List[str]:
        """Get pack name autocomplete suggestions."""
        packs = self.pack_repo.get_user_packs(user_id)
        
        if not query:
            return [pack.name for pack in packs[:limit]]
        
        # Filter packs that contain the query (case insensitive)
        matching_packs = [
            pack.name for pack in packs
            if query.lower() in pack.name.lower()
        ]
        
        return matching_packs[:limit]