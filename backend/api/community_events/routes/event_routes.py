"""Public routes for community events."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from api.auth import get_current_active_user
from models import User, Pack, Song, CommunityEventRegistration, SongStatus
from ..schemas import (
    CommunityEventResponse,
    CommunityEventListResponse,
    EventRegistrationResponse,
    EventSongResponse,
    AddSongToEventRequest,
    SwapSongRequest,
    RemoveSongRequest,
    SongSubmissionData,
    SongSubmissionUpdate,
)
from ..services.event_service import EventService

router = APIRouter(prefix="/community-events", tags=["community-events"])


@router.get("/", response_model=CommunityEventListResponse)
def get_community_events(
    include_ended: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all community events."""
    service = EventService(db)
    events = service.get_all_events(include_ended=include_ended)
    
    event_responses = [
        service.build_event_response(pack, current_user.id)
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


@router.get("/active", response_model=List[CommunityEventResponse])
def get_active_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get only active community events."""
    service = EventService(db)
    events = service.get_active_events()
    
    return [
        service.build_event_response(pack, current_user.id)
        for pack in events
    ]


@router.get("/{event_id}", response_model=CommunityEventResponse)
def get_community_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific community event."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return service.build_event_response(pack, current_user.id)


@router.get("/{event_id}/songs", response_model=List[EventSongResponse])
def get_event_songs(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all songs in an event."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return service.get_event_songs(event_id, current_user.id)


@router.get("/{event_id}/registrations", response_model=List[EventRegistrationResponse])
def get_event_registrations(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all registrations for an event."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    return service.get_event_registrations(event_id)


@router.post("/{event_id}/register")
def register_for_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Register interest in an event (no song yet)."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    # Check if event is still active
    if not service.is_event_active(pack):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event has ended and is no longer accepting contributions"
        )
    
    # Check if user already has a song in this event
    existing_song = db.query(Song).filter(
        Song.pack_id == event_id,
        Song.user_id == current_user.id
    ).first()
    
    if existing_song:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a song in this event"
        )
    
    # Check if already registered
    existing_reg = db.query(CommunityEventRegistration).filter(
        CommunityEventRegistration.pack_id == event_id,
        CommunityEventRegistration.user_id == current_user.id
    ).first()
    
    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already registered for this event"
        )
    
    # Create registration
    registration = CommunityEventRegistration(
        pack_id=event_id,
        user_id=current_user.id,
        registered_at=datetime.utcnow(),
    )
    db.add(registration)
    db.commit()
    
    return {"message": "Successfully registered for event", "event_id": event_id}


@router.delete("/{event_id}/register")
def unregister_from_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Unregister from an event."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    # Find and delete registration
    registration = db.query(CommunityEventRegistration).filter(
        CommunityEventRegistration.pack_id == event_id,
        CommunityEventRegistration.user_id == current_user.id
    ).first()
    
    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You are not registered for this event"
        )
    
    db.delete(registration)
    db.commit()
    
    return {"message": "Successfully unregistered from event", "event_id": event_id}


@router.post("/{event_id}/add-song", response_model=EventSongResponse)
def add_song_to_event(
    event_id: int,
    request: AddSongToEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a song to an event (create new or move existing)."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    # Check if event is still active
    if not service.is_event_active(pack):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event has ended and is no longer accepting contributions"
        )
    
    # Check if user already has a song in this event
    existing_song = db.query(Song).filter(
        Song.pack_id == event_id,
        Song.user_id == current_user.id
    ).first()
    
    if existing_song:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a song in this event. Use swap-song to replace it."
        )
    
    if request.song_id:
        # Move existing song to event
        song = db.query(Song).filter(
            Song.id == request.song_id,
            Song.user_id == current_user.id
        ).first()
        
        if not song:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Song not found or you don't own it"
            )
        
        # Store original pack for potential reversal
        # (We don't track this currently, but could add a field if needed)
        
        # Move song to event pack
        song.pack_id = event_id
        song.updated_at = datetime.utcnow()
    else:
        # Create new song
        if not request.title or not request.artist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Title and artist are required when creating a new song"
            )
        
        song = Song(
            title=request.title,
            artist=request.artist,
            album=request.album,
            year=request.year,
            album_cover=request.album_cover,
            user_id=current_user.id,
            pack_id=event_id,
            status=SongStatus.wip.value,  # Start as In Progress
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(song)
    
    # Remove registration if exists (user now has a song)
    registration = db.query(CommunityEventRegistration).filter(
        CommunityEventRegistration.pack_id == event_id,
        CommunityEventRegistration.user_id == current_user.id
    ).first()
    
    if registration:
        db.delete(registration)
    
    db.commit()
    db.refresh(song)
    
    return service._build_song_response(song, pack, is_owner=True)


@router.post("/{event_id}/swap-song", response_model=EventSongResponse)
def swap_event_song(
    event_id: int,
    request: SwapSongRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Replace user's song in an event."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    # Check if event is still active
    if not service.is_event_active(pack):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This event has ended and is no longer accepting contributions"
        )
    
    # Find user's current song in event
    old_song = db.query(Song).filter(
        Song.pack_id == event_id,
        Song.user_id == current_user.id
    ).first()
    
    if not old_song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't have a song in this event"
        )
    
    # Handle old song destination
    if request.old_song_destination == "delete":
        db.delete(old_song)
    elif request.old_song_destination == "another_pack":
        # Move to another pack
        target_pack = db.query(Pack).filter(
            Pack.id == request.old_song_new_pack_id,
            Pack.user_id == current_user.id
        ).first()
        
        if not target_pack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target pack not found or you don't own it"
            )
        
        old_song.pack_id = target_pack.id
        old_song.is_event_submitted = False  # Reset event submission status
        old_song.rhythmverse_link = None
        old_song.event_submission_description = None
        old_song.visualizer_link = None
        old_song.preview_link = None
        old_song.updated_at = datetime.utcnow()
    else:
        # "original_pack" - we don't track original pack, so create a new one or handle differently
        # For now, we'll just remove from event (set pack_id to None or create orphan pack)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot restore to original pack - original pack info not tracked. Use 'another_pack' instead."
        )
    
    # Now add the new song
    if request.new_song_id:
        # Move existing song to event
        new_song = db.query(Song).filter(
            Song.id == request.new_song_id,
            Song.user_id == current_user.id
        ).first()
        
        if not new_song:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="New song not found or you don't own it"
            )
        
        new_song.pack_id = event_id
        new_song.updated_at = datetime.utcnow()
    else:
        # Create new song
        if not request.title or not request.artist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Title and artist are required when creating a new song"
            )
        
        new_song = Song(
            title=request.title,
            artist=request.artist,
            album=request.album,
            year=request.year,
            album_cover=request.album_cover,
            user_id=current_user.id,
            pack_id=event_id,
            status=SongStatus.wip.value,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(new_song)
    
    db.commit()
    db.refresh(new_song)
    
    return service._build_song_response(new_song, pack, is_owner=True)


@router.post("/{event_id}/remove-song")
def remove_song_from_event(
    event_id: int,
    request: RemoveSongRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove user's song from an event."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    # Find user's song in event
    song = db.query(Song).filter(
        Song.pack_id == event_id,
        Song.user_id == current_user.id
    ).first()
    
    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't have a song in this event"
        )
    
    # Handle song destination
    if request.destination == "delete":
        db.delete(song)
    elif request.destination == "another_pack":
        # Move to another pack
        target_pack = db.query(Pack).filter(
            Pack.id == request.new_pack_id,
            Pack.user_id == current_user.id
        ).first()
        
        if not target_pack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target pack not found or you don't own it"
            )
        
        song.pack_id = target_pack.id
        song.is_event_submitted = False
        song.rhythmverse_link = None
        song.event_submission_description = None
        song.visualizer_link = None
        song.preview_link = None
        song.updated_at = datetime.utcnow()
    else:
        # "original_pack"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot restore to original pack - original pack info not tracked. Use 'another_pack' instead."
        )
    
    # Re-register the user so they stay in "planning to participate" stage
    existing_registration = db.query(CommunityEventRegistration).filter(
        CommunityEventRegistration.pack_id == event_id,
        CommunityEventRegistration.user_id == current_user.id
    ).first()
    
    if not existing_registration:
        registration = CommunityEventRegistration(
            pack_id=event_id,
            user_id=current_user.id,
            registered_at=datetime.utcnow(),
            status="registered"
        )
        db.add(registration)
    
    db.commit()
    
    return {"message": "Song removed from event", "event_id": event_id}


@router.post("/{event_id}/submit-song", response_model=EventSongResponse)
def submit_song_to_event(
    event_id: int,
    submission: SongSubmissionData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Submit a completed song (requires RhythmVerse link)."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    # Find user's song in event
    song = db.query(Song).filter(
        Song.pack_id == event_id,
        Song.user_id == current_user.id
    ).first()
    
    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't have a song in this event"
        )
    
    # Check if all workflow steps are complete
    if not service._check_workflow_complete(song):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All workflow steps must be completed before submitting"
        )
    
    # Update song with submission data
    song.rhythmverse_link = submission.rhythmverse_link
    song.event_submission_description = submission.event_submission_description
    song.visualizer_link = submission.visualizer_link
    song.preview_link = submission.preview_link
    song.is_event_submitted = True
    song.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(song)
    
    return service._build_song_response(song, pack, is_owner=True)


@router.patch("/{event_id}/submission", response_model=EventSongResponse)
def update_song_submission(
    event_id: int,
    submission: SongSubmissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing song submission."""
    service = EventService(db)
    pack = service.get_event_by_id(event_id)
    
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community event not found"
        )
    
    # Find user's song in event
    song = db.query(Song).filter(
        Song.pack_id == event_id,
        Song.user_id == current_user.id
    ).first()
    
    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You don't have a song in this event"
        )
    
    if not song.is_event_submitted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Song has not been submitted yet. Use submit-song endpoint."
        )
    
    # Update submission data
    update_data = submission.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(song, field) and value is not None:
            setattr(song, field, value)
    
    song.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(song)
    
    return service._build_song_response(song, pack, is_owner=True)

