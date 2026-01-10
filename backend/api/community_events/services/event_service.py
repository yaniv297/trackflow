"""Service for community event business logic."""

from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func

from models import Pack, Song, User, CommunityEventRegistration, SongProgress, Notification, NotificationType
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
        """Check if an event is still active (accepting contributions)."""
        if not pack.is_community_event:
            return False
        if pack.event_end_date is None:
            return True
        return pack.event_end_date > datetime.utcnow()
    
    def is_event_revealed(self, pack: Pack) -> bool:
        """Check if event links should be visible."""
        if not pack.is_community_event:
            return True
        if pack.event_revealed_at is not None:
            return True
        if pack.event_end_date is not None and pack.event_end_date <= datetime.utcnow():
            return True
        return False
    
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
        """Check if all non-irrelevant workflow steps are complete."""
        progress = self.db.query(SongProgress).filter(
            SongProgress.song_id == song.id
        ).all()
        
        if not progress:
            return False
        
        for step in progress:
            # Skip steps marked as irrelevant (N/A)
            if hasattr(step, 'is_irrelevant') and step.is_irrelevant:
                continue
            if not step.is_completed:
                return False
        
        return True
    
    def get_event_stats(self, pack_id: int) -> dict:
        """Get event statistics."""
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
        
        # Count songs by status
        submitted_count = 0
        done_count = 0
        in_progress_count = 0
        
        for song in songs:
            if song.is_event_submitted:
                submitted_count += 1
            elif self._check_workflow_complete(song):
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
            event_end_date=event_data.event_end_date,
            rv_release_time=event_data.rv_release_time,
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
    
    def reveal_event(self, pack_id: int) -> Optional[Pack]:
        """Manually reveal event links."""
        pack = self.db.query(Pack).filter(
            Pack.id == pack_id,
            Pack.is_community_event == True
        ).first()
        
        if not pack:
            return None
        
        pack.event_revealed_at = datetime.utcnow()
        pack.updated_at = datetime.utcnow()
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
            query = query.filter(
                or_(
                    Pack.event_end_date.is_(None),
                    Pack.event_end_date > datetime.utcnow()
                )
            )
        
        return query.order_by(Pack.created_at.desc()).all()
    
    def get_active_events(self) -> List[Pack]:
        """Get only active community events."""
        return self.get_all_events(include_ended=False)
    
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
        is_owner: bool = False
    ) -> EventSongResponse:
        """Build a song response for event display."""
        user = self.db.query(User).filter(User.id == song.user_id).first()
        
        # Determine display status
        if song.is_event_submitted:
            status = "Uploaded"
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
        
        return [
            self._build_song_response(song, pack, is_owner=(song.user_id == current_user_id))
            for song in songs
        ]
    
    def get_event_registrations(self, pack_id: int) -> List[EventRegistrationResponse]:
        """Get all registrations for an event (excluding users who already have songs)."""
        registrations = self.db.query(CommunityEventRegistration).filter(
            CommunityEventRegistration.pack_id == pack_id
        ).all()
        
        # Get user IDs who already have songs in the event
        users_with_songs = set(
            song.user_id for song in 
            self.db.query(Song.user_id).filter(Song.pack_id == pack_id).all()
        )
        
        result = []
        for reg in registrations:
            # Skip users who already have a song
            if reg.user_id in users_with_songs:
                continue
                
            user = self.db.query(User).filter(User.id == reg.user_id).first()
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

