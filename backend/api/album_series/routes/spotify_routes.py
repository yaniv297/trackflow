"""Spotify-related route handlers."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from api.auth import get_current_active_user
from ..services.album_series_service import SpotifyService

router = APIRouter()


@router.post("/{series_id}/fetch-album-art")
def fetch_album_art_for_series(series_id: int, db: Session = Depends(get_db)):
    """Fetch album art for an album series using Spotify API."""
    try:
        service = SpotifyService(db)
        return service.fetch_album_art(series_id)
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error fetching album art for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch album art: {str(e)}")


@router.post("/fetch-all-album-art")
def fetch_album_art_for_all_series(db: Session = Depends(get_db)):
    """Fetch album art for all album series that don't have it."""
    try:
        service = SpotifyService(db)
        return service.fetch_all_album_art()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error fetching album art for all series: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch album art: {str(e)}")