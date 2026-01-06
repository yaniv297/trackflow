from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, text, func
from database import get_db
from models import (
    CollaborationRequest, CollaborationRequestBatch, CollaborationRequestBatchStatus,
    Song, User, Collaboration, CollaborationType, Authoring, Pack, NotificationType
)
from api.auth import get_current_active_user
from api.activity_logger import log_activity
from models import Notification
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import json

router = APIRouter(prefix="/collaboration-requests", tags=["Collaboration Requests"])

def create_notification(db: Session, user_id: int, notification_type: str, title: str, message: str, metadata: dict = None):
    """Simple notification creation helper"""
    try:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message
        )
        db.add(notification)
        db.commit()
        return notification
    except Exception as e:
        db.rollback()
        raise e

class CreateCollaborationRequestRequest(BaseModel):
    song_id: int
    message: str
    requested_parts: Optional[List[str]] = None

class CollaborationRequestResponse(BaseModel):
    id: int
    song_id: int
    song_title: str
    song_artist: str
    song_status: str
    song_album_cover: Optional[str]
    requester_id: int
    requester_username: str
    requester_display_name: Optional[str]
    owner_id: int
    owner_username: str
    owner_display_name: Optional[str]
    message: str
    requested_parts: Optional[List[str]]
    status: str
    owner_response: Optional[str]
    assigned_parts: Optional[List[str]]
    created_at: datetime
    responded_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class RespondToRequestRequest(BaseModel):
    response: str  # "accepted" or "rejected"
    message: str
    assigned_parts: Optional[List[str]] = None
    grant_full_pack_permissions: bool = False  # If true, grant pack-level permissions instead of song-level

