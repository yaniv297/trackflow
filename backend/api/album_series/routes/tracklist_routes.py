"""Tracklist-related route handlers."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from api.auth import get_current_active_user
from ..services.tracklist_service import TracklistService
from ..validators.album_series_validators import (
    TracklistItem, PreexistingUpdate, IrrelevantUpdate, 
    DiscActionRequest, AddMissingRequest, OverrideRequest
)

router = APIRouter()


@router.get("/{series_id}/spotify-tracklist", response_model=List[TracklistItem])
def get_spotify_tracklist(series_id: int, db: Session = Depends(get_db), 
                         current_user = Depends(get_current_active_user)):
    """Get Spotify tracklist for an album series."""
    try:
        service = TracklistService(db)
        return service.get_spotify_tracklist(series_id)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error getting Spotify tracklist for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching tracklist: {str(e)}")


@router.post("/{series_id}/preexisting")
def set_preexisting(series_id: int, payload: PreexistingUpdate, 
                   db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Set preexisting flags for tracks."""
    try:
        service = TracklistService(db)
        return service.set_preexisting_flags(series_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error setting preexisting flags for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating preexisting flags: {str(e)}")


@router.post("/{series_id}/irrelevant")
def set_irrelevant(series_id: int, payload: IrrelevantUpdate, 
                  db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Set irrelevant flags for tracks."""
    try:
        service = TracklistService(db)
        return service.set_irrelevant_flags(series_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error setting irrelevant flags for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating irrelevant flags: {str(e)}")


@router.post("/{series_id}/disc-action")
def disc_action(series_id: int, payload: DiscActionRequest, 
               db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Mark/unmark entire disc as irrelevant."""
    try:
        service = TracklistService(db)
        return service.disc_action(series_id, payload)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error performing disc action for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error performing disc action: {str(e)}")


@router.post("/{series_id}/check-dlc")
def check_dlc_for_series(series_id: int, db: Session = Depends(get_db), 
                        current_user = Depends(get_current_active_user)):
    """Check all songs in an album series against the Rock Band DLC database."""
    try:
        service = TracklistService(db)
        return service.check_dlc_status(series_id)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error checking DLC for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check DLC status: {str(e)}")


@router.post("/{series_id}/add-missing", response_model=List[int])
def add_missing_tracks(series_id: int, request: AddMissingRequest, 
                      db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Add missing tracks to an album series."""
    try:
        service = TracklistService(db)
        return service.add_missing_tracks(series_id, request, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error adding missing tracks to series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error adding missing tracks: {str(e)}")


@router.post("/{series_id}/override")
def set_override(series_id: int, request: OverrideRequest, 
                db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Set override for a track to link to a specific song."""
    try:
        service = TracklistService(db)
        return service.set_override(series_id, request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Error setting override for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error setting override: {str(e)}")


@router.delete("/{series_id}/override")
def delete_override(series_id: int, spotify_track_id: Optional[str] = Query(None), 
                   title_clean: Optional[str] = Query(None), 
                   db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Delete override for a track."""
    try:
        service = TracklistService(db)
        return service.delete_override(series_id, spotify_track_id, title_clean)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error deleting override for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting override: {str(e)}")