from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, text
from database import get_db
from models import CollaborationRequest, Song, User, Collaboration, CollaborationType, Authoring
from api.auth import get_current_active_user
from api.activity_logger import log_activity
from models import Notification
from pydantic import BaseModel
from typing import List, Optional
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
        print(f"⚠️ Failed to create notification: {notif_err}")
    
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
        print(f"⚠️ Failed to log activity: {log_err}")
    
    # Check collaboration request achievements
    try:
        from api.achievements import check_collaboration_request_achievements
        check_collaboration_request_achievements(db, current_user.id)
    except Exception as ach_err:
        print(f"⚠️ Failed to check achievements: {ach_err}")
    
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
        if song.status == "Future Plans":
            # Give full edit permissions for future plans
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
    
    db.commit()
    
    # Create notification for requester
    try:
        notification_title = f"Collaboration Request {'Accepted' if response.response == 'accepted' else 'Rejected'}"
        notification_message = f"{current_user.username} {response.response} your collaboration request for '{song.title}'"
        
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
                "owner_message": response.message
            }
        )
    except Exception as notif_err:
        print(f"⚠️ Failed to create response notification: {notif_err}")
    
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
        print(f"⚠️ Failed to log response activity: {log_err}")
    
    # Check achievements if collaboration was accepted
    if response.response == "accepted":
        try:
            from api.achievements import check_social_collaboration_achievements
            check_social_collaboration_achievements(db, current_user.id)  # For song owner (adding collaborator)
            check_social_collaboration_achievements(db, collab_request.requester_id)  # For collaborator (being added)
        except Exception as ach_err:
            print(f"⚠️ Failed to check achievements: {ach_err}")
    
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
        print(f"⚠️ Failed to create reopened notification: {notif_err}")
    
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