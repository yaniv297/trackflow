from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import AlbumSeries, Song, Collaboration, CollaborationType, SongStatus, User, Pack, AlbumSeriesPreexisting, AlbumSeriesOverride, RockBandDLC
from schemas import AlbumSeriesResponse, AlbumSeriesDetailResponse, CreateAlbumSeriesRequest
from typing import List, Optional
from datetime import datetime
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
import os
from pydantic import BaseModel
from api.auth import get_current_active_user
from api.tools import clean_string

# Spotify credentials
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

router = APIRouter(prefix="/album-series", tags=["Album Series"])

def check_dlc_status(db: Session, title: str, artist: str) -> bool:
    """
    Check if a song is already official Rock Band DLC.
    Returns True if the song is DLC, False otherwise.
    No caching - just direct check.
    """
    dlc_entry = db.query(RockBandDLC).filter(
        RockBandDLC.title.ilike(title),
        RockBandDLC.artist.ilike(artist)
    ).first()
    
    return dlc_entry is not None

class UpdateAlbumSeriesStatusRequest(BaseModel):
    status: str

class TracklistItem(BaseModel):
    spotify_track_id: Optional[str] = None
    title: str
    title_clean: str
    artist: str
    track_number: Optional[int] = None
    disc_number: Optional[int] = None
    in_pack: bool = False
    status: Optional[str] = None
    song_id: Optional[int] = None
    official: bool = False
    pre_existing: bool = False
    irrelevant: bool = False

class PreexistingUpdate(BaseModel):
    updates: List[dict]

class IrrelevantUpdate(BaseModel):
    updates: List[dict]

class DiscActionRequest(BaseModel):
    disc_number: int
    action: str  # "mark_irrelevant" or "unmark_irrelevant"

class AddMissingRequest(BaseModel):
    tracks: List[dict]
    pack_id: int

