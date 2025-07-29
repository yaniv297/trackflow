from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import AlbumSeries, Song, SongCollaboration, SongStatus
from schemas import AlbumSeriesResponse, AlbumSeriesDetailResponse, CreateAlbumSeriesRequest
from typing import List
from datetime import datetime
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
import os
from pydantic import BaseModel

# Spotify credentials
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "7939abf6b76d4fc7a627869350dbe3d7")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "b1aefd1ba3504dc28a441b1344698bd9")

router = APIRouter(prefix="/album-series", tags=["Album Series"], trailing_slash=False)

class UpdateAlbumSeriesStatusRequest(BaseModel):
    status: str

def get_unique_authors_for_series(db: Session, series_id: int) -> List[str]:
    """Get unique authors for a series from both songs and collaborations"""
    # Get authors from songs
    song_authors = db.query(Song.author).filter(
        Song.album_series_id == series_id,
        Song.author.isnot(None)
    ).distinct().all()
    
    # Get authors from collaborations
    collab_authors = db.query(SongCollaboration.author).join(Song).filter(
        Song.album_series_id == series_id,
        SongCollaboration.author.isnot(None)
    ).distinct().all()
    
    # Combine and deduplicate
    all_authors = set()
    for (author,) in song_authors:
        if author:
            all_authors.add(author)
    for (author,) in collab_authors:
        if author:
            all_authors.add(author)
    
    return sorted(list(all_authors))

@router.get("", response_model=List[AlbumSeriesResponse])
def get_album_series(db: Session = Depends(get_db)):
    """Get all album series, with song count and authors"""
    # Order by series_number (nulls last), then by created_at for planned/in-progress
    series = db.query(AlbumSeries).order_by(
        AlbumSeries.series_number.nulls_last(),
        AlbumSeries.created_at.desc()
    ).all()
    
    # Add song count and authors to each series
    result = []
    for s in series:
        song_count = db.query(Song).filter(Song.album_series_id == s.id).count()
        authors = get_unique_authors_for_series(db, s.id)
        
        # Create response object
        response_data = {
            "id": s.id,
            "series_number": s.series_number,
            "album_name": s.album_name,
            "artist_name": s.artist_name,
            "year": s.year,
            "cover_image_url": s.cover_image_url,
            "status": s.status,
            "description": s.description,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "song_count": song_count,
            "authors": authors
        }
        result.append(AlbumSeriesResponse(**response_data))
    return result

@router.get("/{series_id}", response_model=AlbumSeriesDetailResponse)
def get_album_series_detail(series_id: int, db: Session = Depends(get_db)):
    """Get detailed information about a specific album series"""
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")
    
    # Get all songs for this series with collaborations and authoring data
    songs = db.query(Song).options(
        joinedload(Song.collaborations),
        joinedload(Song.authoring)
    ).filter(Song.album_series_id == series_id).all()
    
    # Split songs into album songs and bonus songs based on album field
    album_songs = [song for song in songs if song.album and song.album.lower() == series.album_name.lower()]
    bonus_songs = [song for song in songs if song not in album_songs]
    
    # Get unique authors
    authors = get_unique_authors_for_series(db, series_id)
    
    return {
        "id": series.id,
        "series_number": series.series_number,
        "album_name": series.album_name,
        "artist_name": series.artist_name,
        "year": series.year,
        "cover_image_url": series.cover_image_url,
        "status": series.status,
        "description": series.description,
        "created_at": series.created_at,
        "updated_at": series.updated_at,
        "album_songs": album_songs,
        "bonus_songs": bonus_songs,
        "total_songs": len(songs),
        "authors": authors
    }

@router.get("/{series_id}/songs")
def get_album_series_songs(series_id: int, db: Session = Depends(get_db)):
    """Get all songs for a specific album series"""
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")
    
    songs = db.query(Song).options(
        joinedload(Song.collaborations),
        joinedload(Song.authoring)
    ).filter(Song.album_series_id == series_id).all()
    return songs

