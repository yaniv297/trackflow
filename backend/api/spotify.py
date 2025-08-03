import re
import time
from typing import Optional
from spotipy import Spotify, SpotifyClientCredentials
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import Song, SongStatus, Artist, Collaboration, CollaborationType, Pack, User
from schemas import SongOut, EnhanceRequest
import os
from api.auth import get_current_active_user

SPOTIFY_CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET")

router = APIRouter(prefix="/spotify", tags=["Spotify"])

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

def import_playlist_songs(playlist_url: str, status: str, pack_name: str, current_user, db: Session = None):
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
        
        # Handle pack creation/finding
        pack_id = None
        if pack_name and pack_name.strip():
            # Try to find existing pack
            existing_pack = db.query(Pack).filter(Pack.name == pack_name).first()
            if existing_pack:
                pack_id = existing_pack.id
            else:
                # Create new pack
                new_pack = Pack(name=pack_name, user_id=current_user.id)
                db.add(new_pack)
                db.flush()  # Get the ID without committing
                pack_id = new_pack.id
        
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
                
                # Check if song already exists for this user (as owner or collaborator)
                from api.data_access import check_song_duplicate_for_user
                if check_song_duplicate_for_user(db, title, artist, current_user):
                    continue
                
                # Create new song
                song = Song(
                    artist=artist,
                    title=title,
                    album=album,
                    year=year,
                    album_cover=cover,
                    status=song_status,
                    pack_id=pack_id,
                    user_id=current_user.id
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
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Import songs from Spotify playlist"""
    
    # Validate inputs
    if not playlist_url.strip():
        raise HTTPException(status_code=400, detail="Playlist URL is required")
    
    valid_statuses = ["Future Plans", "In Progress", "Released"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    try:
        created_songs, count = import_playlist_songs(playlist_url, status, pack or "", current_user, db)
        
        # Run clean remaster tags on all created songs
        from api.tools import bulk_clean_remaster_tags_function
        song_ids = [song.id for song in created_songs]
        if song_ids:
            bulk_clean_remaster_tags_function(song_ids, db, current_user.id)
        
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
    
    # Auto-clean remaster tags after enhancement
    try:
        from api.tools import clean_string
        db.refresh(song)  # Refresh to get updated data from Spotify
        
        cleaned_title = clean_string(song.title)
        cleaned_album = clean_string(song.album or "")
        
        if cleaned_title != song.title or cleaned_album != song.album:
            print(f"Cleaning remaster tags for song {song.id}")
            song.title = cleaned_title
            song.album = cleaned_album
            db.commit()
            print(f"Cleaned song {song.id}: title='{cleaned_title}', album='{cleaned_album}'")
    except Exception as clean_error:
        print(f"Failed to clean remaster tags for song {song.id}: {clean_error}")
    
    return song

@router.post("/{song_id}/enhance", response_model=SongOut)
def enhance_song_with_track(song_id: int, req: EnhanceRequest, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    # Enhance the song
    db_song = enhance_song_with_track_data(song_id, req.track_id, db)
    
    # Re-fetch the song with all relationships loaded
    from sqlalchemy.orm import joinedload
    db_song = db.query(Song).options(
        joinedload(Song.collaborations).joinedload(Collaboration.user),
        joinedload(Song.user),  # Load the song owner
        joinedload(Song.pack_obj).joinedload(Pack.user),  # Load the pack relationship and its owner
        joinedload(Song.authoring)  # Load the authoring data
    ).filter(Song.id == db_song.id).first()
    
    # Build result with proper formatting (similar to songs endpoint)
    song_dict = db_song.__dict__.copy()
    
    # Set author from user relationship
    if db_song.user:
        song_dict["author"] = db_song.user.username
    
    # Attach collaborations if any
    song_dict["collaborations"] = []
    if hasattr(db_song, "collaborations"):
        collaborations_with_username = []
        for collab in db_song.collaborations:
            collab_dict = {
                "id": collab.id,
                "user_id": collab.user_id,
                "username": collab.user.username,
                "collaboration_type": collab.collaboration_type.value,
                "created_at": collab.created_at
            }
            collaborations_with_username.append(collab_dict)
        song_dict["collaborations"] = collaborations_with_username
    
    # Attach pack data if it exists
    if db_song.pack_obj:
        song_dict["pack_name"] = db_song.pack_obj.name
        song_dict["pack_owner_id"] = db_song.pack_obj.user_id
        song_dict["pack_owner_username"] = db_song.pack_obj.user.username if db_song.pack_obj.user else None
    
    # Determine if song is editable based on unified collaboration system (same logic as songs endpoint)
    is_owner = db_song.user_id == current_user.id
    
    # Check if user has song-level collaboration
    has_song_collaboration = db.query(Collaboration).filter(
        Collaboration.song_id == db_song.id,
        Collaboration.user_id == current_user.id,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).first() is not None
    
    # Check if user has pack-level collaboration
    has_pack_collaboration = db.query(Collaboration).filter(
        Collaboration.pack_id == db_song.pack_id,
        Collaboration.user_id == current_user.id,
        Collaboration.collaboration_type.in_([CollaborationType.PACK_VIEW, CollaborationType.PACK_EDIT])
    ).first() is not None
    
    # Song is editable if user owns it or has song-level edit collaboration
    song_dict["is_editable"] = is_owner or has_song_collaboration
    
    # Add pack collaboration info if user has access via pack collaboration
    if has_pack_collaboration and db_song.pack_id:
        song_dict["pack_collaboration"] = {
            "can_edit": has_song_collaboration,  # Only editable if direct song collaboration
            "pack_id": db_song.pack_id
        }
    
    return SongOut(**song_dict)

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
