"""Pack release service for handling pack releases."""

from typing import Dict
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Song, Pack
from ..repositories.pack_repository import PackRepository
from ..schemas import PackReleaseData, PackResponse


class PackReleaseService:
    """Service for pack release functionality."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pack_repo = PackRepository(db)
    
    def release_pack(self, pack_id: int, release_data: PackReleaseData, user_id: int) -> PackResponse:
        """Release a pack with metadata."""
        print(f"🔧 PACK RELEASE DEBUG: Starting release for pack {pack_id} by user {user_id}")
        
        # Get pack with ownership validation
        pack = self.pack_repo.get_by_id(pack_id)
        if not pack:
            print(f"❌ Pack {pack_id} not found")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pack not found"
            )
        
        print(f"✅ Found pack: {pack.name} (owner: {pack.user_id})")
        
        if pack.user_id != user_id:
            print(f"❌ User {user_id} not authorized for pack owned by {pack.user_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this pack"
            )
        
        # Update pack release information
        print(f"🔧 Processing pack release for pack {pack_id}")
        update_data = {
            'release_title': release_data.title,
            'release_description': release_data.description,
            'release_download_link': release_data.download_link,
            'release_youtube_url': release_data.youtube_url
        }
        
        # Set released_at timestamp unless hiding from homepage
        if not release_data.hide_from_homepage:
            update_data['released_at'] = datetime.utcnow()
        
        self.pack_repo.update_pack(pack, update_data)
        
        # Handle song status changes (CRITICAL - this was missing!)
        print(f"🔧 About to release songs for pack {pack_id}")
        self._release_pack_songs(pack_id, release_data, user_id)
        
        print(f"🔧 About to commit changes to database")
        self.pack_repo.commit()
        print(f"✅ Database changes committed")
        
        # Check pack achievements
        try:
            from api.achievements import check_pack_achievements
            check_pack_achievements(self.db, user_id, pack_id)
        except Exception as e:
            print(f"Failed to check pack achievements: {e}")
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                self.db,
                user_id,
                "release_pack",
                f"Released pack: {pack.name}"
            )
        except Exception as e:
            print(f"Failed to log pack release: {e}")
        
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
    
    def update_pack_status(self, pack_id: int, status: str, user_id: int) -> PackResponse:
        """Update pack status and handle release logic."""
        # Get pack with ownership validation
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
        
        # Handle status change logic
        update_data = {}
        
        if status == "Released":
            # Set released timestamp if not already set
            if not pack.released_at:
                update_data['released_at'] = datetime.utcnow()
        elif status in ["WIP", "Complete"]:
            # Remove released timestamp for non-released statuses
            if pack.released_at:
                update_data['released_at'] = None
        
        self.pack_repo.update_pack(pack, update_data)
        self.pack_repo.commit()
        
        # Check pack achievements for status changes
        try:
            from api.achievements import check_pack_achievements
            check_pack_achievements(self.db, user_id, pack_id)
        except Exception as e:
            print(f"Failed to check pack achievements: {e}")
        
        # Log activity
        try:
            from api.activity_logger import log_activity
            log_activity(
                self.db,
                user_id,
                "update_pack_status",
                f"Updated pack status to {status}: {pack.name}"
            )
        except Exception as e:
            print(f"Failed to log pack status update: {e}")
        
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
    
    def _release_pack_songs(self, pack_id: int, release_data: PackReleaseData, user_id: int):
        """Handle song status changes during pack release (matches original logic)."""
        # Get all songs in the pack
        songs = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        print(f"🔧 Found {len(songs)} songs in pack {pack_id}")
        
        # Release completed songs and move optional incomplete songs to "Future Plans"
        released_count = 0
        moved_count = 0
        
        for song in songs:
            print(f"🔧 Processing song {song.id}: '{song.title}' status='{song.status}' optional={song.optional}")
            if song.status == "In Progress":
                if not song.optional:
                    # Required song must be released
                    print(f"✅ Releasing required song {song.id}: {song.title}")
                    song.status = "Released"
                    song.released_at = datetime.utcnow()
                    
                    # Set song download link if provided
                    if release_data.song_download_links and str(song.id) in release_data.song_download_links:
                        song.release_download_link = release_data.song_download_links[str(song.id)]
                    
                    released_count += 1
                else:
                    # Optional song - move to "Future Plans" with new pack name
                    song.status = "Future Plans"
                    song.pack_id = None
                    
                    # Get the original pack name for creating bonus pack
                    pack = self.pack_repo.get_by_id(pack_id)
                    new_pack_name = f"{pack.name} (Bonus)"
                    
                    # Find or create the new pack
                    new_pack = self.db.query(Pack).filter(
                        Pack.name == new_pack_name,
                        Pack.user_id == user_id
                    ).first()
                    
                    if not new_pack:
                        new_pack = Pack(
                            name=new_pack_name,
                            user_id=user_id,
                            priority=pack.priority
                        )
                        self.db.add(new_pack)
                        self.db.flush()  # Get the ID
                        
                    song.pack_id = new_pack.id
                    moved_count += 1
            elif song.status == "Released":
                # Song already released - ensure it has release timestamp
                if not song.released_at:
                    song.released_at = datetime.utcnow()
                
                # Set song download link if provided
                if release_data.song_download_links and str(song.id) in release_data.song_download_links:
                    song.release_download_link = release_data.song_download_links[str(song.id)]
                
                released_count += 1
        
        print(f"Pack release: {released_count} songs released, {moved_count} optional songs moved to bonus pack")
    
    def _update_song_download_links(self, pack_id: int, song_links: Dict[int, str]):
        """Update download links for songs in the pack."""
        try:
            for song_id, download_link in song_links.items():
                song = self.db.query(Song).filter(
                    Song.id == song_id,
                    Song.pack_id == pack_id
                ).first()
                
                if song:
                    song.release_download_link = download_link
            
            self.db.flush()
        except Exception as e:
            print(f"Failed to update song download links: {e}")
            # Don't fail the entire operation for this