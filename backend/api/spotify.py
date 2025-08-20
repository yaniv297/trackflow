import os
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from models import Song, Artist
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_db
from api.auth import get_current_active_user
from pydantic import BaseModel

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "7939abf6b76d4fc7a627869350dbe3d7")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "b1aefd1ba3504dc28a441b1344698bd9")


def _get_client() -> Optional[Spotify]:
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        return None
    auth = SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
    )
    return Spotify(auth_manager=auth)


def enhance_song_with_track_data(song_id: int, track_id: str, db: Session, preserve_artist_album: bool = False) -> Optional[Song]:
    sp = _get_client()
    if sp is None:
        return None

    song = db.query(Song).get(song_id)
    if not song:
        return None

    try:
        track = sp.track(track_id)
        if not track:
            return None

        album = track.get("album") or {}
        images = album.get("images") or []
        year = None
        rd = album.get("release_date")
        if isinstance(rd, str) and len(rd) >= 4 and rd[:4].isdigit():
            year = int(rd[:4])

        # Only update album if we're not preserving it
        if not preserve_artist_album:
            album_name = album.get("name")
            song.album = album_name or song.album
        
        # Always update album cover and year
        if images:
            song.album_cover = images[0].get("url") or song.album_cover
        if year:
            song.year = year

        # Ensure artist record exists and attach image if available
        artist_name = (track.get("artists") or [{}])[0].get("name")
        if artist_name:
            artist = db.query(Artist).filter(Artist.name == artist_name).first()
            if not artist:
                # Try to fetch artist image
                artist_img = None
                try:
                    search = sp.search(q=f"artist:{artist_name}", type="artist", limit=1)
                    items = (search.get("artists") or {}).get("items") or []
                    if items and (items[0].get("images") or []):
                        artist_img = items[0]["images"][0].get("url")
                except Exception:
                    pass
                artist = Artist(name=artist_name, image_url=artist_img)
                db.add(artist)
                db.flush()
            
            # Only update artist if we're not preserving it
            if not preserve_artist_album:
                song.artist = artist_name
                song.artist_id = artist.id

        db.add(song)
        db.commit()
        db.refresh(song)
        return song
    except Exception:
        # swallow to avoid breaking core flows
        db.rollback()
        return None


def auto_enhance_song(song_id: int, db: Session, preserve_artist_album: bool = False) -> bool:
    sp = _get_client()
    if sp is None:
        # No credentials; skip silently
        return False

    song = db.query(Song).get(song_id)
    if not song:
        return False

    try:
        query = f"{song.title} {song.artist}".strip()
        results = sp.search(q=query, type="track", limit=1)
        items = (results.get("tracks") or {}).get("items") or []
        if not items:
            return False
        track_id = items[0].get("id")
        if not track_id:
            return False
        return enhance_song_with_track_data(song_id, track_id, db, preserve_artist_album) is not None
    except Exception:
        return False

# Router for Spotify endpoints
router = APIRouter(prefix="/spotify", tags=["Spotify"])

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

