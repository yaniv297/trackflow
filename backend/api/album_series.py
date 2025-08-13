from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import AlbumSeries, Song, Collaboration, CollaborationType, SongStatus, User, Pack
from schemas import AlbumSeriesResponse, AlbumSeriesDetailResponse, CreateAlbumSeriesRequest
from typing import List
from datetime import datetime
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
import os
from pydantic import BaseModel
from api.auth import get_current_active_user

# Spotify credentials
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "7939abf6b76d4fc7a627869350dbe3d7")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "b1aefd1ba3504dc28a441b1344698bd9")

router = APIRouter(prefix="/album-series", tags=["Album Series"])

class UpdateAlbumSeriesStatusRequest(BaseModel):
    status: str

def get_unique_authors_for_series(db: Session, series_id: int) -> List[str]:
    """Get unique authors for a series from both songs and collaborations"""
    # Get authors from songs (using user relationship)
    song_authors = db.query(User.username).join(Song).join(Pack, Song.pack_id == Pack.id, isouter=True).filter(
        (Song.album_series_id == series_id) |
        ((Song.album_series_id.is_(None)) & (Pack.album_series_id == series_id)),
        User.username.isnot(None)
    ).distinct().all()
    
    # Get authors from collaborations (using the new unified collaboration structure)
    collab_authors = db.query(User.username).join(Collaboration).join(Song).join(Pack, Song.pack_id == Pack.id, isouter=True).filter(
        (Song.album_series_id == series_id) |
        ((Song.album_series_id.is_(None)) & (Pack.album_series_id == series_id)),
        User.username.isnot(None)
    ).distinct().all()
    
    # Combine and deduplicate
    all_authors = set()
    for (username,) in song_authors:
        if username:
            all_authors.add(username)
    for (username,) in collab_authors:
        if username:
            all_authors.add(username)
    
    return sorted(list(all_authors))

