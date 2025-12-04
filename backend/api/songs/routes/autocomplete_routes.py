from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User
from api.auth import get_current_active_user

from ..services.song_service import SongService
from ..validators.song_validators import SongValidator


router = APIRouter()


@router.get("/all-artists")
def get_all_artists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all unique artist names."""
    service = SongService(db)
    artists = service.get_all_artists()
    return {"artists": artists}


@router.get("/autocomplete/artists")
def get_artists_autocomplete(
    query: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get artist autocomplete suggestions."""
    if query:
        SongValidator.validate_autocomplete_query(query)
    
    service = SongService(db)
    suggestions = service.get_autocomplete_suggestions("artists", query, current_user)
    return {"suggestions": suggestions}


@router.get("/autocomplete/albums")
def get_albums_autocomplete(
    query: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get album autocomplete suggestions."""
    if query:
        SongValidator.validate_autocomplete_query(query)
    
    service = SongService(db)
    suggestions = service.get_autocomplete_suggestions("albums", query, current_user)
    return {"suggestions": suggestions}


@router.get("/autocomplete/collaborators")
def get_collaborators_autocomplete(
    query: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get collaborator autocomplete suggestions."""
    if query:
        SongValidator.validate_autocomplete_query(query)
    
    service = SongService(db)
    suggestions = service.get_autocomplete_suggestions("collaborators", query, current_user)
    return {"suggestions": suggestions}


@router.get("/autocomplete/packs")
def get_packs_autocomplete(
    query: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get pack autocomplete suggestions."""
    if query and query.strip():
        SongValidator.validate_autocomplete_query(query)
    
    service = SongService(db)
    suggestions = service.get_autocomplete_suggestions("packs", query, current_user)
    return {"suggestions": suggestions}