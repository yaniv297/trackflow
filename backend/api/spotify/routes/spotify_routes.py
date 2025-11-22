"""
Spotify API routes - handles HTTP requests for Spotify operations.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from api.auth import get_current_active_user
from ..services.spotify_service import SpotifyService
from ..validators.spotify_validators import (
    TracklistItem, SpotifyEnhanceRequest, SpotifyPlaylistImportRequest,
    SpotifyOptionResponse, ArtistImageFetchResponse, BulkImageFetchResponse
)


router = APIRouter(prefix="/spotify", tags=["Spotify"])
spotify_service = SpotifyService()


@router.get("/album-tracklist", response_model=List[TracklistItem])
def get_album_tracklist(
    artist: str = Query(..., description="Artist name"),
    album: str = Query(..., description="Album name"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get Spotify tracklist for an album"""
    try:
        return spotify_service.get_album_tracklist(artist, album, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{song_id}/spotify-options/", response_model=List[SpotifyOptionResponse])
def get_spotify_options(
    song_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get Spotify track options for a song"""
    try:
        return spotify_service.get_spotify_options_for_song(song_id, db)
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{song_id}/enhance/")
def enhance_song(
    song_id: int,
    request: SpotifyEnhanceRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Enhance a song with Spotify track data"""
    try:
        return spotify_service.enhance_song_and_return_response(song_id, request.track_id, db, current_user)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        elif "not available" in error_msg.lower() or "credentials" in error_msg.lower():
            raise HTTPException(status_code=500, detail=error_msg)
        raise HTTPException(status_code=500, detail=f"Failed to enhance song: {error_msg}")


@router.post("/import-playlist")
def import_playlist(
    req: SpotifyPlaylistImportRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    """
    Import all tracks from a Spotify playlist as songs for the current user.
    """
    try:
        result = spotify_service.import_playlist(req, db, current_user)
        
        # Log import activity
        from api.activity_logger import log_activity
        try:
            log_activity(
                db=db,
                user_id=current_user.id,
                activity_type="import_spotify",
                description=f"{current_user.username} has imported {result['imported_count']} song(s) from Spotify",
                metadata={
                    "imported_count": result["imported_count"], 
                    "playlist_url": req.playlist_url, 
                    "status": req.status, 
                    "pack": req.pack
                }
            )
        except Exception as log_err:
            print(f"⚠️ Failed to log import_spotify activity: {log_err}")
        
        # Check achievements
        try:
            from api.achievements import check_spotify_achievements
            check_spotify_achievements(db, current_user.id)
        except Exception as ach_err:
            print(f"⚠️ Failed to check achievements: {ach_err}")
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        if "failed to read playlist" in error_msg.lower():
            raise HTTPException(status_code=400, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/artists/{artist_id}/fetch-image", response_model=ArtistImageFetchResponse)
def fetch_artist_image(
    artist_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch artist image from Spotify for a specific artist"""
    try:
        return spotify_service.fetch_artist_image(artist_id, db)
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        elif "credentials" in error_msg.lower():
            raise HTTPException(status_code=500, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/artists/fetch-all-missing-images", response_model=BulkImageFetchResponse)
def fetch_all_missing_artist_images(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch artist images for all artists that don't have them (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        return spotify_service.fetch_all_missing_artist_images(db)
    except Exception as e:
        error_msg = str(e)
        if "credentials" in error_msg.lower():
            raise HTTPException(status_code=500, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)