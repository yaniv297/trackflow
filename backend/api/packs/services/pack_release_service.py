"""Pack release service for handling pack releases."""

from typing import Dict
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import Song, Pack, AlbumSeries, Collaboration, CollaborationType
from ..repositories.pack_repository import PackRepository
from ..schemas import PackReleaseData, PackResponse
from api.songs.repositories.collaboration_repository import CollaborationRepository


class PackReleaseService:
    """Service for pack release functionality."""
    
    def __init__(self, db: Session):
        self.db = db
        self.pack_repo = PackRepository(db)
        self.collab_repo = CollaborationRepository(db)
    
    def release_pack(self, pack_id: int, release_data: PackReleaseData, user_id: int) -> PackResponse:
        """Release a pack with metadata."""
        # Get pack with ownership validation
        pack = self.pack_repo.get_by_id(pack_id)
        if not pack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pack not found"
            )
        
        # Check if user is pack owner (by pack.user_id OR by owning any songs in the pack)
        # This matches the frontend logic which considers a user a pack owner if they own any songs
        is_pack_owner_by_id = pack.user_id == user_id
        
        # Check if user owns any songs in the pack
        all_songs_in_pack = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        user_owned_songs = self.db.query(Song).filter(
            Song.pack_id == pack_id,
            Song.user_id == user_id
        ).all()
        owns_any_songs = len(user_owned_songs) > 0
        is_owner = is_pack_owner_by_id or owns_any_songs
        
        # Check for pack edit collaboration permission
        has_edit_permission = self.collab_repo.collaboration_exists(
            user_id=user_id,
            collaboration_type=CollaborationType.PACK_EDIT,
            pack_id=pack_id
        )
        
        # Check if user has song-level collaborations on any songs in the pack
        # (song-level collaborations have song_id set, not pack_id)
        song_ids_in_pack = [s.id for s in all_songs_in_pack]
        has_song_collaborations = False
        if song_ids_in_pack:
            song_collabs_count = self.db.query(Collaboration).filter(
                Collaboration.song_id.in_(song_ids_in_pack),
                Collaboration.user_id == user_id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            ).count()
            has_song_collaborations = song_collabs_count > 0
        
        if not is_owner and not has_edit_permission and not has_song_collaborations:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this pack"
            )
        
        # Update pack release information
        update_data = {
            'release_title': release_data.title,
            'release_description': release_data.description,
            'release_download_link': release_data.download_link,
            'release_youtube_url': release_data.youtube_url
        }
        
        # Handle homepage visibility - simple logic: default to True unless explicitly hidden
        # Frontend sends show_on_homepage: !hideFromHomepage, so we use that directly
        # If user explicitly checked "hide from homepage", set to False, otherwise True
        if release_data.hide_from_homepage is True:
            # User explicitly checked "hide from homepage"
            update_data['show_on_homepage'] = False
        else:
            update_data['show_on_homepage'] = True
        
        # Only set released_at timestamp if pack hasn't been released yet (preserve original release date)
        if not pack.released_at:
            update_data['released_at'] = datetime.utcnow()
            update_data['released_by_user_id'] = user_id  # Track who released the pack
        # If pack is already released, preserve the original released_at timestamp
        
        self.pack_repo.update_pack(pack, update_data)
        
        # Handle song status changes
        self._release_pack_songs(pack_id, release_data, user_id)
        
        # Check if this pack is associated with an album series and release it
        album_series = self.db.query(AlbumSeries).filter(AlbumSeries.pack_id == pack_id).first()
        if album_series:
            # Only release the series if it's not already released
            if album_series.status != "released":
                try:
                    from api.album_series.services.album_series_service import AlbumSeriesService
                    album_series_service = AlbumSeriesService(self.db)
                    album_series_service.release_series(album_series.id)
                except ValueError as e:
                    # Series already released or not found - log but don't fail the pack release
                    print(f"⚠️ Could not release album series: {e}")
                except Exception as e:
                    # Log error but don't fail the pack release
                    print(f"⚠️ Error releasing album series: {e}")
        
        self.pack_repo.commit()
        
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
            release_youtube_url=pack.release_youtube_url,
            show_on_homepage=pack.show_on_homepage
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
        
        # Check if user is pack owner (by pack.user_id OR by owning any songs in the pack)
        is_pack_owner_by_id = pack.user_id == user_id
        user_owned_songs_count = self.db.query(Song).filter(
            Song.pack_id == pack_id,
            Song.user_id == user_id
        ).count()
        owns_any_songs = user_owned_songs_count > 0
        is_owner = is_pack_owner_by_id or owns_any_songs
        
        has_edit_permission = self.collab_repo.collaboration_exists(
            user_id=user_id,
            collaboration_type=CollaborationType.PACK_EDIT,
            pack_id=pack_id
        )
        
        # Check if user has song-level collaborations on any songs in the pack
        all_songs_in_pack = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        song_ids_in_pack = [s.id for s in all_songs_in_pack]
        has_song_collaborations = False
        if song_ids_in_pack:
            song_collabs_count = self.db.query(Collaboration).filter(
                Collaboration.song_id.in_(song_ids_in_pack),
                Collaboration.user_id == user_id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            ).count()
            has_song_collaborations = song_collabs_count > 0
        
        if not is_owner and not has_edit_permission and not has_song_collaborations:
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
            # IMPORTANT: Don't change show_on_homepage for existing releases
            # If a pack is already released with show_on_homepage=False, keep it hidden
        elif status in ["WIP", "Complete"]:
            # Remove released timestamp for non-released statuses
            if pack.released_at:
                update_data['released_at'] = None
            # When moving back from Released, also hide from homepage
            update_data['show_on_homepage'] = False
            
            # Handle "needs update" songs: change update_status from "future_plans" to "in_progress"
            # and reset their progress
            if status == "WIP":
                songs_with_update_status = self.db.query(Song).filter(
                    Song.pack_id == pack_id,
                    Song.update_status == "future_plans"
                ).all()
                
                for song in songs_with_update_status:
                    song.update_status = "in_progress"
                    # Reset progress tracking
                    from models import SongProgress
                    self.db.query(SongProgress).filter(SongProgress.song_id == song.id).delete()
        
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
            release_youtube_url=pack.release_youtube_url,
            show_on_homepage=pack.show_on_homepage
        )
    
    def _release_pack_songs(self, pack_id: int, release_data: PackReleaseData, user_id: int):
        """Handle song status changes during pack release (matches original logic)."""
        # Get all songs in the pack
        songs = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        
        # Release completed songs and move optional incomplete songs to "Future Plans"
        released_count = 0
        moved_count = 0
        
        # Track points and songs per user for aggregated notifications
        from collections import defaultdict
        user_releases = defaultdict(lambda: {'points': 0, 'song_count': 0})
        
        for song in songs:
            if song.status == "In Progress":
                if not song.optional:
                    # Required song must be released
                    song.status = "Released"
                    song.released_at = datetime.utcnow()
                    
                    # Clear update_status when releasing (update is complete)
                    if getattr(song, "update_status", None) is not None:
                        song.update_status = None
                    
                    # Set song download link if provided
                    if release_data.song_download_links:
                        # Handle both integer and string keys (JSON keys are strings, but Pydantic may convert them)
                        download_link = None
                        if song.id in release_data.song_download_links:
                            download_link = release_data.song_download_links[song.id]
                        elif str(song.id) in release_data.song_download_links:
                            download_link = release_data.song_download_links[str(song.id)]
                        
                        if download_link:
                            song.release_download_link = download_link
                    
                    # Award 10 points for releasing a song (but don't send notification yet)
                    try:
                        from api.achievements.repositories.achievements_repository import AchievementsRepository
                        
                        achievements_repo = AchievementsRepository()
                        achievements_repo.update_user_total_points(self.db, song.user_id, 10, commit=False)
                        
                        # Track for aggregated notification
                        user_releases[song.user_id]['points'] += 10
                        user_releases[song.user_id]['song_count'] += 1
                    except Exception as e:
                        print(f"⚠️ Failed to award release points: {e}")
                    
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
                # Note: We don't award points here because the song was already released
                # Points would have been awarded when the song was first released
                if not song.released_at:
                    song.released_at = datetime.utcnow()
                
                # Set song download link if provided
                if release_data.song_download_links:
                    # Handle both integer and string keys (JSON keys are strings, but Pydantic may convert them)
                    download_link = None
                    if song.id in release_data.song_download_links:
                        download_link = release_data.song_download_links[song.id]
                    elif str(song.id) in release_data.song_download_links:
                        download_link = release_data.song_download_links[str(song.id)]
                    
                    if download_link:
                        song.release_download_link = download_link
                        print(f"🔗 Set download link for already-released song {song.id}: {song.release_download_link}")
                
                released_count += 1
        
        # Send aggregated notifications for each user
        if user_releases:
            try:
                from api.notifications.services.notification_service import NotificationService
                notification_service = NotificationService(self.db)
                
                for release_user_id, release_info in user_releases.items():
                    points = release_info['points']
                    song_count = release_info['song_count']
                    
                    if song_count == 1:
                        message = f"You earned {points} points for releasing 1 song"
                    else:
                        message = f"You earned {points} points for releasing {song_count} songs"
                    
                    notification_service.create_general_notification(
                        user_id=release_user_id,
                        title="🎉 Pack Released!",
                        message=message
                    )
                    print(f"✅ Sent aggregated notification to user {release_user_id}: {message}")
            except Exception as e:
                print(f"⚠️ Failed to create aggregated pack release notification: {e}")
        
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