@router.get("/", response_model=List[AlbumSeriesResponse])
def get_album_series(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Get all album series, with song count and authors"""
    # For released series, show all
    # For in_progress and planned series, only show if user is involved
    
    # Get all series
    all_series = db.query(AlbumSeries).order_by(
        AlbumSeries.series_number.nulls_last(),
        AlbumSeries.created_at.desc()
    ).all()
    
    # Filter series based on user involvement
    filtered_series = []
    for s in all_series:
        # Always include released series
        if s.status == "released":
            filtered_series.append(s)
            continue
            
        # For in_progress and planned series, check if user is involved
        # User is involved if they own any song in the series OR are a collaborator on any song
        user_involved = db.query(Song).filter(
            Song.album_series_id == s.id,
            Song.user_id == current_user.id
        ).first() is not None
        
        if not user_involved:
            # Check if user is a collaborator on any song in this series
            user_collaboration = db.query(Collaboration).join(Song).filter(
                Song.album_series_id == s.id,
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            ).first()
            user_involved = user_collaboration is not None
            
        if user_involved:
            filtered_series.append(s)
    
    # Add song count and authors to each series
    result = []
    for s in filtered_series:
        song_count = db.query(Song).join(Pack, Song.pack_id == Pack.id, isouter=True).filter(
            (Song.album_series_id == s.id) |
            ((Song.album_series_id.is_(None)) & (Pack.album_series_id == s.id))
        ).count()
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
    try:
        series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
        if not series:
            raise HTTPException(status_code=404, detail="Album series not found")
    except Exception as e:
        print(f"Error fetching series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching series: {str(e)}")
    
    # Get all songs for this series with collaborations and authoring data
    try:
        songs = db.query(Song).options(
            joinedload(Song.collaborations).joinedload(Collaboration.user),
            joinedload(Song.user),  # Load the song owner
            joinedload(Song.pack_obj),  # Load the pack relationship
            joinedload(Song.authoring)
        ).join(Pack, Song.pack_id == Pack.id, isouter=True).filter(
            (Song.album_series_id == series_id) |
            ((Song.album_series_id.is_(None)) & (Pack.album_series_id == series_id))
        ).all()
    except Exception as e:
        print(f"Error fetching songs for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching songs: {str(e)}")
    
    # Split songs into album songs and bonus songs based on album field
    album_songs = [song for song in songs if song.album and song.album.lower() == series.album_name.lower()]
    bonus_songs = [song for song in songs if song not in album_songs]
    
    # Format songs with properly structured collaborations
    def format_song_for_response(song):
        try:
            song_dict = {
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "album": song.album,
                "status": song.status,
                "pack_name": song.pack_obj.name if song.pack_obj else None,
                "year": song.year,
                "album_cover": song.album_cover,
                "author": song.user.username if song.user else None,
                "user_id": song.user_id,
                "optional": song.optional,
                "album_series_id": song.album_series_id,
                "collaborations": [],
                "authoring": song.authoring
            }
            
            # Format collaborations with author field for backward compatibility
            if song.collaborations:
                song_dict["collaborations"] = [
                    {
                        "id": collab.id,
                        "collaborator_id": collab.collaborator_id,
                        "author": collab.collaborator.username if collab.collaborator else None,
                        "role": collab.role,
                        "created_at": collab.created_at
                    }
                    for collab in song.collaborations
                    if collab.collaborator  # Only include collaborations with valid collaborators
                ]
            
            return song_dict
        except Exception as e:
            print(f"Error formatting song {song.id}: {e}")
            # Return a minimal song dict if there's an error
            return {
                "id": song.id,
                "title": song.title or "Unknown",
                "artist": song.artist or "Unknown",
                "album": song.album,
                "status": song.status,
                "pack_name": song.pack_obj.name if song.pack_obj else None,
                "year": song.year,
                "album_cover": song.album_cover,
                "author": song.user.username if song.user else None,
                "user_id": song.user_id,
                "optional": song.optional,
                "album_series_id": song.album_series_id,
                "collaborations": [],
                "authoring": song.authoring
            }
    
    try:
        formatted_album_songs = [format_song_for_response(song) for song in album_songs]
        formatted_bonus_songs = [format_song_for_response(song) for song in bonus_songs]
    except Exception as e:
        print(f"Error formatting songs for series {series_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error formatting songs: {str(e)}")
    
    # Get unique authors
    try:
        authors = get_unique_authors_for_series(db, series_id)
    except Exception as e:
        print(f"Error getting authors for series {series_id}: {e}")
        authors = []
    
    # Get pack data if available
    pack_id = None
    pack_name = None
    if series.pack_id:
        pack = db.query(Pack).filter(Pack.id == series.pack_id).first()
        if pack:
            pack_id = pack.id
            pack_name = pack.name
    
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
        "pack_id": pack_id,
        "pack_name": pack_name,
        "album_songs": formatted_album_songs,
        "bonus_songs": formatted_bonus_songs,
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
        joinedload(Song.collaborations).joinedload(Collaboration.user),
        joinedload(Song.pack_obj),  # Load the pack relationship
        joinedload(Song.authoring)
    ).join(Pack, Song.pack_id == Pack.id, isouter=True).filter(
        (Song.album_series_id == series_id) |
        ((Song.album_series_id.is_(None)) & (Pack.album_series_id == series_id))
    ).all()
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
    pack = db.query(Pack).filter(Pack.name == pack_name).first()
    if not pack:
        raise HTTPException(
            status_code=404,
            detail=f"Pack '{pack_name}' not found"
        )

    songs = db.query(Song).filter(
        Song.pack_id == pack.id,
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

    # Determine status: if any song is WIP -> in_progress, else planned
    song_statuses = [song.status for song in songs]
    if SongStatus.wip in song_statuses:
        status = "in_progress"
    else:
        status = "planned"

    # Create album series (without series number for now)
    album_series = AlbumSeries(
        series_number=None,
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

    # Link the PACK to this album series (pack-level association)
    pack.album_series_id = album_series.id
    # Also link the series back to the pack for fast lookups
    album_series.pack_id = pack.id

    # Optionally, we can keep song.album_series_id for backward-compat during transition
    # but pack-level is now the source of truth. We leave songs as-is for now.

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