@router.post("/", response_model=CollaborationRequestResponse)
def create_collaboration_request(
    request: CreateCollaborationRequestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a collaboration request for a public song"""
    
    # Check if song exists and is public
    song = db.query(Song).filter(Song.id == request.song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    if not song.is_public:
        raise HTTPException(status_code=400, detail="Can only request collaboration on public songs")
    
    if song.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot request collaboration on your own song")
    
    # Check if request already exists
    existing_request = db.query(CollaborationRequest).filter(
        CollaborationRequest.song_id == request.song_id,
        CollaborationRequest.requester_id == current_user.id
    ).first()
    
    if existing_request:
        raise HTTPException(status_code=400, detail="Collaboration request already exists for this song")
    
    # Validate requested parts for WIP songs
    if song.status == "In Progress" and request.requested_parts:
        # Get available authoring parts for this song based on owner's workflow
        authoring = db.query(Authoring).filter(Authoring.song_id == request.song_id).first()
        if authoring:
            # Get song owner's workflow steps (no hardcoded fallback)
            owner_workflow_steps = db.execute(text("""
                SELECT uws.step_name
                FROM user_workflows uw
                JOIN user_workflow_steps uws ON uws.workflow_id = uw.id
                WHERE uw.user_id = :uid
                ORDER BY uws.order_index
            """), {"uid": song.user_id}).fetchall()
            
            # Extract step names from workflow
            authoring_fields = [step[0] for step in owner_workflow_steps] if owner_workflow_steps else []
            
            available_parts = []
            for field in authoring_fields:
                # Check if the field exists on the authoring object and is not completed
                if hasattr(authoring, field) and not getattr(authoring, field, False):
                    available_parts.append(field)
            
            # Validate requested parts are available
            invalid_parts = [part for part in request.requested_parts if part not in available_parts]
            if invalid_parts:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Requested parts not available: {', '.join(invalid_parts)}"
                )
    
    # Create collaboration request
    collab_request = CollaborationRequest(
        song_id=request.song_id,
        requester_id=current_user.id,
        owner_id=song.user_id,
        message=request.message,
        requested_parts=json.dumps(request.requested_parts) if request.requested_parts else None,
        status="pending"
    )
    
    db.add(collab_request)
    db.commit()
    db.refresh(collab_request)
    
    # Create notification for song owner
    try:
        create_notification(
            db=db,
            user_id=song.user_id,
            notification_type="collaboration_request",
            title="New Collaboration Request",
            message=f"{current_user.username} wants to collaborate on '{song.title}' by {song.artist}",
            metadata={
                "collaboration_request_id": collab_request.id,
                "song_id": song.id,
                "requester_id": current_user.id
            }
        )
    except Exception as notif_err:
        pass
    
    # Log activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="create_collaboration_request",
            description=f"Requested collaboration on '{song.title}' by {song.artist}",
            metadata={
                "song_id": song.id,
                "owner_id": song.user_id,
                "requested_parts": request.requested_parts
            }
        )
    except Exception as log_err:
        pass
    
    # Check collaboration request achievements
    try:
        from api.achievements import check_collaboration_request_achievements
        check_collaboration_request_achievements(db, current_user.id)
    except Exception as ach_err:
        pass
    
    # Get song owner info for response
    song_owner = db.query(User).filter(User.id == song.user_id).first()
    # Get full requester user object to access display_name
    requester_user = db.query(User).filter(User.id == current_user.id).first()
    
    return CollaborationRequestResponse(
        id=collab_request.id,
        song_id=song.id,
        song_title=song.title,
        song_artist=song.artist,
        song_status=song.status,
        song_album_cover=song.album_cover,
        requester_id=current_user.id,
        requester_username=current_user.username,
        requester_display_name=requester_user.display_name if requester_user else None,
        owner_id=song.user_id,
        owner_username=song_owner.username,
        owner_display_name=song_owner.display_name,
        message=collab_request.message,
        requested_parts=json.loads(collab_request.requested_parts) if collab_request.requested_parts else None,
        status=collab_request.status,
        owner_response=collab_request.owner_response,
        assigned_parts=json.loads(collab_request.assigned_parts) if collab_request.assigned_parts else None,
        created_at=collab_request.created_at,
        responded_at=collab_request.responded_at
    )

@router.get("/received", response_model=List[CollaborationRequestResponse])
def get_received_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get collaboration requests received by current user"""
    
    query = db.query(CollaborationRequest, Song, User).join(
        Song, CollaborationRequest.song_id == Song.id
    ).join(
        User, CollaborationRequest.requester_id == User.id
    ).filter(CollaborationRequest.owner_id == current_user.id)
    
    if status:
        query = query.filter(CollaborationRequest.status == status)
    
    results = query.order_by(CollaborationRequest.created_at.desc()).all()
    
    # Get full current user object to access display_name
    current_user_full = db.query(User).filter(User.id == current_user.id).first()
    
    return [
        CollaborationRequestResponse(
            id=req.id,
            song_id=song.id,
            song_title=song.title,
            song_artist=song.artist,
            song_status=song.status,
            song_album_cover=song.album_cover,
            requester_id=req.requester_id,
            requester_username=requester.username,
            requester_display_name=requester.display_name,
            owner_id=current_user.id,
            owner_username=current_user.username,
            owner_display_name=current_user_full.display_name if current_user_full else None,
            message=req.message,
            requested_parts=json.loads(req.requested_parts) if req.requested_parts else None,
            status=req.status,
            owner_response=req.owner_response,
            assigned_parts=json.loads(req.assigned_parts) if req.assigned_parts else None,
            created_at=req.created_at,
            responded_at=req.responded_at
        )
        for req, song, requester in results
    ]

@router.get("/sent", response_model=List[CollaborationRequestResponse])
def get_sent_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get collaboration requests sent by current user"""
    
    query = db.query(CollaborationRequest, Song, User).join(
        Song, CollaborationRequest.song_id == Song.id
    ).join(
        User, CollaborationRequest.owner_id == User.id
    ).filter(CollaborationRequest.requester_id == current_user.id)
    
    if status:
        query = query.filter(CollaborationRequest.status == status)
    
    results = query.order_by(CollaborationRequest.created_at.desc()).all()
    
    # Get full current user object to access display_name
    current_user_full = db.query(User).filter(User.id == current_user.id).first()
    
    return [
        CollaborationRequestResponse(
            id=req.id,
            song_id=song.id,
            song_title=song.title,
            song_artist=song.artist,
            song_status=song.status,
            song_album_cover=song.album_cover,
            requester_id=current_user.id,
            requester_username=current_user.username,
            requester_display_name=current_user_full.display_name if current_user_full else None,
            owner_id=req.owner_id,
            owner_username=owner.username,
            owner_display_name=owner.display_name,
            message=req.message,
            requested_parts=json.loads(req.requested_parts) if req.requested_parts else None,
            status=req.status,
            owner_response=req.owner_response,
            assigned_parts=json.loads(req.assigned_parts) if req.assigned_parts else None,
            created_at=req.created_at,
            responded_at=req.responded_at
        )
        for req, song, owner in results
    ]

@router.put("/{request_id}/respond")
def respond_to_collaboration_request(
    request_id: int,
    response: RespondToRequestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Accept or reject a collaboration request"""
    
    # Get the request
    collab_request = db.query(CollaborationRequest).filter(
        CollaborationRequest.id == request_id,
        CollaborationRequest.owner_id == current_user.id,
        CollaborationRequest.status == "pending"
    ).first()
    
    if not collab_request:
        raise HTTPException(status_code=404, detail="Collaboration request not found or already responded to")
    
    if response.response not in ["accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Response must be 'accepted' or 'rejected'")
    
    # Get the song
    song = db.query(Song).filter(Song.id == collab_request.song_id).first()
    requester = db.query(User).filter(User.id == collab_request.requester_id).first()
    
    # Update the request
    collab_request.status = response.response
    collab_request.owner_response = response.message
    collab_request.responded_at = datetime.utcnow()
    
    if response.response == "accepted":
        # Check if granting pack permissions
        if response.grant_full_pack_permissions and song.pack_id:
            # Grant pack-level edit permissions
            existing_pack_collab = db.query(Collaboration).filter(
                Collaboration.pack_id == song.pack_id,
                Collaboration.user_id == collab_request.requester_id,
                Collaboration.collaboration_type == CollaborationType.PACK_EDIT
            ).first()
            
            if not existing_pack_collab:
                pack_collaboration = Collaboration(
                    pack_id=song.pack_id,
                    user_id=collab_request.requester_id,
                    collaboration_type=CollaborationType.PACK_EDIT
                )
                db.add(pack_collaboration)
        elif song.status == "Future Plans":
            # Give full edit permissions for future plans (song-level)
            collaboration = Collaboration(
                song_id=song.id,
                user_id=collab_request.requester_id,
                collaboration_type=CollaborationType.SONG_EDIT
            )
            db.add(collaboration)
            
        elif song.status == "In Progress" and response.assigned_parts:
            # For WIP songs, assign specific parts
            collab_request.assigned_parts = json.dumps(response.assigned_parts)
            
            # Create collaboration for WIP editing
            collaboration = Collaboration(
                song_id=song.id,
                user_id=collab_request.requester_id,
                collaboration_type=CollaborationType.SONG_EDIT
            )
            db.add(collaboration)
        else:
            # Default: create song-level collaboration
            existing_song_collab = db.query(Collaboration).filter(
                Collaboration.song_id == song.id,
                Collaboration.user_id == collab_request.requester_id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            ).first()
            
            if not existing_song_collab:
                collaboration = Collaboration(
                    song_id=song.id,
                    user_id=collab_request.requester_id,
                    collaboration_type=CollaborationType.SONG_EDIT
                )
                db.add(collaboration)
    
    db.commit()
    
    # Create notification for requester
    try:
        if response.response == 'accepted':
            notification_title = "Collaboration Request Accepted ✅"
            if response.grant_full_pack_permissions and song.pack_id:
                pack = db.query(Pack).filter(Pack.id == song.pack_id).first()
                pack_name = pack.name if pack else "the pack"
                notification_message = f"{current_user.username} granted you full pack access to '{pack_name}'"
            else:
                notification_message = f"{current_user.username} accepted your collaboration request for '{song.title}'"
        else:
            notification_title = "Collaboration Request Rejected"
            notification_message = f"{current_user.username} declined your collaboration request for '{song.title}'"
        
        create_notification(
            db=db,
            user_id=collab_request.requester_id,
            notification_type="collaboration_response",
            title=notification_title,
            message=notification_message,
            metadata={
                "collaboration_request_id": collab_request.id,
                "song_id": song.id,
                "response": response.response,
                "owner_message": response.message,
                "grant_full_pack_permissions": response.grant_full_pack_permissions and song.pack_id is not None
            }
        )
    except Exception as notif_err:
        pass
    
    # Log activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="respond_collaboration_request",
            description=f"{response.response.title()} collaboration request from {requester.username} for '{song.title}'",
            metadata={
                "request_id": request_id,
                "song_id": song.id,
                "requester_id": collab_request.requester_id,
                "response": response.response
            }
        )
    except Exception as log_err:
        pass
    
    # Check achievements if collaboration was accepted
    if response.response == "accepted":
        try:
            from api.achievements import check_social_collaboration_achievements
            check_social_collaboration_achievements(db, current_user.id)  # For song owner (adding collaborator)
            check_social_collaboration_achievements(db, collab_request.requester_id)  # For collaborator (being added)
        except Exception as ach_err:
            pass
    
    return {
        "request_id": request_id,
        "status": response.response,
        "message": f"Collaboration request {response.response}"
    }

