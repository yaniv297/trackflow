import re
import time
from typing import Optional
from spotipy import Spotify, SpotifyClientCredentials
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import Song, SongStatus, Artist
from schemas import SongOut, EnhanceRequest
import os

SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")

router = APIRouter(prefix="/spotify", tags=["Spotify"], trailing_slash=False)

def extract_playlist_id(playlist_url: str) -> str:
    """Extract playlist ID from Spotify URL"""
    # Handle various Spotify URL formats
    patterns = [
        r"open\.spotify\.com/playlist/([a-zA-Z0-9]+)",
        r"spotify\.com/playlist/([a-zA-Z0-9]+)",
        r"playlist/([a-zA-Z0-9]+)"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, playlist_url)
        if match:
            return match.group(1)
    
    raise HTTPException(status_code=400, detail="Invalid Spotify playlist URL")

def import_playlist_songs(playlist_url: str, status: str, pack: Optional[str] = None, db: Session = None):
    """Import songs from Spotify playlist"""
    if not db:
        db = SessionLocal()
    
    try:
        # Initialize Spotify client
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        # Extract playlist ID and get tracks
        playlist_id = extract_playlist_id(playlist_url)
        results = sp.playlist_tracks(playlist_id)
        
        created_songs = []
        count = 0
        
        # Map status string to SongStatus enum
        status_map = {
            "Future Plans": SongStatus.future,
            "In Progress": SongStatus.wip,
            "Released": SongStatus.released
        }
        song_status = status_map.get(status, SongStatus.future)
        
        while results:
            for item in results['items']:
                track = item['track']
                if not track:
                    continue
                
                title = track['name']
                artist = track['artists'][0]['name']
                album = track['album']['name']
                year = int(track['album']['release_date'][:4]) if track['album'].get('release_date') else None
                cover = track['album']['images'][0]['url'] if track['album']['images'] else None
                
                # Check if song already exists
                exists = db.query(Song).filter_by(title=title, artist=artist).first()
                if exists:
                    continue
                
                # Create new song
                song = Song(
                    artist=artist,
                    title=title,
                    album=album,
                    year=year,
                    album_cover=cover,
                    status=song_status,
                    pack=pack,
                    author="yaniv297"  # Force author to be yaniv297
                )
                
                db.add(song)
                created_songs.append(song)
                count += 1
            
            db.commit()
            
            # Fetch next page if available
            if results['next']:
                results = sp.next(results)
                time.sleep(0.5)  # throttle to avoid rate limits
            else:
                break
        
        return created_songs, count
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import playlist: {str(e)}")

@router.post("/import-playlist")
def import_spotify_playlist(
    playlist_url: str = Body(...),
    status: str = Body(...),
    pack: Optional[str] = Body(None),
    db: Session = Depends(get_db)
):
    """Import songs from Spotify playlist"""
    
    # Validate inputs
    if not playlist_url.strip():
        raise HTTPException(status_code=400, detail="Playlist URL is required")
    
    valid_statuses = ["Future Plans", "In Progress", "Released"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    try:
        created_songs, count = import_playlist_songs(playlist_url, status, pack, db)
        
        # Run clean remaster tags on all created songs
        from api.tools import bulk_clean_remaster_tags
        song_ids = [song.id for song in created_songs]
        if song_ids:
            bulk_clean_remaster_tags(song_ids, db)
        
        return {
            "message": f"Successfully imported {count} songs from playlist",
            "imported_count": count,
            "song_ids": song_ids
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import playlist: {str(e)}")

@router.get("/{song_id}/spotify-options")
def get_spotify_matches(song_id: int, db: Session = Depends(get_db)):
    song = db.query(Song).get(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    sp = Spotify(auth_manager=SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET
    ))

    results = sp.search(q=f"{song.title} {song.artist}", type="track", limit=5)
    tracks = results.get("tracks", {}).get("items", [])

    options = []
    for track in tracks:
        options.append({
            "track_id": track["id"],
            "title": track["name"],
            "artist": track["artists"][0]["name"],
            "album": track["album"]["name"],
            "album_cover": track["album"]["images"][0]["url"] if track["album"]["images"] else None,
        })

    return options

def enhance_song_with_track_data(song_id: int, track_id: str, db: Session):
    """Enhance a song with Spotify track data"""
    song = db.query(Song).get(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    sp = Spotify(auth_manager=SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET
    ))

    track = sp.track(track_id)
    album = track["album"]

    song.album = album["name"]
    song.album_cover = album["images"][0]["url"] if album["images"] else None
    
    release_date = album.get("release_date")  # YYYY-MM-DD or YYYY
    if release_date:
        year = int(release_date.split("-")[0])
        song.year = year

    # --- Artist image logic ---
    artist_name = track["artists"][0]["name"]
    artist = db.query(Artist).filter_by(name=artist_name).first()
    if not artist:
        # Fetch artist image from Spotify
        artist_search = sp.search(q=artist_name, type="artist", limit=1)
        image_url = None
        items = artist_search.get("artists", {}).get("items", [])
        if items and items[0].get("images"):
            image_url = items[0]["images"][0]["url"]
        artist = Artist(name=artist_name, image_url=image_url)
        db.add(artist)
        db.flush()  # assign id
    song.artist_obj = artist

    db.commit()
    db.refresh(song)
    return song

@router.post("/{song_id}/enhance", response_model=SongOut)
def enhance_song_with_track(song_id: int, req: EnhanceRequest, db: Session = Depends(get_db)):
    return enhance_song_with_track_data(song_id, req.track_id, db)

def auto_enhance_song(song_id: int, db: Session):
    """Automatically enhance a song with the best Spotify match"""
    song = db.query(Song).get(song_id)
    if not song:
        print(f"Song {song_id} not found for auto-enhancement")
        return False
    
    # Check if Spotify credentials are available
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        print("Spotify credentials not available, skipping auto-enhancement")
        return False
    
    try:
        sp = Spotify(auth_manager=SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        ))
        
        # Search for the song on Spotify
        search_query = f"{song.title} {song.artist}"
        results = sp.search(q=search_query, type="track", limit=1)
        tracks = results.get("tracks", {}).get("items", [])
        
        if not tracks:
            print(f"No Spotify match found for '{search_query}'")
            return False
        
        # Use the first (best) match
        track_id = tracks[0]["id"]
        enhance_song_with_track_data(song_id, track_id, db)
        print(f"Successfully auto-enhanced song '{song.title}' with Spotify data")
        return True
        
    except Exception as e:
        print(f"Error during auto-enhancement: {e}")
        return False

@router.patch("/{song_id}")
def update_song(song_id: int, updates: dict = Body(...), db: Session = Depends(get_db)):
    song = db.query(Song).get(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    for key, value in updates.items():
        if hasattr(song, key):
            setattr(song, key, value)

    db.commit()
    db.refresh(song)
    return song