@router.get("/album-tracklist", response_model=List[TracklistItem])
def get_album_tracklist(
    artist: str = Query(..., description="Artist name"),
    album: str = Query(..., description="Album name"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get Spotify tracklist for an album"""
    sp = _get_client()
    if sp is None:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured")

    try:
        # Search for the album with multiple results to find the original version
        # Handle cases where artist and album names are identical
        if artist.lower() == album.lower():
            # Try multiple search strategies for identical artist/album names
            search_queries = [
                f'album:"{album}" artist:"{artist}"',  # Quoted search
                f'album:{album}',  # Just album name
                f'artist:{artist} album:{album}',  # Reversed order
                f'"{album}" "{artist}"',  # General search with quotes
            ]
        else:
            # Normal case - different artist and album names
            search_queries = [
                f'album:"{album}" artist:"{artist}"',  # Quoted search
                f'album:{album} artist:{artist}',  # Standard search
            ]
        
        results = None
        for query in search_queries:
            try:
                results = sp.search(q=query, type="album", limit=10)
                if results["albums"]["items"]:
                    print(f"Found results with query: {query}")
                    break
            except Exception as e:
                print(f"Search query failed: {query} - {e}")
                continue
        
        if not results or not results["albums"]["items"]:
            print(f"No results found for album '{album}' by artist '{artist}' with any search query")
            return []
        
        # Try to find the original version (not deluxe, anniversary, remastered, etc.)
        albums = results["albums"]["items"]
        original_album = None
        
        # Look for albums without deluxe/anniversary/remastered keywords
        for album_data in albums:
            album_name = album_data.get("name", "").lower()
            if not any(keyword in album_name for keyword in ["deluxe", "anniversary", "remastered", "expanded", "bonus", "special"]):
                original_album = album_data
                break
        
        # If no "clean" version found, use the first result
        if not original_album:
            original_album = albums[0]
        
        album_id = original_album["id"]
        tracks = sp.album_tracks(album_id)

        # Import the clean_string function and other tools
        from api.tools import clean_string, normalize_title, titles_similar
        
        # Build a pool of globally released songs by the same artist to recognize releases
        try:
            global_songs = db.query(Song).filter(Song.artist.ilike(f"%{artist}%")).all()
        except Exception:
            global_songs = []
        normalized_artist = normalize_title(artist or "")
        
        items: List[TracklistItem] = []
        for t in tracks.get('items', []):
            raw_title = t.get('name') or ''
            clean_title = clean_string(raw_title)
            key = normalize_title(clean_title)
            
            # Check if this song is already official Rock Band DLC
            is_dlc = False
            try:
                from models import RockBandDLC
                # Use clean_title (without remaster tags) for DLC checking
                dlc_entry = db.query(RockBandDLC).filter(
                    RockBandDLC.title.ilike(clean_title),
                    RockBandDLC.artist.ilike(artist)
                ).first()
                is_dlc = dlc_entry is not None
            except Exception as e:
                print(f"Error checking DLC status for {clean_title}: {e}")
            
            # Check for existing songs by the same artist using cleaned title + artist
            s_global = None
            status_val = None
            if global_songs:
                for gs in global_songs:
                    # Check if artist matches (using containment and fuzzy matching)
                    gs_artist_normalized = normalize_title(gs.artist or "")
                    if (gs_artist_normalized.find(normalized_artist) != -1 or 
                        normalized_artist.find(gs_artist_normalized) != -1):
                        # Check if title matches (using cleaned title)
                        gs_title_normalized = normalize_title(gs.title or "")
                        if titles_similar(key, gs_title_normalized, threshold=0.92):
                            s_global = gs
                            status_val = gs.status
                            break
            
            items.append(TracklistItem(
                spotify_track_id=t.get('id'),
                title=raw_title,
                title_clean=clean_title,
                artist=artist,
                track_number=t.get('track_number'),
                disc_number=t.get('disc_number'),
                in_pack=False,  # No songs linked yet in create mode
                status=status_val,  # Status from global song if found
                song_id=s_global.id if s_global else None,
                official=is_dlc,
                pre_existing=False  # No preexisting custom songs in create mode
            ))

        # Sort by disc number first, then track number, then title
        items.sort(key=lambda x: (x.disc_number or 1, x.track_number or 1e9, x.title_clean.lower()))
        return items
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch album tracklist: {str(e)}")


@router.get("/{song_id}/spotify-options/")
def get_spotify_options(
    song_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get Spotify track options for a song"""
    sp = _get_client()
    if sp is None:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured")

    song = db.query(Song).get(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    try:
        # Search for tracks matching the song
        query = f"{song.title} {song.artist}".strip()
        results = sp.search(q=query, type="track", limit=10)
        items = (results.get("tracks") or {}).get("items") or []
        
        options = []
        for track in items:
            album = track.get("album") or {}
            artists = track.get("artists") or []
            artist_name = artists[0].get("name") if artists else "Unknown"
            
            options.append({
                "track_id": track.get("id"),
                "title": track.get("name"),
                "artist": artist_name,
                "album": album.get("name"),
                "year": album.get("release_date", "")[:4] if album.get("release_date") else None,
                "album_cover": album.get("images", [{}])[0].get("url") if album.get("images") else None,
                "duration_ms": track.get("duration_ms"),
                "popularity": track.get("popularity")
            })
        
        return options
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Spotify options: {str(e)}")


class EnhanceRequest(BaseModel):
    track_id: str

@router.post("/{song_id}/enhance/")
def enhance_song(
    song_id: int,
    request: EnhanceRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Enhance a song with Spotify track data"""
    enhanced_song = enhance_song_with_track_data(song_id, request.track_id, db, preserve_artist_album=False)
    if not enhanced_song:
        raise HTTPException(status_code=404, detail="Failed to enhance song")
    
    # Load the song with user relationship for proper serialization
    song_with_user = db.query(Song).options(
        joinedload(Song.user)
    ).filter(Song.id == song_id).first()
    
    if not song_with_user:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Prepare song dict with author field
    song_dict = song_with_user.__dict__.copy()
    if song_with_user.user:
        song_dict["author"] = song_with_user.user.username
    
    # Return a properly serialized response
    from schemas import SongOut
    return SongOut.model_validate(song_dict, from_attributes=True) 