@router.put("/{request_id}/reopen")
def reopen_collaboration_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reopen a rejected collaboration request (only by song owner)"""
    
    collab_request = db.query(CollaborationRequest).filter(
        CollaborationRequest.id == request_id,
        CollaborationRequest.owner_id == current_user.id,
        CollaborationRequest.status == "rejected"
    ).first()
    
    if not collab_request:
        raise HTTPException(status_code=404, detail="Collaboration request not found or cannot be reopened")
    
    # Reset the request to pending status
    collab_request.status = "pending"
    collab_request.owner_response = None
    collab_request.responded_at = None
    collab_request.assigned_parts = None
    
    db.commit()
    
    # Get song and requester for notification
    song = db.query(Song).filter(Song.id == collab_request.song_id).first()
    
    # Create notification for requester
    try:
        create_notification(
            db=db,
            user_id=collab_request.requester_id,
            notification_type="collaboration_reopened",
            title="Collaboration Request Reopened",
            message=f"{current_user.username} has reopened your collaboration request for '{song.title}'",
            metadata={
                "collaboration_request_id": collab_request.id,
                "song_id": song.id,
                "owner_id": current_user.id
            }
        )
    except Exception as notif_err:
        pass
    
    return {
        "request_id": request_id,
        "status": "pending",
        "message": "Collaboration request reopened successfully"
    }

@router.delete("/{request_id}")
def cancel_collaboration_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cancel/delete a collaboration request (only by requester)"""
    
    # Allow deletion of both pending and rejected requests
    # (rejected requests can be deleted to allow submitting a new request)
    collab_request = db.query(CollaborationRequest).filter(
        CollaborationRequest.id == request_id,
        CollaborationRequest.requester_id == current_user.id,
        CollaborationRequest.status.in_(["pending", "rejected"])
    ).first()
    
    if not collab_request:
        raise HTTPException(status_code=404, detail="Collaboration request not found or cannot be cancelled")
    
    db.delete(collab_request)
    db.commit()
    
    return {"message": "Collaboration request cancelled"}

