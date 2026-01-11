"""Admin routes for community events management."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from api.auth import get_current_active_user
from api.admin import require_admin
from models import User
from ..schemas import (
    CommunityEventCreate,
    CommunityEventUpdate,
    CommunityEventResponse,
    CommunityEventListResponse,
    EventRegistrationResponse,
    EventSongResponse,
)
from ..services.event_service import EventService

router = APIRouter(prefix="/admin/community-events", tags=["admin", "community-events"])


@router.post("/", response_model=CommunityEventResponse)
def create_community_event(
    event_data: CommunityEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new community event (admin only)."""
    service = EventService(db)
    
    # Create the event
    pack = service.create_event(event_data, current_user.id)
    
    # Broadcast notification to all users
    notification_count = service.broadcast_event_notification(pack)
    print(f"📢 Broadcasted event notification to {notification_count} users")
    
    return service.build_event_response(pack, current_user.id)


@router.get("/", response_model=CommunityEventListResponse)
def get_all_community_events(
    include_ended: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all community events for admin management."""
    service = EventService(db)
    events = service.get_all_events(include_ended=include_ended)
    
    event_responses = [
        service.build_event_response(pack, current_user.id, include_participation=False)
        for pack in events
    ]
    
    active_count = sum(1 for e in event_responses if e.status.value == "active")
    ended_count = sum(1 for e in event_responses if e.status.value == "ended")
    
    return CommunityEventListResponse(
        events=event_responses,
        total=len(event_responses),
        active_count=active_count,
        ended_count=ended_count,
    )


@router.get("/{event_id}", response_model=CommunityEventResponse)
def get_community_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get a specific community event with admin stats."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return service.build_event_response(pack, current_user.id)


@router.get("/{event_id}/registrations", response_model=List[EventRegistrationResponse])
def get_event_registrations(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all registrations for an event (admin only)."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return service.get_event_registrations(event_id)


@router.get("/{event_id}/songs", response_model=List[EventSongResponse])
def get_event_songs_admin(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all songs in an event (admin can see all links)."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    # Admin can see all links regardless of reveal status
    # We pass current_user.id but the admin should see everything
    # For now, we'll handle this by getting all songs with owner=True for all
    from models import Song
    songs = db.query(Song).filter(Song.pack_id == event_id).all()
    
    return [
        service._build_song_response(song, pack, is_owner=True)
        for song in songs
    ]


@router.patch("/{event_id}", response_model=CommunityEventResponse)
def update_community_event(
    event_id: int,
    event_data: CommunityEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a community event (admin only)."""
    service = EventService(db)
    pack = service.update_event(event_id, event_data)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return service.build_event_response(pack, current_user.id)


@router.post("/{event_id}/release", response_model=CommunityEventResponse)
def release_community_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Release a community event pack (admin only).
    
    This single action:
    - Reveals all links (RhythmVerse, visualizer, preview)
    - Marks all songs as Released
    - Ends the event (no more submissions)
    - Removes from WIP page / active events
    - Moves to Past Events archive
    """
    service = EventService(db)
    pack = service.release_event(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return service.build_event_response(pack, current_user.id)


@router.post("/{event_id}/unrelease", response_model=CommunityEventResponse)
def unrelease_community_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Revert a released event back to active state (admin only, for data repair).
    
    This reverts:
    - Clears revealed_at to make event active again
    - Sets all songs back to In Progress status
    """
    service = EventService(db)
    pack = service.unreleased_event(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return service.build_event_response(pack, current_user.id)


@router.delete("/{event_id}")
def delete_community_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a community event (admin only)."""
    service = EventService(db)
    
    if not service.delete_event(event_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return {"message": "Community event deleted successfully"}