def get_unique_authors_for_series(db: Session, series_id: int) -> List[str]:
    """Get unique authors for a series from both songs and collaborations"""
    # Get authors from songs (using user relationship)
    song_authors = db.query(User.username).join(Song).filter(
        Song.album_series_id == series_id,
        User.username.isnot(None)
    ).distinct().all()
    
    collab_authors = db.query(User.username).join(Collaboration).join(Song).filter(
        Song.album_series_id == series_id,
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
    
    from sqlalchemy import func, case
    
    # Get all series
    all_series = db.query(AlbumSeries).order_by(
        AlbumSeries.series_number.nulls_last(),
        AlbumSeries.created_at.desc()
    ).all()
    
    if not all_series:
        return []
    
    series_ids = [s.id for s in all_series]
    
    # Bulk fetch: song counts per series
    song_counts_query = db.query(
        Song.album_series_id,
        func.count(Song.id).label('count')
    ).filter(
        Song.album_series_id.in_(series_ids)
    ).group_by(Song.album_series_id).all()
    song_count_map = {row[0]: row[1] for row in song_counts_query}
    
    # Bulk fetch: series where user owns songs
    user_owned_series = set(
        row[0] for row in db.query(Song.album_series_id).filter(
            Song.album_series_id.in_(series_ids),
            Song.user_id == current_user.id
        ).distinct().all()
    )
    
    # Bulk fetch: series where user is collaborator
    user_collab_series = set(
        row[0] for row in db.query(Song.album_series_id).join(Collaboration).filter(
            Song.album_series_id.in_(series_ids),
            Collaboration.user_id == current_user.id,
            Collaboration.collaboration_type == CollaborationType.SONG_EDIT
        ).distinct().all()
    )
    
    # Bulk fetch: authors (song owners + collaborators) per series
    song_authors_query = db.query(
        Song.album_series_id,
        User.username
    ).join(User, Song.user_id == User.id).filter(
        Song.album_series_id.in_(series_ids),
        User.username.isnot(None)
    ).distinct().all()
    
    collab_authors_query = db.query(
        Song.album_series_id,
        User.username
    ).join(Collaboration, Collaboration.song_id == Song.id).join(
        User, Collaboration.user_id == User.id
    ).filter(
        Song.album_series_id.in_(series_ids),
        User.username.isnot(None)
    ).distinct().all()
    
    # Build authors map
    authors_map = {}
    for series_id, username in song_authors_query + collab_authors_query:
        if series_id not in authors_map:
            authors_map[series_id] = set()
        authors_map[series_id].add(username)
    
    # Convert sets to sorted lists
    for series_id in authors_map:
        authors_map[series_id] = sorted(list(authors_map[series_id]))
    
    # Filter series based on user involvement
    filtered_series = []
    for s in all_series:
        # Always include released series
        if s.status == "released":
            filtered_series.append(s)
            continue
            
        # For in_progress and planned series, check if user is involved
        user_involved = s.id in user_owned_series or s.id in user_collab_series
            
        if user_involved:
            filtered_series.append(s)
    
    # Build response with cached data
    result = []
    for s in filtered_series:
        song_count = song_count_map.get(s.id, 0)
        authors = authors_map.get(s.id, [])
        
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
        ).filter(
            Song.album_series_id == series_id
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
    ).filter(
        Song.album_series_id == series_id
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

    # Assign songs to this album series (song-level source of truth)
    target_songs = []
    if request.song_ids:
        target_songs = db.query(Song).filter(Song.id.in_(request.song_ids)).all()
    else:
        # Default: assign all qualifying songs in the pack that match artist/album (case-insensitive)
        target_songs = [
            s for s in songs
            if (s.artist or "").strip().lower() == (artist_name or "").strip().lower()
            and (s.album or "").strip().lower() == (album_name or "").strip().lower()
        ] or songs

    assigned = 0
    for s in target_songs:
        s.album_series_id = album_series.id
        assigned += 1

    db.commit()

    # Auto-check DLC status for all songs in the album series
    try:
        print(f"DEBUG: Starting auto-DLC check for {artist_name} - {album_name}")
        
        # Check if Spotify credentials are available
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            print("DEBUG: Spotify credentials not available, skipping auto-DLC check")
        else:
            print(f"DEBUG: Spotify credentials available, proceeding with DLC check")
            # Get Spotify tracklist and check DLC status
            sp = Spotify(auth_manager=SpotifyClientCredentials(
                client_id=SPOTIFY_CLIENT_ID,
                client_secret=SPOTIFY_CLIENT_SECRET
            ))
            
            results = sp.search(q=f"album:{album_name} artist:{artist_name}", type="album", limit=1)
            print(f"DEBUG: Spotify search results: {len(results.get('albums', {}).get('items', []))} albums found")
            
            if results["albums"]["items"]:
                album = results["albums"]["items"][0]
                album_id = album["id"]
                print(f"DEBUG: Using album: {album.get('name')} by {album.get('artists', [{}])[0].get('name', 'Unknown')}")
                
                tracks = sp.album_tracks(album_id)
                print(f"DEBUG: Found {len(tracks.get('items', []))} tracks, checking DLC status...")
                
                for t in tracks.get('items', []):
                    raw_title = t.get('name') or ''
                    clean_title = clean_string(raw_title)
                    sp_id = t.get('id')
                    
                    print(f"DEBUG: Checking track: {raw_title}")
                    
                    # Check DLC status
                    is_dlc = check_dlc_status(
                        db=db,
                        title=raw_title,
                        artist=artist_name
                    )
                    
                    print(f"DEBUG: DLC result for {raw_title}: {is_dlc}")
            else:
                print(f"DEBUG: No album found on Spotify for {artist_name} - {album_name}")
    except Exception as e:
        print(f"DEBUG: Failed to auto-check DLC status for {artist_name} - {album_name}: {e}")
        import traceback
        traceback.print_exc()

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

@router.get("/{series_id}/spotify-tracklist", response_model=List[TracklistItem])
def get_spotify_tracklist(series_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")

    sp = Spotify(auth_manager=SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET
    ))

    # Handle cases where artist and album names are identical
    if series.artist_name.lower() == series.album_name.lower():
        # Try multiple search strategies for identical artist/album names
        search_queries = [
            f'album:"{series.album_name}" artist:"{series.artist_name}"',  # Quoted search
            f'album:{series.album_name}',  # Just album name
            f'artist:{series.artist_name} album:{series.album_name}',  # Reversed order
            f'"{series.album_name}" "{series.artist_name}"',  # General search with quotes
        ]
    else:
        # Normal case - different artist and album names
        search_queries = [
            f'album:"{series.album_name}" artist:"{series.artist_name}"',  # Quoted search
            f'album:{series.album_name} artist:{series.artist_name}',  # Standard search
        ]
    
    results = None
    for query in search_queries:
        try:
            results = sp.search(q=query, type="album", limit=1)
            if results["albums"]["items"]:
                print(f"Found results with query: {query}")
                break
        except Exception as e:
            print(f"Search query failed: {query} - {e}")
            continue
    
    if not results or not results["albums"]["items"]:
        print(f"No results found for album '{series.album_name}' by artist '{series.artist_name}' with any search query")
        return []
    album = results["albums"]["items"][0]
    album_id = album["id"]
    tracks = sp.album_tracks(album_id)

    # Map existing songs by normalized title for THIS series only (used for in_pack)
    from api.tools import normalize_title, titles_similar, clean_string
    songs = db.query(Song).filter(Song.album_series_id == series_id).all()
    song_map = {normalize_title((s.title or "")): s for s in songs}

    # Build a pool of globally released songs by the same artist to recognize releases
    # We only use these for status detection, not for in_pack/song_id
    try:
        global_songs = db.query(Song).filter(Song.artist.ilike(f"%{series.artist_name}%")).all()
    except Exception:
        global_songs = []
    normalized_series_artist = normalize_title(series.artist_name or "")

    # User-specific flags (preexisting and irrelevant)
    user_flags = db.query(AlbumSeriesPreexisting).filter(AlbumSeriesPreexisting.series_id == series_id).all()
    preexisting_map = {}
    irrelevant_map = {}
    
    for f in user_flags:
        key = f.spotify_track_id or (f.title_clean or "").lower()
        if key:
            if f.pre_existing:
                preexisting_map[key] = True
            if f.irrelevant:
                irrelevant_map[key] = True
    # Manual overrides (user-linked songs)
    overrides = db.query(AlbumSeriesOverride).filter(AlbumSeriesOverride.series_id == series_id).all()
    override_map = {}
    for ov in overrides:
        key = ov.spotify_track_id or (ov.title_clean or "").lower()
        if key and ov.linked_song_id:
            s = db.query(Song).filter(Song.id == ov.linked_song_id).first()
            if s:
                override_map[key] = s

    items: List[TracklistItem] = []
    for t in tracks.get('items', []):
        raw_title = t.get('name') or ''
        # Clean remaster tags BEFORE checking DLC
        clean_title = clean_string(raw_title)
        key = normalize_title(clean_title)
        sp_id = t.get('id')
        # If overridden manually, use that first (treated as in_pack)
        s_series = override_map.get(sp_id) or override_map.get(key)
        # Then try normalized/fuzzy within this series
        if not s_series:
            s_series = song_map.get(key)
        if not s_series:
            # Fallback: fuzzy match against existing song titles in this series
            for cand_key, cand_song in song_map.items():
                if titles_similar(key, cand_key, threshold=0.92):
                    s_series = cand_song
                    break

        # Also try to recognize releases globally by the same artist using cleaned title + artist
        s_global = None
        if not s_series and global_songs:
            # Exact normalized title + normalized artist match
            for gs in global_songs:
                if normalize_title(gs.title or "") == key and normalize_title(gs.artist or "").find(normalized_series_artist) != -1:
                    s_global = gs
                    break
            # Fuzzy title match with same normalized/contained artist if exact not found
            if not s_global:
                for gs in global_songs:
                    if normalize_title(gs.artist or "").find(normalized_series_artist) == -1 and normalized_series_artist.find(normalize_title(gs.artist or "")) == -1:
                        continue
                    if titles_similar(key, normalize_title(gs.title or ""), threshold=0.92):
                        s_global = gs
                        break

        # Check if this song is official Rock Band DLC
        official = False
        try:
            official = check_dlc_status(
                db=db,
                title=clean_title,
                artist=series.artist_name
            )
        except Exception as e:
            print(f"Error checking DLC status for {raw_title}: {e}")
        
        # Check if this song is marked as preexisting (custom song by other authors)
        preexisting = preexisting_map.get(sp_id) or preexisting_map.get(key) or False
        
        # Check if this song is marked as irrelevant
        irrelevant = irrelevant_map.get(sp_id) or irrelevant_map.get(key) or False
        
        # Determine status/in_pack/song_id based on series match first, then global
        in_pack = bool(s_series)
        status_val = (s_series.status if s_series else (s_global.status if s_global else None))
        song_id_val = (s_series.id if s_series else None)
        
        items.append(TracklistItem(
            spotify_track_id=sp_id,
            title=raw_title,
            title_clean=clean_title,
            artist=series.artist_name,
            track_number=t.get('track_number'),
            disc_number=t.get('disc_number'),
            in_pack=in_pack,
            status=status_val,
            song_id=song_id_val,
            official=bool(official),
            pre_existing=bool(preexisting),
            irrelevant=bool(irrelevant)
        ))

    # Sort by disc number first, then track number, then title
    items.sort(key=lambda x: (x.disc_number or 1, x.track_number or 1e9, x.title_clean.lower()))
    return items

@router.post("/{series_id}/preexisting")
def set_preexisting(series_id: int, payload: PreexistingUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")

    # upsert by spotify_track_id or title_clean
    for u in payload.updates:
        spid = u.get('spotify_track_id')
        title_clean = clean_string(u.get('title_clean') or u.get('title') or '')
        pre = bool(u.get('pre_existing'))
        row = None
        if spid:
            row = db.query(AlbumSeriesPreexisting).filter(AlbumSeriesPreexisting.series_id == series_id, AlbumSeriesPreexisting.spotify_track_id == spid).first()
        if not row and title_clean:
            row = db.query(AlbumSeriesPreexisting).filter(AlbumSeriesPreexisting.series_id == series_id, AlbumSeriesPreexisting.title_clean == title_clean).first()
        if not row:
            row = AlbumSeriesPreexisting(series_id=series_id, spotify_track_id=spid, title_clean=title_clean, pre_existing=pre)
            db.add(row)
        else:
            row.pre_existing = pre
    db.commit()
    return {"ok": True}

@router.post("/{series_id}/irrelevant")
def set_irrelevant(series_id: int, payload: IrrelevantUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")

    # upsert by spotify_track_id or title_clean
    for u in payload.updates:
        spid = u.get('spotify_track_id')
        title_clean = clean_string(u.get('title_clean') or u.get('title') or '')
        irr = bool(u.get('irrelevant'))
        row = None
        if spid:
            row = db.query(AlbumSeriesPreexisting).filter(AlbumSeriesPreexisting.series_id == series_id, AlbumSeriesPreexisting.spotify_track_id == spid).first()
        if not row and title_clean:
            row = db.query(AlbumSeriesPreexisting).filter(AlbumSeriesPreexisting.series_id == series_id, AlbumSeriesPreexisting.title_clean == title_clean).first()
        if not row:
            row = AlbumSeriesPreexisting(series_id=series_id, spotify_track_id=spid, title_clean=title_clean, irrelevant=irr)
            db.add(row)
        else:
            row.irrelevant = irr
    db.commit()
    return {"ok": True}

@router.post("/{series_id}/disc-action")
def disc_action(series_id: int, payload: DiscActionRequest, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")

    # Get all tracks for this disc from Spotify
    sp = Spotify(auth_manager=SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET
    ))

    results = sp.search(q=f"album:{series.album_name} artist:{series.artist_name}", type="album", limit=1)
    if not results["albums"]["items"]:
        raise HTTPException(status_code=404, detail="Album not found on Spotify")
    
    album = results["albums"]["items"][0]
    album_id = album["id"]
    tracks = sp.album_tracks(album_id)

    # Filter tracks for the specified disc
    disc_tracks = [t for t in tracks.get('items', []) if t.get('disc_number', 1) == payload.disc_number]
    
    if not disc_tracks:
        raise HTTPException(status_code=404, detail=f"No tracks found for disc {payload.disc_number}")

    # Update all tracks in this disc
    for t in disc_tracks:
        spid = t.get('id')
        title_clean = clean_string(t.get('name') or '')
        
        row = db.query(AlbumSeriesPreexisting).filter(
            AlbumSeriesPreexisting.series_id == series_id, 
            AlbumSeriesPreexisting.spotify_track_id == spid
        ).first()
        
        if not row:
            row = AlbumSeriesPreexisting(
                series_id=series_id, 
                spotify_track_id=spid, 
                title_clean=title_clean
            )
            db.add(row)
        
        if payload.action == "mark_irrelevant":
            row.irrelevant = True
        elif payload.action == "unmark_irrelevant":
            row.irrelevant = False

    db.commit()
    return {"ok": True, "tracks_updated": len(disc_tracks)}

@router.post("/{series_id}/check-dlc")
def check_dlc_for_series(series_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Check all songs in an album series against the Rock Band DLC database and cache results"""
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")
    
    try:
        # Get Spotify tracklist for this series
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        results = sp.search(q=f"album:{series.album_name} artist:{series.artist_name}", type="album", limit=1)
        if not results["albums"]["items"]:
            raise HTTPException(status_code=404, detail="Album not found on Spotify")
        
        album = results["albums"]["items"][0]
        album_id = album["id"]
        tracks = sp.album_tracks(album_id)
        
        checked_count = 0
        dlc_count = 0
        
        for t in tracks.get('items', []):
            raw_title = t.get('name') or ''
            clean_title = clean_string(raw_title)
            sp_id = t.get('id')
            
            # Check DLC status
            is_dlc = check_dlc_status(
                db=db,
                title=raw_title,
                artist=series.artist_name
            )
            
            checked_count += 1
            if is_dlc:
                dlc_count += 1
        
        return {
            "message": f"Checked {checked_count} songs, found {dlc_count} that are already official Rock Band DLC",
            "checked_count": checked_count,
            "dlc_count": dlc_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check DLC status: {str(e)}")

@router.post("/{series_id}/add-missing", response_model=List[int])
def add_missing_tracks(series_id: int, req: AddMissingRequest, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")

    new_ids: List[int] = []
    for tr in req.tracks:
        title = clean_string(tr.get('title') or '')
        artist = series.artist_name
        year = tr.get('year')
        # skip if already exists in series
        exists = db.query(Song).filter(Song.album_series_id == series_id, Song.title.ilike(title)).first()
        if exists:
            continue
        s = Song(
            title=title,
            artist=artist,
            album=series.album_name,
            year=year,
            status=SongStatus.future,
            user_id=current_user.id,
            pack_id=req.pack_id,
            album_series_id=series_id,
        )
        db.add(s)
        db.flush()
        new_ids.append(s.id)
    db.commit()

    # Enhance each new song with Spotify data and clean remaster tags (only if user has it enabled)
    # Reload user from database to get fresh setting value (current_user might be from cache)
    from models import User
    db_user = db.query(User).filter(User.id == current_user.id).first()
    user_auto_enhance_enabled = True
    if db_user:
        user_auto_enhance_enabled = getattr(db_user, 'auto_spotify_fetch_enabled', True)
        # Handle None or 0/1 from database
        if user_auto_enhance_enabled is None:
            user_auto_enhance_enabled = True
        else:
            user_auto_enhance_enabled = bool(user_auto_enhance_enabled)
    
    if user_auto_enhance_enabled:
        try:
            from api.spotify import auto_enhance_song
            from api.tools import clean_string as _clean
            for sid in new_ids:
                try:
                    auto_enhance_song(sid, db, preserve_artist_album=True)
                    song = db.query(Song).get(sid)
                    if song:
                        cleaned_title = _clean(song.title)
                        cleaned_album = _clean(song.album or "")
                        if cleaned_title != song.title or cleaned_album != song.album:
                            song.title = cleaned_title
                            song.album = cleaned_album
                            db.add(song)
                    db.commit()
                except Exception:
                    db.rollback()
                    continue
        except Exception:
            pass

    # Optional: run cleaner on new songs (legacy polyfill)
    try:
        from api.tools import bulk_clean_remaster_tags_function
        bulk_clean_remaster_tags_function(new_ids, db, current_user.id)
    except Exception:
        pass

    return new_ids 

class OverrideRequest(BaseModel):
    spotify_track_id: Optional[str] = None
    title_clean: Optional[str] = None
    linked_song_id: int

@router.post("/{series_id}/override")
def set_override(series_id: int, req: OverrideRequest, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Validate series and song ownership/access
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")
    song = db.query(Song).filter(Song.id == req.linked_song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    # Upsert override
    row = None
    if req.spotify_track_id:
        row = db.query(AlbumSeriesOverride).filter(AlbumSeriesOverride.series_id == series_id, AlbumSeriesOverride.spotify_track_id == req.spotify_track_id).first()
    if not row and (req.title_clean or "").strip():
        from api.tools import clean_string
        t = clean_string(req.title_clean or "")
        row = db.query(AlbumSeriesOverride).filter(AlbumSeriesOverride.series_id == series_id, AlbumSeriesOverride.title_clean == t).first()
    if not row:
        row = AlbumSeriesOverride(series_id=series_id, spotify_track_id=req.spotify_track_id, title_clean=req.title_clean, linked_song_id=req.linked_song_id)
        db.add(row)
    else:
        row.linked_song_id = req.linked_song_id
    db.commit()
    return {"ok": True}

@router.delete("/{series_id}/override")
def delete_override(series_id: int, spotify_track_id: Optional[str] = None, title_clean: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    q = db.query(AlbumSeriesOverride).filter(AlbumSeriesOverride.series_id == series_id)
    if spotify_track_id:
        q = q.filter(AlbumSeriesOverride.spotify_track_id == spotify_track_id)
    elif title_clean:
        q = q.filter(AlbumSeriesOverride.title_clean == title_clean)
    else:
        raise HTTPException(status_code=400, detail="spotify_track_id or title_clean required")
    row = q.first()
    if not row:
        raise HTTPException(status_code=404, detail="Override not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.delete("/{series_id}")
def delete_album_series(series_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    """Delete an album series and all its songs"""
    series = db.query(AlbumSeries).filter(AlbumSeries.id == series_id).first()
    if not series:
        raise HTTPException(status_code=404, detail="Album series not found")
    
    # Check if user owns any songs in this series
    user_songs = db.query(Song).filter(
        Song.album_series_id == series_id,
        Song.user_id == current_user.id
    ).first()
    
    if not user_songs:
        raise HTTPException(status_code=403, detail="You don't have permission to delete this album series")
    
    # Get all songs in the series
    songs = db.query(Song).filter(Song.album_series_id == series_id).all()
    song_count = len(songs)
    
    # Delete all songs in the series
    for song in songs:
        db.delete(song)
    
    # Delete the album series
    db.delete(series)
    
    # Commit the transaction
    db.commit()
    
    return {"message": f"Album series '{series.album_name}' and {song_count} songs deleted successfully"} 