@router.get("/song/{song_id}/available-parts")
def get_available_parts(
    song_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get available authoring parts for a song (for WIP collaboration requests)"""
    
    song = db.query(Song).filter(Song.id == song_id, Song.is_public == True).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found or not public")
    
    if song.status != "In Progress":
        return {"available_parts": [], "message": "Song is not in progress"}
    
    authoring = db.query(Authoring).filter(Authoring.song_id == song_id).first()
    if not authoring:
        # If no authoring record, all parts are available
        all_parts = [
            'demucs', 'midi', 'tempo_map', 'fake_ending', 'drums', 'bass',
            'guitar', 'vocals', 'harmonies', 'pro_keys', 'keys',
            'animations', 'drum_fills', 'overdrive', 'compile'
        ]
        return {"available_parts": all_parts}
    
    available_parts = []
    authoring_fields = [
        'demucs', 'midi', 'tempo_map', 'fake_ending', 'drums', 'bass',
        'guitar', 'vocals', 'harmonies', 'pro_keys', 'keys',
        'animations', 'drum_fills', 'overdrive', 'compile'
    ]
    
    for field in authoring_fields:
        if not getattr(authoring, field, False):  # Part not completed yet
            available_parts.append(field)
    
    return {"available_parts": available_parts}


# =============================================================================
# BATCH COLLABORATION REQUESTS
# =============================================================================

class CreateBatchRequestRequest(BaseModel):
    """Request model for creating a batch collaboration request"""
    song_ids: List[int] = Field(..., min_length=1, description="List of song IDs to request collaboration on")
    message: str = Field(..., min_length=1, max_length=2000, description="Message for the batch request")


class BatchSongInfo(BaseModel):
    """Song information within a batch"""
    request_id: int
    song_id: int
    song_title: str
    song_artist: str
    song_status: str
    song_album_cover: Optional[str]
    pack_id: Optional[int]
    pack_name: Optional[str]
    item_status: Optional[str]  # Per-song status when selective approval is used
    
    class Config:
        from_attributes = True


class PackInfo(BaseModel):
    """Pack information for batch display"""
    pack_id: int
    pack_name: str
    song_count: int


class BatchRequestResponse(BaseModel):
    """Response model for batch requests"""
    batch_id: int
    requester_id: int
    requester_username: str
    requester_display_name: Optional[str]
    target_user_id: int
    target_username: str
    target_display_name: Optional[str]
    message: str
    status: str
    response_message: Optional[str]
    grant_full_pack_permissions: bool
    created_at: datetime
    responded_at: Optional[datetime]
    songs: List[BatchSongInfo]
    packs_involved: List[PackInfo]
    song_count: int
    
    class Config:
        from_attributes = True


class RespondToBatchRequest(BaseModel):
    """Request model for responding to a batch"""
    action: str = Field(..., description="Action: 'approve_all', 'reject_all', or 'selective'")
    response_message: str = Field("", description="Response message to the requester")
    decisions: Optional[Dict[str, str]] = Field(None, description="Per-song decisions when action is 'selective'. Keys are request_ids, values are 'approved' or 'rejected'")
    grant_full_pack_permissions: bool = Field(False, description="If true, grants pack-level permissions instead of song-level")


class BatchListResponse(BaseModel):
    """Response model for listing batches"""
    batches: List[BatchRequestResponse]
    total_count: int


def _build_batch_response(batch: CollaborationRequestBatch, db: Session) -> BatchRequestResponse:
    """Helper to build a BatchRequestResponse from a batch object"""
    requester = db.query(User).filter(User.id == batch.requester_id).first()
    target_user = db.query(User).filter(User.id == batch.target_user_id).first()
    
    # Get all requests in this batch with song and pack info
    requests_with_songs = db.query(CollaborationRequest, Song, Pack).join(
        Song, CollaborationRequest.song_id == Song.id
    ).outerjoin(
        Pack, Song.pack_id == Pack.id
    ).filter(
        CollaborationRequest.batch_id == batch.id
    ).all()
    
    songs = []
    packs_map = {}  # pack_id -> {pack_name, song_count}
    
    for req, song, pack in requests_with_songs:
        songs.append(BatchSongInfo(
            request_id=req.id,
            song_id=song.id,
            song_title=song.title,
            song_artist=song.artist,
            song_status=song.status,
            song_album_cover=song.album_cover,
            pack_id=song.pack_id,
            pack_name=pack.name if pack else None,
            item_status=req.item_status
        ))
        
        if pack:
            if pack.id not in packs_map:
                packs_map[pack.id] = {"pack_name": pack.name, "song_count": 0}
            packs_map[pack.id]["song_count"] += 1
    
    packs_involved = [
        PackInfo(pack_id=pid, pack_name=info["pack_name"], song_count=info["song_count"])
        for pid, info in packs_map.items()
    ]
    
    return BatchRequestResponse(
        batch_id=batch.id,
        requester_id=batch.requester_id,
        requester_username=requester.username if requester else "Unknown",
        requester_display_name=requester.display_name if requester else None,
        target_user_id=batch.target_user_id,
        target_username=target_user.username if target_user else "Unknown",
        target_display_name=target_user.display_name if target_user else None,
        message=batch.message,
        status=batch.status,
        response_message=batch.response_message,
        grant_full_pack_permissions=batch.grant_full_pack_permissions,
        created_at=batch.created_at,
        responded_at=batch.responded_at,
        songs=songs,
        packs_involved=packs_involved,
        song_count=len(songs)
    )


@router.post("/batch", response_model=BatchRequestResponse)
def create_batch_request(
    request: CreateBatchRequestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a batch collaboration request for multiple songs.
    All songs MUST be owned by the same user.
    """
    if not request.song_ids:
        raise HTTPException(status_code=400, detail="At least one song ID is required")
    
    # Get all songs and validate they exist, are public, and owned by the same user
    songs = db.query(Song).filter(Song.id.in_(request.song_ids)).all()
    
    if len(songs) != len(request.song_ids):
        found_ids = {s.id for s in songs}
        missing = [sid for sid in request.song_ids if sid not in found_ids]
        raise HTTPException(status_code=404, detail=f"Songs not found: {missing}")
    
    # Validate all songs are public
    non_public = [s for s in songs if not s.is_public]
    if non_public:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot request collaboration on non-public songs: {[s.title for s in non_public]}"
        )
    
    # Validate all songs are owned by the same user
    owner_ids = {s.user_id for s in songs}
    if len(owner_ids) > 1:
        raise HTTPException(
            status_code=400, 
            detail="All songs must be owned by the same user. Select songs from only one author."
        )
    
    target_user_id = list(owner_ids)[0]
    
    # Cannot request collaboration on your own songs
    if target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot request collaboration on your own songs")
    
    # Check for existing pending requests on any of these songs
    existing_requests = db.query(CollaborationRequest).filter(
        CollaborationRequest.song_id.in_(request.song_ids),
        CollaborationRequest.requester_id == current_user.id,
        CollaborationRequest.status == "pending"
    ).all()
    
    if existing_requests:
        existing_titles = []
        for req in existing_requests:
            song = next((s for s in songs if s.id == req.song_id), None)
            if song:
                existing_titles.append(song.title)
        raise HTTPException(
            status_code=400, 
            detail=f"You already have pending requests for these songs: {', '.join(existing_titles)}"
        )
    
    # Create the batch
    batch = CollaborationRequestBatch(
        requester_id=current_user.id,
        target_user_id=target_user_id,
        message=request.message,
        status="pending"
    )
    db.add(batch)
    db.flush()  # Get the batch ID
    
    # Create individual requests for each song
    for song in songs:
        collab_request = CollaborationRequest(
            song_id=song.id,
            requester_id=current_user.id,
            owner_id=target_user_id,
            batch_id=batch.id,
            message=request.message,  # Same message for all
            status="pending"
        )
        db.add(collab_request)
    
    db.commit()
    db.refresh(batch)
    
    # Create notification for target user
    target_user = db.query(User).filter(User.id == target_user_id).first()
    try:
        song_count = len(songs)
        create_notification(
            db=db,
            user_id=target_user_id,
            notification_type=NotificationType.COLLAB_BATCH_REQUEST.value,
            title="New Collaboration Request",
            message=f"{current_user.username} wants to collaborate on {song_count} song{'s' if song_count > 1 else ''}",
            metadata={
                "batch_id": batch.id,
                "song_count": song_count,
                "requester_id": current_user.id
            }
        )
    except Exception as notif_err:
        print(f"⚠️ Failed to create batch notification: {notif_err}")
    
    # Log activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="create_batch_collaboration_request",
            description=f"Requested collaboration on {len(songs)} songs from {target_user.username}",
            metadata={
                "batch_id": batch.id,
                "song_ids": request.song_ids,
                "target_user_id": target_user_id
            }
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log batch request activity: {log_err}")
    
    return _build_batch_response(batch, db)