@router.post("/create-from-pack")
def create_album_series_from_pack(
    request: CreateAlbumSeriesRequest,
    db: Session = Depends(get_db)
):
    """Create an album series from a pack of WIP or Future songs"""
    

    
    pack_name = request.pack_name
    artist_name = request.artist_name
    album_name = request.album_name
    year = request.year
    cover_image_url = request.cover_image_url
    description = request.description
    
    # Check if pack exists and has WIP/Future songs
    songs = db.query(Song).filter(
        Song.pack == pack_name,
        Song.status.in_([SongStatus.wip, SongStatus.future])
    ).all()
    
    if not songs:
        raise HTTPException(
            status_code=404, 
            detail=f"No WIP or Future songs found for pack '{pack_name}'"
        )
    
    # Check if album series already exists for this artist/album
    existing_series = db.query(AlbumSeries).filter(
        AlbumSeries.artist_name == artist_name,
        AlbumSeries.album_name == album_name
    ).first()
    
    if existing_series:
        raise HTTPException(
            status_code=400,
            detail=f"Album series already exists for {artist_name} - {album_name}"
        )
    
    # Determine status based on song statuses
    song_statuses = [song.status for song in songs]
    if SongStatus.wip in song_statuses:
        status = "in_progress"
    else:
        status = "planned"
    
    # Create album series (without series number for now)
    album_series = AlbumSeries(
        series_number=None,  # Will be assigned when released
        album_name=album_name,
        artist_name=artist_name,
        year=year,
        cover_image_url=cover_image_url,
        status=status,
        description=description,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(album_series)
    db.commit()
    db.refresh(album_series)
    
    # Link all songs in the pack to this album series
    for song in songs:
        song.album_series_id = album_series.id
    
    db.commit()
    
    # Auto-fetch album art if not provided
    if not cover_image_url:
        try:
            sp = Spotify(auth_manager=SpotifyClientCredentials(
                client_id=SPOTIFY_CLIENT_ID,
                client_secret=SPOTIFY_CLIENT_SECRET
            ))
            
            # Search for the album
            search_query = f"artist:{artist_name} album:{album_name}"
            results = sp.search(q=search_query, type="album", limit=1)
            
            if results["albums"]["items"]:
                album = results["albums"]["items"][0]
                if album["images"]:
                    album_series.cover_image_url = album["images"][0]["url"]
                    db.commit()
                    db.refresh(album_series)
        except Exception as e:
            print(f"Failed to fetch album art for {artist_name} - {album_name}: {e}")
    
    return album_series

@router.put("/{series_id}/release")
def release_album_series(series_id: int, db: Session = Depends(get_db)):
    """Release an album series and assign it a series number"""
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")
    
    if series.status == "released":
        raise HTTPException(status_code=400, detail="Album series is already released")
    
    # Find the next available series number
    max_series_number = db.query(AlbumSeries.series_number).filter(
        AlbumSeries.series_number.isnot(None)
    ).order_by(AlbumSeries.series_number.desc()).first()
    
    next_series_number = 1 if max_series_number is None else max_series_number[0] + 1
    
    # Update series
    series.series_number = next_series_number
    series.status = "released"
    series.updated_at = datetime.utcnow()
    
    # Update all songs in the series to released status
    songs = db.query(Song).filter(Song.album_series_id == series_id).all()
    for song in songs:
        song.status = SongStatus.released
    
    db.commit()
    
    return {
        "message": f"Album series '{series.album_name}' by {series.artist_name} released as series #{next_series_number}",
        "series_number": next_series_number
    }

@router.post("/{series_id}/fetch-album-art")
def fetch_album_art_for_series(series_id: int, db: Session = Depends(get_db)):
    """Fetch album art for an album series using Spotify API"""
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")
    
    try:
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        # Search for the album
        search_query = f"artist:{series.artist_name} album:{series.album_name}"
        results = sp.search(q=search_query, type="album", limit=1)
        
        if results["albums"]["items"]:
            album = results["albums"]["items"][0]
            if album["images"]:
                series.cover_image_url = album["images"][0]["url"]
                series.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(series)
                
                return {
                    "message": f"Album art fetched successfully for {series.artist_name} - {series.album_name}",
                    "cover_image_url": series.cover_image_url
                }
            else:
                raise HTTPException(status_code=404, detail="No album art found for this album")
        else:
            raise HTTPException(status_code=404, detail="Album not found on Spotify")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch album art: {str(e)}")

@router.post("/fetch-all-album-art")
def fetch_album_art_for_all_series(db: Session = Depends(get_db)):
    """Fetch album art for all album series that don't have it"""
    series_without_art = db.query(AlbumSeries).filter(
        AlbumSeries.cover_image_url.is_(None)
    ).all()
    
    if not series_without_art:
        return {"message": "All album series already have cover art"}
    
    try:
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        updated_count = 0
        for series in series_without_art:
            try:
                # Search for the album
                search_query = f"artist:{series.artist_name} album:{series.album_name}"
                results = sp.search(q=search_query, type="album", limit=1)
                
                if results["albums"]["items"]:
                    album = results["albums"]["items"][0]
                    if album["images"]:
                        series.cover_image_url = album["images"][0]["url"]
                        series.updated_at = datetime.utcnow()
                        updated_count += 1
            except Exception as e:
                print(f"Failed to fetch album art for {series.artist_name} - {series.album_name}: {e}")
                continue
        
        db.commit()
        
        return {
            "message": f"Updated album art for {updated_count} out of {len(series_without_art)} series",
            "updated_count": updated_count,
            "total_series": len(series_without_art)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch album art: {str(e)}") 

@router.put("/{series_id}/status")
def update_album_series_status(
    series_id: int, 
    request: UpdateAlbumSeriesStatusRequest,
    db: Session = Depends(get_db)
):
    """Update the status of an album series"""
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")
    
    # Validate status
    valid_statuses = ["planned", "in_progress", "released"]
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    # Update status
    series.status = request.status
    series.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(series)
    
    return {
        "message": f"Album series '{series.album_name}' status updated to '{request.status}'",
        "status": request.status
    } 