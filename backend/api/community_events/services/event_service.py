"""Service for community event business logic."""

from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from models import Pack, Song, User, CommunityEventRegistration, Notification, NotificationType
from services.completion_service import fetch_workflow_fields_map, fetch_song_progress_map
from ..schemas import (
    CommunityEventCreate,
    CommunityEventUpdate,
    CommunityEventResponse,
    EventStatus,
    ParticipationStage,
    EventParticipationStatus,
    EventOrganizerInfo,
    EventSongResponse,
    EventRegistrationResponse,
)


class EventService:
    """Service for community event operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def is_event_active(self, pack: Pack) -> bool:
        """Check if an event is still active (accepting contributions).
        
        An event is active if:
        - It's a community event
        - It has NOT been released (event_revealed_at is NULL)
        
        Note: We use event_revealed_at as the canonical "released" flag.
        Once an event is released, it's no longer active.
        """
        if not pack.is_community_event:
            return False
        # Event is released = no longer active
        if pack.event_revealed_at is not None:
            return False
        return True
    
    def is_event_revealed(self, pack: Pack) -> bool:
        """Check if event links should be visible.
        
        Links are visible only after the event has been released.
        Release = reveal, there's no separate state.
        """
        if not pack.is_community_event:
            return True
        return pack.event_revealed_at is not None
    
    def get_event_status(self, pack: Pack) -> EventStatus:
        """Get the status of an event."""
        if self.is_event_active(pack):
            return EventStatus.ACTIVE
        return EventStatus.ENDED
    
    def get_user_participation_stage(
        self,
        pack: Pack,
        user_id: int
    ) -> Tuple[ParticipationStage, Optional[Song], bool]:
        """
        Get user's participation stage in an event.
        Returns (stage, song, is_registered)
        """
        if not pack.is_community_event:
            return ParticipationStage.NOT_REGISTERED, None, False
        
        # Check if user has a song in this event
        song = self.db.query(Song).filter(
            Song.pack_id == pack.id,
            Song.user_id == user_id
        ).first()
        
        if song:
            # User has a song
            if song.is_event_submitted:
                return ParticipationStage.SUBMITTED, song, False
            
            # Check if all workflow steps are complete
            workflow_complete = self._check_workflow_complete(song)
            if workflow_complete:
                return ParticipationStage.COMPLETED, song, False
            
            return ParticipationStage.IN_PROGRESS, song, False
        
        # Check if user is registered
        registration = self.db.query(CommunityEventRegistration).filter(
            CommunityEventRegistration.pack_id == pack.id,
            CommunityEventRegistration.user_id == user_id
        ).first()
        
        if registration:
            return ParticipationStage.REGISTERED, None, True
        
        return ParticipationStage.NOT_REGISTERED, None, False
    
    def _check_workflow_complete(self, song: Song) -> bool:
        """Check if all workflow steps for the song owner's workflow are complete."""
        # Use the existing completion service helpers (raw SQL, no model issues)
        workflow_fields_map = fetch_workflow_fields_map(self.db, [song.user_id])
        workflow_fields = workflow_fields_map.get(song.user_id, [])
        
        if not workflow_fields:
            # No workflow defined - can't determine completion
            return False
        
        # Get progress for this song
        progress_map = fetch_song_progress_map(self.db, [song.id])
        song_progress = progress_map.get(song.id, {})
        
        # Check that ALL workflow fields have a completed progress entry
        for field in workflow_fields:
            if not song_progress.get(field, False):
                return False
        
        return True
    
    def get_event_stats(self, pack_id: int) -> dict:
        """Get event statistics (optimized to minimize queries)."""
        # Get all songs in the event
        songs = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        songs_count = len(songs)
        
        # Get user IDs who have songs
        users_with_songs = set(song.user_id for song in songs)
        
        # Count registrations only for users who DON'T have songs yet
        all_registrations = self.db.query(CommunityEventRegistration).filter(
            CommunityEventRegistration.pack_id == pack_id
        ).all()
        registered_count = sum(1 for reg in all_registrations if reg.user_id not in users_with_songs)
        
        # Batch load all song progress in ONE query instead of per-song
        song_ids = [song.id for song in songs]
        workflow_complete_map = {}
        
        if song_ids:
            # Get all users' workflows at once using the completion service helper
            owner_ids = list(set(song.user_id for song in songs))
            workflow_fields_by_user = fetch_workflow_fields_map(self.db, owner_ids)
            
            # Get all progress records for all songs at once
            progress_by_song = fetch_song_progress_map(self.db, song_ids)
            
            # Check completion for each song using its owner's workflow
            for song in songs:
                workflow_fields = workflow_fields_by_user.get(song.user_id, [])
                if not workflow_fields:
                    # No workflow defined for this user - can't determine completion
                    workflow_complete_map[song.id] = False
                    continue
                
                song_progress = progress_by_song.get(song.id, {})
                
                # Check if all workflow fields are complete
                all_complete = all(
                    song_progress.get(field, False)
                    for field in workflow_fields
                )
                workflow_complete_map[song.id] = all_complete
        
        # Count songs by status
        submitted_count = 0
        done_count = 0
        in_progress_count = 0
        
        for song in songs:
            if song.is_event_submitted:
                submitted_count += 1
            elif workflow_complete_map.get(song.id, False):
                done_count += 1
            else:
                in_progress_count += 1
        
        # Total participants = those with songs + those just registered (no overlap)
        participants_count = songs_count + registered_count
        
        return {
            "registered_count": registered_count,
            "songs_count": songs_count,
            "in_progress_count": in_progress_count,
            "done_count": done_count,
            "submitted_count": submitted_count,
            "participants_count": participants_count,
        }
    
    def create_event(
        self,
        event_data: CommunityEventCreate,
        organizer_id: int
    ) -> Pack:
        """Create a new community event."""
        pack = Pack(
            name=event_data.name,
            user_id=organizer_id,  # Organizer owns the pack
            is_community_event=True,
            event_theme=event_data.event_theme,
            event_description=event_data.event_description,
            event_banner_url=event_data.event_banner_url,
            rv_release_time=event_data.rv_release_time,  # The only canonical deadline (CET)
            event_organizer_id=organizer_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        self.db.add(pack)
        self.db.commit()
        self.db.refresh(pack)
        
        return pack
    
    def update_event(
        self,
        pack_id: int,
        event_data: CommunityEventUpdate
    ) -> Optional[Pack]:
        """Update a community event."""
        pack = self.db.query(Pack).filter(
            Pack.id == pack_id,
            Pack.is_community_event == True
        ).first()
        
        if not pack:
            return None
        
        update_data = event_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(pack, field):
                setattr(pack, field, value)
        
        pack.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(pack)
        
        return pack
    
    def release_event(self, pack_id: int) -> Optional[Pack]:
        """Release a community event pack.
        
        This single action:
        1. Reveals all links (RhythmVerse, visualizer, preview)
        2. Marks all songs as "Released" status
        3. Ends the event (no more submissions)
        4. Removes from WIP page / active events
        5. Moves to Past Events archive
        
        There is no separate "reveal links" action - release does everything.
        """
        pack = self.db.query(Pack).filter(
            Pack.id == pack_id,
            Pack.is_community_event == True
        ).first()
        
        if not pack:
            return None
        
        # Already released?
        if pack.event_revealed_at is not None:
            return pack
        
        now = datetime.utcnow()
        
        # 1. Mark event as released/revealed
        pack.event_revealed_at = now
        pack.updated_at = now
        
        # 2. Update all songs in this event to "Released" status
        songs = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        for song in songs:
            song.status = "Released"
            song.released_at = now
            song.updated_at = now
        
        self.db.commit()
        self.db.refresh(pack)
        
        return pack
    
    def unreleased_event(self, pack_id: int) -> Optional[Pack]:
        """Revert an event from released state back to active (for data repair).
        
        This allows fixing events that were accidentally released or
        are in a limbo state.
        """
        pack = self.db.query(Pack).filter(
            Pack.id == pack_id,
            Pack.is_community_event == True
        ).first()
        
        if not pack:
            return None
        
        now = datetime.utcnow()
        
        # Clear the revealed_at to make it active again
        pack.event_revealed_at = None
        pack.updated_at = now
        
        # Revert all songs back to "In Progress" status
        songs = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        for song in songs:
            song.status = "In Progress"
            song.released_at = None
            song.updated_at = now
        
        self.db.commit()
        self.db.refresh(pack)
        
        return pack
    
    def delete_event(self, pack_id: int) -> bool:
        """Delete a community event."""
        pack = self.db.query(Pack).filter(
            Pack.id == pack_id,
            Pack.is_community_event == True
        ).first()
        
        if not pack:
            return False
        
        # Delete registrations first
        self.db.query(CommunityEventRegistration).filter(
            CommunityEventRegistration.pack_id == pack_id
        ).delete()
        
        # Delete the pack (songs will need to be handled separately or cascaded)
        self.db.delete(pack)
        self.db.commit()
        
        return True
    
    def get_all_events(self, include_ended: bool = True) -> List[Pack]:
        """Get all community events."""
        query = self.db.query(Pack).filter(Pack.is_community_event == True)
        
        if not include_ended:
            # Only show events that haven't been released
            # Released events have event_revealed_at set
            query = query.filter(Pack.event_revealed_at.is_(None))
        
        return query.order_by(Pack.created_at.desc()).all()
    
    def get_active_events(self) -> List[Pack]:
        """Get only active community events (not released)."""
        return self.get_all_events(include_ended=False)
    
    def get_featured_event(self) -> Optional[Pack]:
        """Get a featured event for homepage display.
        
        Returns an event that is either:
        - Active (not yet released), OR
        - Released within the last 7 days
        
        Priority: active events first, then recently released.
        """
        from datetime import timedelta
        
        # First try to find an active event
        active_events = self.get_active_events()
        if active_events:
            return active_events[0]
        
        # Otherwise, find a recently released event (within 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        recently_released = self.db.query(Pack).filter(
            Pack.is_community_event == True,
            Pack.event_revealed_at.isnot(None),
            Pack.event_revealed_at >= seven_days_ago
        ).order_by(Pack.event_revealed_at.desc()).first()
        
        return recently_released
    
    def get_event_by_id(self, pack_id: int) -> Optional[Pack]:
        """Get a community event by ID."""
        return self.db.query(Pack).filter(
            Pack.id == pack_id,
            Pack.is_community_event == True
        ).first()
    
    def build_event_response(
        self,
        pack: Pack,
        current_user_id: Optional[int] = None,
        include_participation: bool = True
    ) -> CommunityEventResponse:
        """Build a full event response."""
        stats = self.get_event_stats(pack.id)
        
        # Get organizer info
        organizer = None
        if pack.event_organizer_id:
            org_user = self.db.query(User).filter(User.id == pack.event_organizer_id).first()
            if org_user:
                organizer = EventOrganizerInfo(
                    id=org_user.id,
                    username=org_user.username,
                    display_name=org_user.display_name
                )
        
        # Get participation status if user is authenticated
        participation = None
        if include_participation and current_user_id:
            stage, song, is_registered = self.get_user_participation_stage(pack, current_user_id)
            
            song_response = None
            if song:
                song_response = self._build_song_response(song, pack, is_owner=True)
            
            workflow_complete = self._check_workflow_complete(song) if song else False
            
            participation = EventParticipationStatus(
                stage=stage,
                is_registered=is_registered,
                has_song=song is not None,
                song=song_response,
                workflow_complete=workflow_complete,
                can_submit=workflow_complete and not (song.is_event_submitted if song else False)
            )
        
        return CommunityEventResponse(
            id=pack.id,
            name=pack.name,
            event_theme=pack.event_theme,
            event_description=pack.event_description,
            event_banner_url=pack.event_banner_url,
            event_end_date=pack.event_end_date,
            rv_release_time=pack.rv_release_time,
            event_revealed_at=pack.event_revealed_at,
            created_at=pack.created_at,
            updated_at=pack.updated_at,
            status=self.get_event_status(pack),
            is_revealed=self.is_event_revealed(pack),
            organizer=organizer,
            participants_count=stats["participants_count"],
            songs_count=stats["songs_count"],
            in_progress_count=stats["in_progress_count"],
            done_count=stats["done_count"],
            submitted_count=stats["submitted_count"],
            registered_count=stats["registered_count"],
            participation=participation,
        )
    
    def _build_song_response(
        self,
        song: Song,
        pack: Pack,
        is_owner: bool = False,
        user_map: Optional[dict] = None,
        workflow_complete_map: Optional[dict] = None
    ) -> EventSongResponse:
        """Build a song response for event display.
        
        Args:
            song: The song to build response for
            pack: The event pack
            is_owner: Whether current user owns this song
            user_map: Optional pre-loaded user map {user_id: User} to avoid N+1 queries
            workflow_complete_map: Optional pre-loaded map {song_id: bool} for workflow completion
        """
        # Get user from pre-loaded map or query
        if user_map is not None:
            user = user_map.get(song.user_id)
        else:
            user = self.db.query(User).filter(User.id == song.user_id).first()
        
        # Determine display status
        if song.is_event_submitted:
            status = "Uploaded"
        elif workflow_complete_map is not None:
            status = "Done" if workflow_complete_map.get(song.id, False) else "In Progress"
        elif self._check_workflow_complete(song):
            status = "Done"
        else:
            status = "In Progress"
        
        # Only include links if event is revealed OR this is the owner
        is_revealed = self.is_event_revealed(pack)
        include_links = is_revealed or is_owner
        
        return EventSongResponse(
            id=song.id,
            title=song.title,
            artist=song.artist,
            album=song.album,
            album_cover=song.album_cover,
            user_id=song.user_id,
            username=user.username if user else "Unknown",
            display_name=user.display_name if user else None,
            status=status,
            is_event_submitted=song.is_event_submitted,
            rhythmverse_link=song.rhythmverse_link if include_links else None,
            event_submission_description=song.event_submission_description if include_links else None,
            visualizer_link=song.visualizer_link if include_links else None,
            preview_link=song.preview_link if include_links else None,
        )
    
    def get_event_songs(
        self,
        pack_id: int,
        current_user_id: Optional[int] = None
    ) -> List[EventSongResponse]:
        """Get all songs in an event with appropriate visibility."""
        pack = self.get_event_by_id(pack_id)
        if not pack:
            return []
        
        songs = self.db.query(Song).filter(Song.pack_id == pack_id).all()
        
        if not songs:
            return []
        
        # Batch load all users in ONE query
        user_ids = list(set(song.user_id for song in songs))
        users = self.db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {user.id: user for user in users}
        
        # Batch load workflow completion status in ONE query
        song_ids = [song.id for song in songs]
        owner_ids = list(set(song.user_id for song in songs))
        workflow_fields_by_user = fetch_workflow_fields_map(self.db, owner_ids)
        progress_by_song = fetch_song_progress_map(self.db, song_ids)
        
        # Build completion map
        workflow_complete_map = {}
        for song in songs:
            workflow_fields = workflow_fields_by_user.get(song.user_id, [])
            if not workflow_fields:
                workflow_complete_map[song.id] = False
            else:
                song_progress = progress_by_song.get(song.id, {})
                workflow_complete_map[song.id] = all(
                    song_progress.get(field, False) for field in workflow_fields
                )
        
        return [
            self._build_song_response(
                song, pack,
                is_owner=(song.user_id == current_user_id),
                user_map=user_map,
                workflow_complete_map=workflow_complete_map
            )
            for song in songs
        ]
    
    def get_event_registrations(self, pack_id: int) -> List[EventRegistrationResponse]:
        """Get all registrations for an event (excluding users who already have songs)."""
        registrations = self.db.query(CommunityEventRegistration).filter(
            CommunityEventRegistration.pack_id == pack_id
        ).all()
        
        if not registrations:
            return []
        
        # Get user IDs who already have songs in the event
        users_with_songs = set(
            song.user_id for song in 
            self.db.query(Song.user_id).filter(Song.pack_id == pack_id).all()
        )
        
        # Filter registrations to only those without songs
        reg_user_ids = [reg.user_id for reg in registrations if reg.user_id not in users_with_songs]
        
        if not reg_user_ids:
            return []
        
        # Batch load all users in ONE query
        users = self.db.query(User).filter(User.id.in_(reg_user_ids)).all()
        user_map = {user.id: user for user in users}
        
        result = []
        for reg in registrations:
            # Skip users who already have a song
            if reg.user_id in users_with_songs:
                continue
            
            user = user_map.get(reg.user_id)
            if user:
                result.append(EventRegistrationResponse(
                    id=reg.id,
                    user_id=reg.user_id,
                    username=user.username,
                    display_name=user.display_name,
                    registered_at=reg.registered_at,
                ))
        
        return result
    
    def broadcast_event_notification(self, pack: Pack) -> int:
        """Broadcast notification to all users about new event."""
        users = self.db.query(User).filter(User.is_active == True).all()
        
        count = 0
        for user in users:
            notification = Notification(
                user_id=user.id,
                type=NotificationType.COMMUNITY_EVENT_STARTED.value,
                title=f"New Community Event: {pack.event_theme}",
                message=pack.event_description or f"A new community event '{pack.name}' has started! Head to the WIP page to participate.",
                is_read=False,
                created_at=datetime.utcnow(),
            )
            self.db.add(notification)
            count += 1
        
        self.db.commit()
        return count