@router.get("/batches/received", response_model=BatchListResponse)
def get_received_batches(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get batch collaboration requests received by current user"""
    
    query = db.query(CollaborationRequestBatch).filter(
        CollaborationRequestBatch.target_user_id == current_user.id
    )
    
    if status:
        query = query.filter(CollaborationRequestBatch.status == status)
    
    batches = query.order_by(CollaborationRequestBatch.created_at.desc()).all()
    
    # Also include unbatched requests (batch_id is NULL) as single-item batches
    unbatched_query = db.query(CollaborationRequest).filter(
        CollaborationRequest.owner_id == current_user.id,
        CollaborationRequest.batch_id.is_(None)
    )
    if status:
        unbatched_query = unbatched_query.filter(CollaborationRequest.status == status)
    
    unbatched_requests = unbatched_query.order_by(CollaborationRequest.created_at.desc()).all()
    
    batch_responses = [_build_batch_response(b, db) for b in batches]
    
    # Convert unbatched requests to batch-like responses
    for req in unbatched_requests:
        song = db.query(Song).filter(Song.id == req.song_id).first()
        pack = db.query(Pack).filter(Pack.id == song.pack_id).first() if song and song.pack_id else None
        requester = db.query(User).filter(User.id == req.requester_id).first()
        
        batch_responses.append(BatchRequestResponse(
            batch_id=0,  # Indicate this is an unbatched request
            requester_id=req.requester_id,
            requester_username=requester.username if requester else "Unknown",
            requester_display_name=requester.display_name if requester else None,
            target_user_id=req.owner_id,
            target_username=current_user.username,
            target_display_name=current_user.display_name,
            message=req.message,
            status=req.status,
            response_message=req.owner_response,
            grant_full_pack_permissions=False,
            created_at=req.created_at,
            responded_at=req.responded_at,
            songs=[BatchSongInfo(
                request_id=req.id,
                song_id=song.id if song else 0,
                song_title=song.title if song else "Unknown",
                song_artist=song.artist if song else "Unknown",
                song_status=song.status if song else "Unknown",
                song_album_cover=song.album_cover if song else None,
                pack_id=song.pack_id if song else None,
                pack_name=pack.name if pack else None,
                item_status=req.item_status
            )],
            packs_involved=[PackInfo(pack_id=pack.id, pack_name=pack.name, song_count=1)] if pack else [],
            song_count=1
        ))
    
    # Sort all by created_at desc
    batch_responses.sort(key=lambda x: x.created_at, reverse=True)
    
    return BatchListResponse(
        batches=batch_responses,
        total_count=len(batch_responses)
    )


@router.get("/batches/sent", response_model=BatchListResponse)
def get_sent_batches(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get batch collaboration requests sent by current user"""
    
    query = db.query(CollaborationRequestBatch).filter(
        CollaborationRequestBatch.requester_id == current_user.id
    )
    
    if status:
        query = query.filter(CollaborationRequestBatch.status == status)
    
    batches = query.order_by(CollaborationRequestBatch.created_at.desc()).all()
    
    # Also include unbatched requests (batch_id is NULL) as single-item batches
    unbatched_query = db.query(CollaborationRequest).filter(
        CollaborationRequest.requester_id == current_user.id,
        CollaborationRequest.batch_id.is_(None)
    )
    if status:
        unbatched_query = unbatched_query.filter(CollaborationRequest.status == status)
    
    unbatched_requests = unbatched_query.order_by(CollaborationRequest.created_at.desc()).all()
    
    batch_responses = [_build_batch_response(b, db) for b in batches]
    
    # Convert unbatched requests to batch-like responses
    for req in unbatched_requests:
        song = db.query(Song).filter(Song.id == req.song_id).first()
        pack = db.query(Pack).filter(Pack.id == song.pack_id).first() if song and song.pack_id else None
        target_user = db.query(User).filter(User.id == req.owner_id).first()
        
        batch_responses.append(BatchRequestResponse(
            batch_id=0,  # Indicate this is an unbatched request
            requester_id=current_user.id,
            requester_username=current_user.username,
            requester_display_name=current_user.display_name,
            target_user_id=req.owner_id,
            target_username=target_user.username if target_user else "Unknown",
            target_display_name=target_user.display_name if target_user else None,
            message=req.message,
            status=req.status,
            response_message=req.owner_response,
            grant_full_pack_permissions=False,
            created_at=req.created_at,
            responded_at=req.responded_at,
            songs=[BatchSongInfo(
                request_id=req.id,
                song_id=song.id if song else 0,
                song_title=song.title if song else "Unknown",
                song_artist=song.artist if song else "Unknown",
                song_status=song.status if song else "Unknown",
                song_album_cover=song.album_cover if song else None,
                pack_id=song.pack_id if song else None,
                pack_name=pack.name if pack else None,
                item_status=req.item_status
            )],
            packs_involved=[PackInfo(pack_id=pack.id, pack_name=pack.name, song_count=1)] if pack else [],
            song_count=1
        ))
    
    # Sort all by created_at desc
    batch_responses.sort(key=lambda x: x.created_at, reverse=True)
    
    return BatchListResponse(
        batches=batch_responses,
        total_count=len(batch_responses)
    )


@router.put("/batches/{batch_id}/respond")
def respond_to_batch(
    batch_id: int,
    response: RespondToBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Respond to a batch collaboration request.
    Actions: 'approve_all', 'reject_all', or 'selective'
    """
    
    # Get the batch
    batch = db.query(CollaborationRequestBatch).filter(
        CollaborationRequestBatch.id == batch_id,
        CollaborationRequestBatch.target_user_id == current_user.id,
        CollaborationRequestBatch.status == "pending"
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found or already responded to")
    
    if response.action not in ["approve_all", "reject_all", "selective"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve_all', 'reject_all', or 'selective'")
    
    # Get all requests in the batch
    requests = db.query(CollaborationRequest).filter(
        CollaborationRequest.batch_id == batch_id
    ).all()
    
    if not requests:
        raise HTTPException(status_code=404, detail="No requests found in batch")
    
    requester = db.query(User).filter(User.id == batch.requester_id).first()
    now = datetime.utcnow()
    
    approved_count = 0
    rejected_count = 0
    approved_songs = []
    rejected_songs = []
    pack_ids_to_grant = set()
    
    if response.action == "approve_all":
        for req in requests:
            req.status = "accepted"
            req.item_status = "approved"
            req.responded_at = now
            req.owner_response = response.response_message
            
            song = db.query(Song).filter(Song.id == req.song_id).first()
            if song:
                approved_songs.append(song.title)
                if song.pack_id:
                    pack_ids_to_grant.add(song.pack_id)
                
                # Create song-level collaboration if not granting pack permissions
                if not response.grant_full_pack_permissions:
                    _create_song_collaboration(db, song, req.requester_id)
            
            approved_count += 1
        
        batch.status = "approved"
        
    elif response.action == "reject_all":
        for req in requests:
            req.status = "rejected"
            req.item_status = "rejected"
            req.responded_at = now
            req.owner_response = response.response_message
            
            song = db.query(Song).filter(Song.id == req.song_id).first()
            if song:
                rejected_songs.append(song.title)
            
            rejected_count += 1
        
        batch.status = "rejected"
        
    elif response.action == "selective":
        if not response.decisions:
            raise HTTPException(status_code=400, detail="Decisions required for selective action")
        
        for req in requests:
            req_id_str = str(req.id)
            if req_id_str in response.decisions:
                decision = response.decisions[req_id_str]
                if decision not in ["approved", "rejected"]:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid decision '{decision}' for request {req.id}"
                    )
                
                req.item_status = decision
                req.responded_at = now
                req.owner_response = response.response_message
                
                song = db.query(Song).filter(Song.id == req.song_id).first()
                
                if decision == "approved":
                    req.status = "accepted"
                    if song:
                        approved_songs.append(song.title)
                        if song.pack_id:
                            pack_ids_to_grant.add(song.pack_id)
                        
                        if not response.grant_full_pack_permissions:
                            _create_song_collaboration(db, song, req.requester_id)
                    approved_count += 1
                else:
                    req.status = "rejected"
                    if song:
                        rejected_songs.append(song.title)
                    rejected_count += 1
        
        # Set batch status based on decisions
        if approved_count == 0:
            batch.status = "rejected"
        elif rejected_count == 0:
            batch.status = "approved"
        else:
            batch.status = "partially_approved"
    
    # Grant pack permissions if requested and there were approvals
    if response.grant_full_pack_permissions and pack_ids_to_grant and approved_count > 0:
        _grant_pack_permissions(db, pack_ids_to_grant, batch.requester_id)
        batch.grant_full_pack_permissions = True
    
    batch.response_message = response.response_message
    batch.responded_at = now
    
    db.commit()
    
    # Send notification to requester
    try:
        _send_batch_response_notification(
            db=db,
            batch=batch,
            requester=requester,
            owner=current_user,
            approved_count=approved_count,
            rejected_count=rejected_count,
            approved_songs=approved_songs,
            rejected_songs=rejected_songs,
            grant_full_pack_permissions=response.grant_full_pack_permissions and batch.grant_full_pack_permissions,
            pack_ids=pack_ids_to_grant if response.grant_full_pack_permissions else set()
        )
    except Exception as notif_err:
        print(f"⚠️ Failed to send batch response notification: {notif_err}")
    
    # Log activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="respond_batch_collaboration_request",
            description=f"{response.action} batch request from {requester.username} ({approved_count} approved, {rejected_count} rejected)",
            metadata={
                "batch_id": batch_id,
                "action": response.action,
                "approved_count": approved_count,
                "rejected_count": rejected_count,
                "grant_full_pack_permissions": batch.grant_full_pack_permissions
            }
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log batch response activity: {log_err}")
    
    # Check achievements if any collaborations were created
    if approved_count > 0:
        try:
            from api.achievements import check_social_collaboration_achievements
            check_social_collaboration_achievements(db, current_user.id)
            check_social_collaboration_achievements(db, batch.requester_id)
        except Exception as ach_err:
            print(f"⚠️ Failed to check achievements: {ach_err}")
    
    return {
        "batch_id": batch_id,
        "status": batch.status,
        "approved_count": approved_count,
        "rejected_count": rejected_count,
        "grant_full_pack_permissions": batch.grant_full_pack_permissions,
        "message": f"Batch response processed: {approved_count} approved, {rejected_count} rejected"
    }


@router.delete("/batches/{batch_id}")
def cancel_batch_request(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cancel a batch collaboration request (only by requester)"""
    
    batch = db.query(CollaborationRequestBatch).filter(
        CollaborationRequestBatch.id == batch_id,
        CollaborationRequestBatch.requester_id == current_user.id,
        CollaborationRequestBatch.status == "pending"
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found or cannot be cancelled")
    
    # Delete all requests in the batch
    db.query(CollaborationRequest).filter(
        CollaborationRequest.batch_id == batch_id
    ).delete()
    
    # Update batch status
    batch.status = "cancelled"
    
    db.commit()
    
    return {"message": "Batch collaboration request cancelled", "batch_id": batch_id}


def _create_song_collaboration(db: Session, song: Song, user_id: int):
    """Create a song-level collaboration entry"""
    # Check if collaboration already exists
    existing = db.query(Collaboration).filter(
        Collaboration.song_id == song.id,
        Collaboration.user_id == user_id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).first()
    
    if not existing:
        collaboration = Collaboration(
            song_id=song.id,
            user_id=user_id,
            collaboration_type=CollaborationType.SONG_EDIT
        )
        db.add(collaboration)


def _grant_pack_permissions(db: Session, pack_ids: set, user_id: int):
    """Grant pack-level edit permissions to a user"""
    for pack_id in pack_ids:
        # Check if pack permission already exists
        existing = db.query(Collaboration).filter(
            Collaboration.pack_id == pack_id,
            Collaboration.user_id == user_id,
            Collaboration.collaboration_type == CollaborationType.PACK_EDIT
        ).first()
        
        if not existing:
            collaboration = Collaboration(
                pack_id=pack_id,
                user_id=user_id,
                collaboration_type=CollaborationType.PACK_EDIT
            )
            db.add(collaboration)


def _send_batch_response_notification(
    db: Session,
    batch: CollaborationRequestBatch,
    requester: User,
    owner: User,
    approved_count: int,
    rejected_count: int,
    approved_songs: List[str],
    rejected_songs: List[str],
    grant_full_pack_permissions: bool,
    pack_ids: set
):
    """Send notification to requester about batch response"""
    
    if grant_full_pack_permissions and pack_ids:
        # Get pack names
        packs = db.query(Pack).filter(Pack.id.in_(pack_ids)).all()
        pack_names = [p.name for p in packs]
        
        if len(pack_names) == 1:
            title = "Collaboration Request Approved ✅"
            message = f"{owner.username} granted you full pack access to '{pack_names[0]}'"
        else:
            title = "Collaboration Request Approved ✅"
            message = f"{owner.username} granted you full pack access to {len(pack_names)} packs"
    elif approved_count > 0 and rejected_count == 0:
        title = "Collaboration Request Approved ✅"
        message = f"{owner.username} approved your request for {approved_count} song{'s' if approved_count > 1 else ''}"
    elif approved_count == 0 and rejected_count > 0:
        title = "Collaboration Request Rejected"
        message = f"{owner.username} declined your collaboration request for {rejected_count} song{'s' if rejected_count > 1 else ''}"
    else:
        title = "Collaboration Request Partially Approved"
        message = f"{owner.username} approved {approved_count} of {approved_count + rejected_count} songs"
    
    create_notification(
        db=db,
        user_id=requester.id,
        notification_type=NotificationType.COLLAB_BATCH_RESPONSE.value,
        title=title,
        message=message,
        metadata={
            "batch_id": batch.id,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "approved_songs": approved_songs[:5],  # Limit to 5 for metadata
            "rejected_songs": rejected_songs[:5],
            "grant_full_pack_permissions": grant_full_pack_permissions
        }
    )