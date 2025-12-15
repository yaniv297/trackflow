from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Tuple
from fastapi import HTTPException
from datetime import datetime

from models import Song, SongStatus, User, Pack, AlbumSeries, CollaborationType, NotificationType
from schemas import SongCreate, SongOut
from api.data_access import create_song_in_db, delete_song_from_db
from api.activity_logger import log_activity
from api.achievements import (
    check_status_achievements,
    check_wip_completion_achievements,
    check_diversity_achievements,
)
from api.achievements.repositories.achievements_repository import AchievementsRepository
from api.notifications.services.notification_service import NotificationService

from ..repositories.song_repository import SongRepository
from ..repositories.collaboration_repository import CollaborationRepository
from ..repositories.pack_repository import PackRepository


class SongService:
    """Service class containing Song business logic."""
    
    def __init__(self, db: Session):
        self.db = db
        self.song_repo = SongRepository(db)
        self.collab_repo = CollaborationRepository(db)
        self.pack_repo = PackRepository(db)
        self.achievements_repo = AchievementsRepository()
        self.notification_service = NotificationService(db)
    
    def create_song(self, song_data: SongCreate, current_user: User) -> SongOut:
        """Create a new song with pack handling and achievements."""
        # Convert to dict and set user_id
        song_data_dict = song_data.dict()
        song_data_dict["user_id"] = current_user.id
        
        # Handle pack creation/assignment
        self._handle_pack_assignment(song_data_dict, current_user)
        
        # Clean song data
        cleaned_data = self._clean_song_data(song_data_dict)
        song_with_author = SongCreate(**cleaned_data)
        
        # Create the song
        db_song = create_song_in_db(self.db, song_with_author, current_user)
        
        # Re-fetch with relationships
        db_song = self.song_repo.get_song_by_id(db_song.id)
        
        # Build response
        song_dict = self._build_song_response(db_song, current_user)
        
        # Log activity and check achievements
        self._log_song_creation(db_song, current_user)
        self._check_creation_achievements(db_song, current_user)
        
        return SongOut(**song_dict)
    
    def get_filtered_songs(
        self,
        current_user: User,
        status: Optional[SongStatus] = None,
        query: Optional[str] = None,
        pack_id: Optional[int] = None,
        completion_threshold: Optional[int] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[SongOut]:
        """Get filtered songs with proper access control and formatting."""
        songs = self.song_repo.get_filtered_songs(
            current_user.id, status, query, pack_id, completion_threshold, order, limit
        )
        
        # Handle pack and series data efficiently
        pack_map = self._get_pack_map(songs)
        series_map = self._get_series_map(songs)
        
        results = []
        for song in songs:
            song_dict = self._build_song_response(song, current_user, pack_map, series_map)
            results.append(SongOut(**song_dict))
        
        return results
    
    def update_song(self, song_id: int, updates: Dict[str, Any], current_user: User) -> SongOut:
        """Update a song with proper validation and access control."""
        song = self.song_repo.get_song_by_id(song_id)
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        
        # Check access permissions
        if not self.song_repo.check_song_access(song_id, current_user.id):
            raise HTTPException(status_code=403, detail="You don't have permission to edit this song")
        
        # Handle collaborations update
        if "collaborations" in updates:
            self._update_song_collaborations(song_id, updates["collaborations"], current_user)
            del updates["collaborations"]
        
        # Handle pack name changes
        if "pack" in updates:
            self._handle_pack_name_change(song, updates["pack"], current_user)
            del updates["pack"]
        
        # Check if status is changing to Released
        old_status = song.status
        
        # Apply regular updates
        for key, value in updates.items():
            if hasattr(song, key):
                setattr(song, key, value)
        
        # Handle status changes for achievements, timestamps and collaboration notifications
        if "status" in updates:
            new_status = updates["status"]
            
            # Increment Future Plans creation counter when status changes TO "Future Plans"
            if ((isinstance(new_status, str) and new_status == "Future Plans") or new_status == SongStatus.future):
                if old_status != "Future Plans" and old_status != SongStatus.future:
                    self.achievements_repo.increment_future_creation_count(self.db, current_user.id, commit=False)
                    print(f"🎯 Incremented Future Plans creation count for user {current_user.id} (status change: {old_status} → {new_status})")
            
            # Increment WIP creation counter when status changes TO "In Progress"
            if ((isinstance(new_status, str) and new_status == "In Progress") or new_status == SongStatus.wip):
                if old_status != "In Progress" and old_status != SongStatus.wip:
                    self.achievements_repo.increment_wip_creation_count(self.db, current_user.id, commit=False)
                    print(f"🎯 Incremented WIP creation count for user {current_user.id} (status change: {old_status} → {new_status})")
            
            # Set released_at timestamp when status changes to Released
            # Handle both string and enum values
            if (isinstance(new_status, str) and new_status == "Released") or new_status == SongStatus.released:
                if old_status != "Released" and old_status != SongStatus.released:
                    song.released_at = datetime.utcnow()
                    print(f"🚀 Set released_at for song {song.id} '{song.title}' - status change from {old_status} to {new_status}")
                    
                    # Award 10 points for releasing a song
                    try:
                        self.achievements_repo.update_user_total_points(self.db, current_user.id, 10, commit=False)
                        print(f"🎯 Awarded 10 points to user {current_user.id} for releasing song '{song.title}'")
                        
                        # Create notification for the user
                        self.notification_service.create_general_notification(
                            user_id=current_user.id,
                            title="🎯 Song Released!",
                            message=f"You earned 10 points for releasing '{song.title}'"
                        )
                    except Exception as e:
                        print(f"⚠️ Failed to award release points: {e}")

                    # Notify collaborators that the song was released
                    try:
                        actor_name = getattr(current_user, "display_name", None) or current_user.username
                        message = f"{actor_name} released '{song.title}'"
                        self.notification_service.notify_song_collaborators(
                            song_id=song.id,
                            actor_user_id=current_user.id,
                            notification_type=NotificationType.COLLAB_SONG_STATUS,
                            title=f"Song released: {song.title}",
                            message=message,
                        )
                    except Exception as e:
                        print(f"⚠️ Failed to notify collaborators about release: {e}")
                        
            # Clear released_at if moving away from Released
            elif song.released_at is not None:
                if old_status == "Released" or old_status == SongStatus.released:
                    song.released_at = None
                    print(f"🔄 Cleared released_at for song {song.id} '{song.title}' - status change from {old_status} to {new_status}")
            
            # Notify collaborators about non-release status changes (e.g. Future Plans → WIP)
            try:
                # Normalize to string values for comparison / messaging
                old_status_str = old_status.value if isinstance(old_status, SongStatus) else str(old_status)
                new_status_str = new_status.value if isinstance(new_status, SongStatus) else str(new_status)
                if old_status_str != new_status_str:
                    actor_name = getattr(current_user, "display_name", None) or current_user.username
                    # Skip here if we already sent a dedicated release notification above
                    if not (new_status_str == SongStatus.released.value and (old_status_str != SongStatus.released.value)):
                        message = f"{actor_name} moved '{song.title}' to {new_status_str}"
                        self.notification_service.notify_song_collaborators(
                            song_id=song.id,
                            actor_user_id=current_user.id,
                            notification_type=NotificationType.COLLAB_SONG_STATUS,
                            title=f"Song status updated: {song.title}",
                            message=message,
                        )
            except Exception as e:
                print(f"⚠️ Failed to notify collaborators about status change: {e}")
        
        self.db.commit()
        
        # Re-fetch with relationships
        updated_song = self.song_repo.get_song_by_id(song_id)
        song_dict = self._build_song_response(updated_song, current_user)
        
        # Log activity and check achievements
        self._log_song_update(updated_song, current_user)
        self._check_update_achievements(updated_song, current_user)
        
        return SongOut(**song_dict)
    
    def delete_song(self, song_id: int, current_user: User) -> bool:
        """Delete a song with proper access control."""
        song = self.song_repo.get_song_by_id(song_id)
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        
        # Only song owner can delete (stricter than edit permissions)
        if song.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only the song owner can delete songs")
        
        success = delete_song_from_db(self.db, song_id)
        if not success:
            raise HTTPException(status_code=404, detail="Song not found")
        
        return True
    
    def create_songs_batch(self, songs_data: List[SongCreate], current_user: User) -> List[SongOut]:
        """Create multiple songs in batch with all-or-nothing transaction behavior."""
        
        # First pass: validate ALL songs before creating ANY (including duplicates)
        from api.data_access import check_song_duplicate_for_user
        from models import Song, User as UserModel
        
        validation_errors = []
        validation_warnings = []
        
        for i, song_data in enumerate(songs_data):
            song_dict = song_data.dict()
            title = song_dict.get('title', '').strip()
            artist = song_dict.get('artist', '').strip()
            
            if not title or not artist:
                continue
            
            # Check for user's own duplicates (this is an error - blocks creation)
            if check_song_duplicate_for_user(self.db, title, artist, current_user):
                validation_errors.append(f"Song '{title}' by {artist} already exists in your database")
                continue
            
            # Check for released songs by other users (this is a warning - inform user but don't block)
            released_songs = self.db.query(Song, UserModel).join(
                UserModel, Song.user_id == UserModel.id
            ).filter(
                Song.title.ilike(title),
                Song.artist.ilike(artist),
                Song.user_id != current_user.id,
                Song.status == "Released"  # Only check released songs
            ).all()
            
            if released_songs:
                owners = [f"{user.display_name or user.username}" for song, user in released_songs]
                owners_str = ", ".join(owners[:3])  # Limit to first 3 owners
                if len(released_songs) > 3:
                    owners_str += f" and {len(released_songs) - 3} other(s)"
                validation_warnings.append({
                    "song": f"{title} by {artist}",
                    "message": f"Already released by {owners_str}",
                    "type": "released"
                })
        
        # If ANY song fails validation (user duplicates), fail the entire batch
        if validation_errors:
            error_detail = f"Pack creation failed - {'; '.join(validation_errors)}"
            if validation_warnings:
                # Include warnings in the error response
                error_detail += f" | Warnings: {len(validation_warnings)} song(s) already released by others"
            raise HTTPException(
                status_code=400,
                detail=error_detail
            )
        
        # Second pass: create all songs in transaction
        new_songs = []
        
        # Use a transaction to ensure all-or-nothing behavior
        try:
            for song in songs_data:
                song_data = song.dict()
                song_data["user_id"] = current_user.id
                song_with_author = SongCreate(**song_data)
                
                # CRITICAL: auto_commit=False to prevent partial commits
                new_song = create_song_in_db(self.db, song_with_author, current_user, auto_enhance=True, auto_commit=False)
                new_songs.append(new_song)
            
            # If we get here, all songs were created successfully - commit the transaction
            self.db.commit()
            
        except Exception as e:
            # Rollback the entire transaction if any song creation fails
            self.db.rollback()
            raise HTTPException(
                status_code=400,
                detail=f"Pack creation failed: {str(e)}"
            )
        
        # Get songs with relationships
        song_ids = [song.id for song in new_songs]
        songs_with_relations = self.song_repo.get_songs_with_relations(song_ids)
        
        # Build responses
        results = []
        series_map = self._get_series_map(songs_with_relations)
        
        for song in songs_with_relations:
            song_dict = self._build_song_response(song, current_user, series_map=series_map)
            results.append(SongOut(**song_dict))
        
        # Check achievements for batch creation
        try:
            check_status_achievements(self.db, current_user.id)
        except Exception as e:
            print(f"⚠️ Failed to check achievements: {e}")
        
        return results
    
    def release_pack(self, pack_name: str, current_user: User) -> Dict[str, Any]:
        """Release a pack, handling optional songs."""
        if "Optional Songs" in pack_name:
            raise HTTPException(
                status_code=400,
                detail="Cannot release Optional Songs packs - these should remain in Future Plans"
            )
        
        # Find and validate pack access
        pack = self._get_pack_with_edit_permission(pack_name, current_user)
        
        # Get all songs in pack
        songs = self.song_repo.get_songs_by_pack_id(pack.id)
        
        # Separate songs by optional flag
        completed_songs, optional_songs = self._separate_songs_by_optional(songs)
        
        # Release completed songs
        self._release_completed_songs(completed_songs, actor=current_user)
        
        # Handle optional songs
        optional_pack_id = None
        if optional_songs:
            optional_pack_id = self._handle_optional_songs(optional_songs, pack, current_user)
        
        # Update pack status and create series
        self._finalize_pack_release(pack, songs)
        
        return {
            "message": f"Pack '{pack_name}' released successfully",
            "completed_songs": len(completed_songs),
            "optional_songs": len(optional_songs),
            "optional_pack_id": optional_pack_id
        }
    
    def bulk_delete_songs(self, song_ids: List[int], current_user: User) -> Dict[str, str]:
        """Delete multiple songs owned by the current user."""
        # Verify ownership
        user_songs = self.song_repo.get_user_owned_songs(current_user.id, song_ids)
        if len(user_songs) != len(song_ids):
            raise HTTPException(status_code=404, detail="Some songs not found or not owned by user")
        
        # Delete all songs
        for song_id in song_ids:
            delete_song_from_db(self.db, song_id)
        
        return {"message": f"Deleted {len(song_ids)} songs"}
    
    def add_song_collaborations(
        self,
        song_id: int,
        collaborations_data: List[Dict[str, str]],
        current_user: User
    ) -> Dict[str, str]:
        """Add collaborations to a song."""
        song = self.song_repo.get_song_by_id(song_id)
        if not song:
            raise HTTPException(status_code=404, detail="Song not found")
        
        # Check access permissions
        if not self.song_repo.check_song_access(song_id, current_user.id):
            raise HTTPException(status_code=403, detail="You don't have permission to edit this song")
        
        # Clear existing collaborations
        self.collab_repo.delete_song_collaborations(song_id)
        
        # Add new collaborations
        for collab_data in collaborations_data:
            author = collab_data.get("author")
            if not author:
                continue
            
            collaborator_user = self.collab_repo.get_user_by_username(author)
            if collaborator_user and collaborator_user.id != current_user.id:
                self.collab_repo.create_collaboration(
                    user_id=collaborator_user.id,
                    collaboration_type=CollaborationType.SONG_EDIT,
                    song_id=song_id
                )
        
        return {"message": "Collaborations updated successfully"}
    
    def get_autocomplete_suggestions(self, suggestion_type: str, query: str, current_user: User) -> List[str]:
        """Get autocomplete suggestions for various fields."""
        query = query.strip()
        if not query:
            return []
        
        if suggestion_type == "artists":
            exact = self.song_repo.get_user_artists_exact_match(current_user.id, query)
            partial = self.song_repo.get_user_artists_partial_match(current_user.id, query)
        elif suggestion_type == "albums":
            exact = self.song_repo.get_user_albums_exact_match(current_user.id, query)
            partial = self.song_repo.get_user_albums_partial_match(current_user.id, query)
        elif suggestion_type == "packs":
            exact = self.song_repo.get_user_packs_exact_match(current_user.id, query)
            partial = self.song_repo.get_user_packs_partial_match(current_user.id, query)
        elif suggestion_type == "collaborators":
            return self.song_repo.get_collaborators_autocomplete(current_user.id, query)
        else:
            return []
        
        # Combine exact and partial matches, removing duplicates
        return exact + partial
    
    def get_all_artists(self) -> List[str]:
        """Get all unique artist names."""
        return self.song_repo.get_all_artists()
    
    def debug_songs(self, current_user: User) -> Dict[str, Any]:
        """Debug endpoint to show song visibility."""
        all_songs = self.song_repo.get_all_songs()
        user_collaborations = self.song_repo.get_user_collaborations(current_user.id)
        visible_songs = self.song_repo.get_visible_songs_for_debug(current_user.id)
        
        return {
            "total_songs": len(all_songs),
            "user_collaborations": len(user_collaborations),
            "visible_songs": len(visible_songs),
            "user_id": current_user.id,
            "username": current_user.username
        }
    
    # Private helper methods
    def _handle_pack_assignment(self, song_data: Dict[str, Any], current_user: User):
        """Handle pack creation/assignment logic."""
        if song_data.get('pack') and not song_data.get('pack_id'):
            pack_name = song_data['pack']
            existing_pack = self.song_repo.get_pack_by_name_and_user(pack_name, current_user.id)
            
            if existing_pack:
                # Set status based on existing pack songs
                pack_status = self.song_repo.get_pack_most_common_status(existing_pack.id)
                if pack_status:
                    song_data['status'] = pack_status
                song_data['pack_id'] = existing_pack.id
                song_data.pop('pack', None)
        elif song_data.get('pack_id'):
            # Override status with pack's common status
            pack_status = self.song_repo.get_pack_most_common_status(song_data['pack_id'])
            if pack_status:
                song_data['status'] = pack_status
    
    def _clean_song_data(self, song_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean song data to only include valid Song model fields."""
        valid_fields = {'title', 'artist', 'album', 'pack_id', 'status', 'year', 'album_cover', 'optional'}
        cleaned = {k: v for k, v in song_data.items() if k in valid_fields}
        
        # Keep pack name for create_song_in_db if needed
        if song_data.get('pack') and not song_data.get('pack_id'):
            cleaned['pack'] = song_data['pack']
        
        return cleaned
    
    def _build_song_response(
        self,
        song: Song,
        current_user: User,
        pack_map: Optional[Dict[int, Pack]] = None,
        series_map: Optional[Dict[int, AlbumSeries]] = None
    ) -> Dict[str, Any]:
        """Build a complete song response dictionary."""
        song_dict = song.__dict__.copy()
        
        # Clean up empty string values that should be None
        if song_dict.get("album_series_id") == "":
            song_dict["album_series_id"] = None
        
        # Set basic fields
        song_dict["author"] = song.user.username if song.user else None
        song_dict["artist_image_url"] = song.artist_obj.image_url if song.artist_obj else None
        song_dict["is_public"] = getattr(song, "is_public", False)
        
        # Add collaborations
        song_dict["collaborations"] = self._build_collaboration_data(song)
        
        # Add album series data
        self._add_series_data(song_dict, song, series_map)
        
        # Add pack data
        self._add_pack_data(song_dict, song, pack_map)
        
        # Add access control information
        self._add_access_control_data(song_dict, song, current_user)
        
        # Ensure timestamp formatting
        if song.created_at:
            song_dict["created_at"] = song.created_at
        if hasattr(song, 'updated_at') and song.updated_at:
            song_dict["updated_at"] = song.updated_at
        
        return song_dict
    
    def _build_collaboration_data(self, song: Song) -> List[Dict[str, Any]]:
        """Build collaboration data for a song."""
        if not hasattr(song, "collaborations"):
            return []
        
        collaborations = []
        for collab in song.collaborations:
            collab_dict = {
                "id": collab.id,
                "user_id": collab.user_id,
                "username": collab.user.username,
                "collaboration_type": collab.collaboration_type.value,
                "created_at": collab.created_at
            }
            collaborations.append(collab_dict)
        return collaborations
    
    def _add_series_data(self, song_dict: Dict[str, Any], song: Song, series_map: Optional[Dict[int, AlbumSeries]]):
        """Add album series data to song dict."""
        series_id = getattr(song, "album_series_id", None)
        if series_id:
            series = None
            if series_map:
                series = series_map.get(series_id)
            else:
                series = self.song_repo.get_album_series_by_id(series_id)
            
            if series:
                song_dict["album_series_id"] = series.id
                song_dict["album_series_number"] = series.series_number
                song_dict["album_series_name"] = series.album_name
    
    def _add_pack_data(self, song_dict: Dict[str, Any], song: Song, pack_map: Optional[Dict[int, Pack]]):
        """Add pack data to song dict."""
        if song.pack_obj:
            pack = pack_map.get(song.pack_obj.id) if pack_map else song.pack_obj
            song_dict["pack_id"] = pack.id
            song_dict["pack_name"] = pack.name
            song_dict["pack_priority"] = pack.priority
            song_dict["pack_owner_id"] = pack.user_id
            song_dict["pack_owner_username"] = pack.user.username if pack.user else None
    
    def _add_access_control_data(self, song_dict: Dict[str, Any], song: Song, current_user: User):
        """Add access control information to song dict."""
        is_owner = song.user_id == current_user.id
        is_song_collaborator = self.collab_repo.collaboration_exists(
            current_user.id, CollaborationType.SONG_EDIT, song_id=song.id
        )
        has_pack_edit = song.pack_id and self.collab_repo.collaboration_exists(
            current_user.id, CollaborationType.PACK_EDIT, pack_id=song.pack_id
        )
        has_pack_collaboration = song.pack_id and (
            self.collab_repo.collaboration_exists(
                current_user.id, CollaborationType.PACK_VIEW, pack_id=song.pack_id
            ) or has_pack_edit
        )
        
        song_dict["is_editable"] = is_owner or is_song_collaborator or has_pack_edit
        
        if has_pack_edit:
            song_dict["pack_collaboration"] = {"can_edit": True, "pack_id": song.pack_id}
        elif has_pack_collaboration:
            song_dict["pack_collaboration"] = {"can_edit": False, "pack_id": song.pack_id}
    
    def _get_pack_map(self, songs: List[Song]) -> Dict[int, Pack]:
        """Get pack data for multiple songs efficiently."""
        pack_ids = list({s.pack_id for s in songs if s.pack_id})
        return self.pack_repo.get_packs_by_ids(pack_ids) if pack_ids else {}
    
    def _get_series_map(self, songs: List[Song]) -> Dict[int, AlbumSeries]:
        """Get series data for multiple songs efficiently."""
        series_ids = list({getattr(s, "album_series_id", None) for s in songs if getattr(s, "album_series_id", None)})
        if series_ids:
            series_list = self.song_repo.get_album_series_by_ids(series_ids)
            return {s.id: s for s in series_list}
        return {}
    
    def _log_song_creation(self, song: Song, current_user: User):
        """Log song creation activity."""
        try:
            log_activity(
                db=self.db,
                user_id=current_user.id,
                activity_type="create_song",
                description=f"{current_user.username} has created a new song: {song.title} by {song.artist}",
                metadata={
                    "song_id": song.id,
                    "title": song.title,
                    "artist": song.artist,
                    "status": song.status.value if hasattr(song.status, 'value') else str(song.status)
                }
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log create_song activity: {log_err}")
    
    def _log_song_update(self, song: Song, current_user: User):
        """Log song update activity."""
        try:
            log_activity(
                db=self.db,
                user_id=current_user.id,
                activity_type="update_song",
                description=f"{current_user.username} updated song: {song.title} by {song.artist}",
                metadata={
                    "song_id": song.id,
                    "title": song.title,
                    "artist": song.artist,
                    "status": song.status.value if hasattr(song.status, 'value') else str(song.status)
                }
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log update_song activity: {log_err}")
    
    def _check_creation_achievements(self, song: Song, current_user: User):
        """Check achievements after song creation."""
        try:
            # Note: Creation counters are already incremented in create_song_in_db,
            # so we only need to check achievements here, not increment counters again.
            
            check_status_achievements(self.db, current_user.id)
            if song.status == SongStatus.released:
                check_wip_completion_achievements(self.db, current_user.id)
                check_diversity_achievements(self.db, current_user.id)
        except Exception as ach_err:
            print(f"⚠️ Failed to check achievements: {ach_err}")
    
    def _check_update_achievements(self, song: Song, current_user: User):
        """Check achievements after song update."""
        try:
            check_status_achievements(self.db, current_user.id)
            if song.status == SongStatus.released:
                check_wip_completion_achievements(self.db, current_user.id)
            
            # Check public WIP achievements when making a WIP song public
            if song.status == SongStatus.wip and song.is_public:
                from api.achievements import check_public_wip_achievements
                check_public_wip_achievements(self.db, current_user.id)
        except Exception as ach_err:
            print(f"⚠️ Failed to check achievements: {ach_err}")
    
    def _update_song_collaborations(self, song_id: int, collaborations: List[str], current_user: User):
        """Update song collaborations."""
        # Delete existing collaborations
        self.collab_repo.delete_song_collaborations(song_id)
        
        # Add new collaborations
        for author in collaborations:
            if not author:
                continue
            collaborator_user = self.collab_repo.get_user_by_username(author)
            if collaborator_user and collaborator_user.id != current_user.id:
                self.collab_repo.create_collaboration(
                    user_id=collaborator_user.id,
                    collaboration_type=CollaborationType.SONG_EDIT,
                    song_id=song_id
                )
    
    def _handle_pack_name_change(self, song: Song, pack_name: str, current_user: User):
        """Handle pack name changes."""
        existing_pack = self.pack_repo.get_pack_by_name_and_user(pack_name, current_user.id)
        if existing_pack:
            song.pack_id = existing_pack.id
        else:
            # Create new pack
            new_pack = self.pack_repo.create_pack(pack_name, current_user.id)
            song.pack_id = new_pack.id
    
    def _get_pack_with_edit_permission(self, pack_name: str, current_user: User) -> Pack:
        """Get pack and verify edit permission."""
        pack = self.pack_repo.get_pack_by_name_and_user(pack_name, current_user.id)
        
        if not pack:
            pack = self.pack_repo.get_pack_by_name(pack_name)
            if not pack:
                raise HTTPException(status_code=404, detail="Pack not found")
            
            if not self.pack_repo.has_pack_edit_permission(pack.id, current_user.id):
                raise HTTPException(status_code=403, detail="You don't have permission to release this pack")
        
        return pack
    
    def _separate_songs_by_optional(self, songs: List[Song]) -> Tuple[List[Song], List[Song]]:
        """Separate songs into completed and optional lists."""
        completed_songs = []
        optional_songs = []
        
        for song in songs:
            if getattr(song, 'optional', False):
                optional_songs.append(song)
            else:
                completed_songs.append(song)
        
        return completed_songs, optional_songs
    
    def _release_completed_songs(self, completed_songs: List[Song], actor: User):
        """Release completed songs by changing their status and notifying collaborators."""
        points_awarded = 0
        released_songs = []
        
        for song in completed_songs:
            old_status = song.status
            song.status = SongStatus.released
            song.released_at = datetime.utcnow()
            
            # Award 10 points for releasing a song
            if old_status != SongStatus.released:
                try:
                    self.achievements_repo.update_user_total_points(self.db, song.user_id, 10, commit=False)
                    print(f"🎯 Awarded 10 points to user {song.user_id} for releasing song '{song.title}'")
                    points_awarded += 10
                    released_songs.append(song.title)
                except Exception as e:
                    print(f"⚠️ Failed to award release points: {e}")

                # Notify collaborators that this collaboration song was released
                try:
                    actor_name = getattr(actor, "display_name", None) or actor.username
                    message = f"{actor_name} released '{song.title}'"
                    self.notification_service.notify_song_collaborators(
                        song_id=song.id,
                        actor_user_id=actor.id,
                        notification_type=NotificationType.COLLAB_SONG_STATUS,
                        title=f"Song released: {song.title}",
                        message=message,
                    )
                except Exception as e:
                    print(f"⚠️ Failed to notify collaborators about pack song release: {e}")
        
        # Create summary notification for pack release if points were awarded
        if points_awarded > 0 and released_songs:
            try:
                # Get the user_id from the first song (all songs should belong to the same user for pack release)
                user_id = completed_songs[0].user_id
                song_count = len(released_songs)
                
                if song_count == 1:
                    message = f"You earned {points_awarded} points for releasing '{released_songs[0]}'"
                else:
                    message = f"You earned {points_awarded} points for releasing {song_count} songs"
                    
                self.notification_service.create_general_notification(
                    user_id=user_id,
                    title="🎉 Pack Released!",
                    message=message
                )
            except Exception as e:
                print(f"⚠️ Failed to create pack release notification: {e}")
                
        self.db.commit()
    
    def _handle_optional_songs(self, optional_songs: List[Song], pack: Pack, current_user: User) -> int:
        """Handle optional songs by moving them to a new pack."""
        optional_pack_name = f"{pack.name} Optional Songs"
        
        # Check if optional pack already exists
        existing_optional_pack = self.pack_repo.get_pack_by_name_and_user(optional_pack_name, pack.user_id)
        
        if existing_optional_pack:
            optional_pack = existing_optional_pack
        else:
            optional_pack = self.pack_repo.create_pack(
                name=optional_pack_name,
                user_id=pack.user_id
            )
        
        # Move optional songs to the optional pack and set status to future_plans
        for song in optional_songs:
            song.pack_id = optional_pack.id
            song.status = SongStatus.future_plans
        
        self.db.commit()
        return optional_pack.id
    
    def _finalize_pack_release(self, pack: Pack, songs: List[Song]):
        """Finalize pack release by updating status and creating album series."""
        # Update pack status
        self.pack_repo.update_pack_status(pack.id, "released")
        
        # Create album series for released songs
        album_series_ids = list({getattr(s, "album_series_id", None) for s in songs if getattr(s, "album_series_id", None)})
        
        for series_id in album_series_ids:
            series = self.song_repo.get_album_series_by_id(series_id)
            if series and series.status != "released":
                max_series_number = self.song_repo.get_max_series_number()
                new_series_number = (max_series_number or 0) + 1
                series.series_number = new_series_number
                series.status = "released"
        
        self.db.commit()