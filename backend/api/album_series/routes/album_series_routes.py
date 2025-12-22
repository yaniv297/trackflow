"""Core album series route handlers."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from schemas import AlbumSeriesResponse, AlbumSeriesDetailResponse, CreateAlbumSeriesRequest
from api.auth import get_current_active_user
from ..services.album_series_service import AlbumSeriesService
from ..validators.album_series_validators import UpdateAlbumSeriesStatusRequest, UpdateRgwPostUrlRequest

router = APIRouter()


@router.get("/", response_model=List[AlbumSeriesResponse])
def get_album_series(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all album series, with song count and authors."""
    try:
        service = AlbumSeriesService(db)
        return service.get_all_album_series(current_user)
    except Exception as e:
        print(f"Error getting album series: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching album series: {str(e)}")


@router.get("/{series_id}", response_model=AlbumSeriesDetailResponse)
def get_album_series_detail(series_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific album series."""
    try:
        service = AlbumSeriesService(db)
        result = service.get_album_series_detail(series_id)
        if not result:
            raise HTTPException(status_code=404, detail="Album series not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching series: {str(e)}")


@router.get("/{series_id}/songs")
def get_album_series_songs(series_id: int, db: Session = Depends(get_db)):
    """Get all songs for a specific album series."""
    try:
        service = AlbumSeriesService(db)
        result = service.get_album_series_detail(series_id)
        if not result:
            raise HTTPException(status_code=404, detail="Album series not found")
        
        # Return both album and bonus songs combined
        all_songs = result.get("album_songs", []) + result.get("bonus_songs", [])
        return all_songs
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching songs for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching songs: {str(e)}")


@router.post("/create-from-pack")
def create_album_series_from_pack(
    request: CreateAlbumSeriesRequest,
    db: Session = Depends(get_db)
):
    """Create an album series from a pack of WIP or Future songs."""
    try:
        service = AlbumSeriesService(db)
        return service.create_from_pack(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error creating album series from pack: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating album series: {str(e)}")


@router.put("/{series_id}/release")
def release_album_series(series_id: int, db: Session = Depends(get_db)):
    """Release an album series and assign it a series number."""
    try:
        service = AlbumSeriesService(db)
        return service.release_series(series_id)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error releasing series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error releasing series: {str(e)}")


@router.put("/{series_id}/status")
def update_album_series_status(
    series_id: int, 
    request: UpdateAlbumSeriesStatusRequest,
    db: Session = Depends(get_db)
):
    """Update the status of an album series."""
    try:
        service = AlbumSeriesService(db)
        return service.update_status(series_id, request.status)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error updating status for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")


@router.put("/{series_id}/rgw-post-url")
def update_rgw_post_url(
    series_id: int,
    request: UpdateRgwPostUrlRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Update the RGW post URL for an album series. Only allowed for pack owner if released."""
    try:
        service = AlbumSeriesService(db)
        return service.update_rgw_post_url(series_id, request.rgw_post_url, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        print(f"Error updating RGW post URL for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating RGW post URL: {str(e)}")


@router.delete("/{series_id}")
def delete_album_series(series_id: int, db: Session = Depends(get_db), 
                       current_user = Depends(get_current_active_user)):
    """Delete an album series and all its songs."""
    try:
        service = AlbumSeriesService(db)
        return service.delete_series(series_id, current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        print(f"Error deleting series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting series: {str(e)}")