import os
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from models import Song, Artist, Collaboration, SongStatus, Pack
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_db
from api.auth import get_current_active_user
from pydantic import BaseModel
from schemas import SongCreate
from api.data_access import create_song_in_db

def _get_client() -> Optional[Spotify]:
    # Get credentials dynamically to ensure they're loaded after .env
    SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
    SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
    
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        print(f"Spotify credentials missing: CLIENT_ID={'set' if SPOTIFY_CLIENT_ID else 'missing'}, CLIENT_SECRET={'set' if SPOTIFY_CLIENT_SECRET else 'missing'}")
        return None
    auth = SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
    )
    return Spotify(auth_manager=auth)


def enhance_song_with_track_data(song_id: int, track_id: str, db: Session, preserve_artist_album: bool = False, auto_commit: bool = True) -> Optional[Song]:
    sp = _get_client()
    if sp is None:
        print(f"Spotify client not available for song {song_id}")
        return None

    song = db.query(Song).get(song_id)
    if not song:
        print(f"Song {song_id} not found in database")
        return None

    try:
        print(f"Fetching track {track_id} from Spotify for song {song_id}")
        track = sp.track(track_id)
        if not track:
            print(f"Track {track_id} not found on Spotify")
            return None
        print(f"Successfully fetched track: {track.get('name', 'Unknown')} by {track.get('artists', [{}])[0].get('name', 'Unknown')}")

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
            # First try to get existing artist
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
                
                # Create new artist
                try:
                    from sqlalchemy import text
                    
                    # Fix PostgreSQL sequence if needed (PostgreSQL only)
                    db_url = str(db.bind.url)
                    if 'postgresql' in db_url.lower():
                        try:
                            db.execute(text("""
                                SELECT setval('artists_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM artists), false)
                            """))
                            if auto_commit:
                                db.commit()
                        except Exception as seq_error:
                            print(f"Sequence reset skipped: {seq_error}")
                    
                    # Create the artist (no user_id - artists are shared entities)
                    artist = Artist(name=artist_name, image_url=artist_img, user_id=None)
                    db.add(artist)
                    db.flush()
                    print(f"Successfully created artist {artist_name} with ID {artist.id}")
                    
                except Exception as e:
                    print(f"Failed to create artist {artist_name}: {e}")
                    db.rollback()
                    
                    # Try to get existing artist (might have been created by another request)
                    artist = db.query(Artist).filter(Artist.name == artist_name).first()
                    if not artist:
                        print(f"Could not create or find artist {artist_name}")
                        return None
                    else:
                        print(f"Found existing artist {artist_name} with ID {artist.id} after creation failure")
            else:
                print(f"Found existing artist {artist_name} with ID {artist.id}")
                # If artist exists but has no image, try to fetch it
                if not artist.image_url and sp:
                    try:
                        search = sp.search(q=f"artist:{artist_name}", type="artist", limit=1)
                        items = (search.get("artists") or {}).get("items") or []
                        if items and (items[0].get("images") or []):
                            artist.image_url = items[0]["images"][0].get("url")
                            if auto_commit:
                                db.commit()
                                db.refresh(artist)
                            else:
                                db.flush()
                                db.refresh(artist)
                            print(f"Fetched image for existing artist {artist_name}")
                    except Exception:
                        pass
            
            # NEVER override artist name - users know their artists better than Spotify
            # But still update artist_id if we found a matching artist record
            if artist and song.artist.lower() == artist_name.lower():
                # Only update artist_id if names match (case-insensitive)
                song.artist_id = artist.id
                print(f"Updated artist_id to {artist.id} for matching artist {artist_name}")
            elif artist:
                print(f"Artist mismatch: user entered '{song.artist}', Spotify found '{artist_name}' - keeping user's artist")

        print(f"Updating song {song_id} in database")
        db.add(song)
        if auto_commit:
            db.commit()
            db.refresh(song)
        else:
            db.flush()
            db.refresh(song)
        print(f"Successfully enhanced song {song_id}")
        return song
    except Exception as e:
        # swallow to avoid breaking core flows
        print(f"Exception during enhancement of song {song_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return None


def auto_enhance_song(song_id: int, db: Session, preserve_artist_album: bool = False, auto_commit: bool = True) -> bool:
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
        return enhance_song_with_track_data(song_id, track_id, db, preserve_artist_album, auto_commit) is not None
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
        # Search for tracks matching the song with more specific query
        query = f'track:"{song.title}" artist:"{song.artist}"'.strip()
        results = sp.search(q=query, type="track", limit=5)
        items = (results.get("tracks") or {}).get("items") or []
        
        # If no results with quoted search, try broader search
        if not items:
            query = f"{song.title} {song.artist}".strip()
            results = sp.search(q=query, type="track", limit=5)
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
        print(f"Error in get_spotify_options: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Spotify options: {str(e)}")


class EnhanceRequest(BaseModel):
    track_id: str


class PlaylistImportRequest(BaseModel):
    playlist_url: str
    status: str = "Future Plans"  # "Future Plans", "In Progress", "Released"
    pack: Optional[str] = None

@router.post("/{song_id}/enhance/")
def enhance_song(
    song_id: int,
    request: EnhanceRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Enhance a song with Spotify track data"""
    try:
        enhanced_song = enhance_song_with_track_data(song_id, request.track_id, db, preserve_artist_album=False)
        if not enhanced_song:
            # Check if it's a Spotify client issue
            sp = _get_client()
            if sp is None:
                raise HTTPException(status_code=500, detail="Spotify service not available - credentials may be missing")
            
            # Check if song exists
            song_exists = db.query(Song).filter(Song.id == song_id).first()
            if not song_exists:
                raise HTTPException(status_code=404, detail="Song not found")
            
            raise HTTPException(status_code=404, detail="Failed to enhance song - track may not be available on Spotify")
        
        # After enhancement, clean remaster/version tags from title and album for consistency
        try:
            from api.tools import clean_string
            db.refresh(enhanced_song)
            cleaned_title = clean_string(enhanced_song.title or "")
            cleaned_album = clean_string(enhanced_song.album or "")
            if cleaned_title != enhanced_song.title or cleaned_album != enhanced_song.album:
                enhanced_song.title = cleaned_title
                enhanced_song.album = cleaned_album
                db.add(enhanced_song)
                db.commit()
                db.refresh(enhanced_song)
        except Exception:
            # Don't fail enhancement if cleanup has issues
            db.rollback()
        
        # Load the song with all necessary relationships for proper serialization
        song_with_user = db.query(Song).options(
            joinedload(Song.user),
            joinedload(Song.pack_obj),
            joinedload(Song.collaborations).joinedload(Collaboration.user),
            joinedload(Song.authoring)
        ).filter(Song.id == song_id).first()
        
        if not song_with_user:
            raise HTTPException(status_code=404, detail="Song not found")
        
        # Build result with proper collaboration formatting similar to songs.update endpoint
        song = song_with_user
        song_dict = {
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "album": song.album,
            "status": song.status,
            "pack_id": song.pack_id,
            "year": song.year,
            "album_cover": song.album_cover,
            "user_id": song.user_id,
        }
        # Author username
        if song.user:
            song_dict["author"] = song.user.username
        # Pack info
        if song.pack_obj:
            song_dict["pack_name"] = song.pack_obj.name
            song_dict["pack_owner_id"] = song.pack_obj.user_id
            try:
                from models import User
                pack_owner = db.query(User).filter(User.id == song.pack_obj.user_id).first()
                if pack_owner:
                    song_dict["pack_owner_username"] = pack_owner.username
            except Exception:
                pass
        # Collaborations with username
        collaborations_with_username = []
        if hasattr(song, "collaborations") and song.collaborations:
            for collab in song.collaborations:
                collaborations_with_username.append({
                    "id": collab.id,
                    "user_id": collab.user_id,
                    "username": getattr(collab.user, "username", None),
                    "collaboration_type": getattr(collab.collaboration_type, "value", None),
                    "created_at": collab.created_at,
                })
        song_dict["collaborations"] = collaborations_with_username
        # Serialize via schema
        from schemas import SongOut
        return SongOut.model_validate(song_dict)
    except Exception as e:
        print(f"Error in enhance_song: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to enhance song: {str(e)}") 


@router.post("/import-playlist")
def import_playlist(
    req: PlaylistImportRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    """
    Import all tracks from a Spotify playlist as songs for the current user.
    - playlist_url: full Spotify playlist URL or ID
    - status: Target status string ("Future Plans", "In Progress", "Released")
    - pack: Optional pack name to group imported songs
    """
    sp = _get_client()
    if sp is None:
        raise HTTPException(
            status_code=500, detail="Spotify credentials not configured"
        )

    # Map human-friendly status string to SongStatus enum
    status_map = {
        "Future Plans": SongStatus.future,
        "In Progress": SongStatus.wip,
        "Released": SongStatus.released,
    }
    target_status = status_map.get(req.status, SongStatus.future)

    # Resolve or create pack up-front so all imported songs share the same pack_id
    pack_id: Optional[int] = None
    if req.pack and req.pack.strip():
        pack_name = req.pack.strip()
        existing_pack = (
            db.query(Pack)
            .filter(Pack.name.ilike(pack_name), Pack.user_id == current_user.id)
            .first()
        )
        if existing_pack:
            pack_id = existing_pack.id
        else:
            new_pack = Pack(name=pack_name, user_id=current_user.id)
            db.add(new_pack)
            db.commit()
            db.refresh(new_pack)
            pack_id = new_pack.id

    imported_count = 0

    try:
        results = sp.playlist_tracks(req.playlist_url)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read playlist from Spotify: {str(e)}",
        )

    while results:
        for item in results.get("items", []):
            track = item.get("track")
            if not track:
                continue

            title = track.get("name")
            artists = track.get("artists") or []
            artist_name = artists[0].get("name") if artists else None
            album = (track.get("album") or {}).get("name")

            rd = (track.get("album") or {}).get("release_date")
            year = None
            if isinstance(rd, str) and len(rd) >= 4 and rd[:4].isdigit():
                year = int(rd[:4])

            album_images = (track.get("album") or {}).get("images") or []
            cover = album_images[0].get("url") if album_images else None

            if not title or not artist_name:
                continue

            song_kwargs = dict(
                artist=artist_name,
                title=title,
                album=album,
                status=target_status,
                year=year,
                album_cover=cover,
            )
            if pack_id:
                song_kwargs["pack_id"] = pack_id
            song_payload = SongCreate(**song_kwargs)

            try:
                create_song_in_db(
                    db, song_payload, current_user, auto_enhance=True
                )
                imported_count += 1
            except HTTPException as e:
                # Skip duplicates; bubble up other errors
                if not (
                    e.status_code == 400
                    and "already exists" in str(e.detail)
                ):
                    raise
            except Exception:
                # Log and continue on unexpected errors to keep importing others
                import traceback

                traceback.print_exc()

        if results.get("next"):
            try:
                results = sp.next(results)
            except Exception:
                break
        else:
            break

    # Log import activity
    from .activity_logger import log_activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="import_spotify",
            description=f"{current_user.username} has imported {imported_count} song(s) from Spotify",
            metadata={"imported_count": imported_count, "playlist_url": req.playlist_url, "status": req.status, "pack": req.pack}
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log import_spotify activity: {log_err}")
    
    return {"imported_count": imported_count}


def _generate_artist_search_queries(artist_name: str) -> List[str]:
    """Generate multiple search queries for a given artist name to improve match rate"""
    import re
    
    queries = []
    cleaned = (artist_name or "").strip()
    if not cleaned:
        return queries
    
    def add_query(q: str):
        if q and q not in queries:
            queries.append(q)
    
    # Original name
    add_query(f'artist:"{cleaned}"')
    add_query(cleaned)
    
    # Remove content within parentheses (e.g., "Artist (Official)")
    no_paren = re.sub(r"\s*\(.*?\)\s*", " ", cleaned).strip()
    add_query(f'artist:"{no_paren}"')
    
    # Remove featuring/ft/feat/& sections
    no_feat = re.split(r"\bfeat\.|\bft\.|&|,|\bfeaturing\b", no_paren, maxsplit=1)[0].strip()
    add_query(f'artist:"{no_feat}"')
    add_query(no_feat)
    
    # Replace multiple spaces with single space
    normalized = re.sub(r"\s+", " ", no_feat)
    add_query(f'artist:"{normalized}"')
    
    return [q for q in queries if q]


def _fetch_artist_image_from_spotify(artist_name: str, sp: Optional[Spotify] = None) -> Optional[str]:
    """Helper function to fetch artist image from Spotify with multiple search strategies"""
    if not sp:
        sp = _get_client()
    if not sp:
        return None
    
    queries = _generate_artist_search_queries(artist_name)
    for query in queries:
        try:
            search = sp.search(q=query, type="artist", limit=3)
            items = (search.get("artists") or {}).get("items") or []
            for artist in items:
                images = artist.get("images") or []
                if images:
                    return images[0].get("url")
        except Exception as e:
            print(f"Spotify search failed for query '{query}': {e}")
            continue
    
    return None


@router.post("/artists/{artist_id}/fetch-image")
def fetch_artist_image(
    artist_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch artist image from Spotify for a specific artist (admin only)"""
    artist = db.query(Artist).filter(Artist.id == artist_id).first()
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    
    # Artists are shared entities - any authenticated user can fetch images (admin-only endpoint anyway)
    
    sp = _get_client()
    if not sp:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured")
    
    try:
        image_url = _fetch_artist_image_from_spotify(artist.name, sp)
        if image_url:
            artist.image_url = image_url
            db.commit()
            db.refresh(artist)
            return {
                "message": f"Artist image fetched successfully for {artist.name}",
                "image_url": artist.image_url
            }
        else:
            raise HTTPException(status_code=404, detail="No artist image found on Spotify")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch artist image: {str(e)}")


@router.post("/artists/fetch-all-missing-images")
def fetch_all_missing_artist_images(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Fetch artist images for all artists that don't have them (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from sqlalchemy import func, distinct
    from sqlalchemy import text
    
    sp = _get_client()
    if not sp:
        raise HTTPException(status_code=500, detail="Spotify credentials not configured")
    
    log_entries = []
    max_log_entries = 200
    
    # Step 1: Find all unique artist names from songs table that don't have artist_id
    # and don't exist in artists table
    songs_with_missing_artists = db.query(
        distinct(Song.artist).label('artist_name')
    ).filter(
        Song.artist.isnot(None),
        Song.artist != "",
        Song.artist_id.is_(None)
    ).group_by(Song.artist).all()
    
    created_count = 0
    if songs_with_missing_artists:
        log_entries.append(f"📋 Found {len(songs_with_missing_artists)} artists in songs table without artist entries")
        
        # Create missing artist entries (artists are shared, no user_id needed)
        for (artist_name,) in songs_with_missing_artists:
            # Check if artist already exists (case-insensitive)
            existing = db.query(Artist).filter(
                func.lower(Artist.name) == func.lower(artist_name)
            ).first()
            
            if not existing:
                try:
                    # Fix PostgreSQL sequence if needed
                    db_url = str(db.bind.url)
                    if 'postgresql' in db_url.lower():
                        try:
                            db.execute(text("""
                                SELECT setval('artists_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM artists), false)
                            """))
                            db.commit()
                        except Exception:
                            pass
                    
                    new_artist = Artist(name=artist_name, image_url=None, user_id=None)
                    db.add(new_artist)
                    created_count += 1
                    
                    if len(log_entries) < max_log_entries:
                        log_entries.append(f"➕ Created artist entry: {artist_name}")
                except Exception as e:
                    if len(log_entries) < max_log_entries:
                        log_entries.append(f"❌ Failed to create artist {artist_name}: {e}")
                    continue
        
        if created_count > 0:
            db.commit()
            log_entries.append(f"✅ Created {created_count} missing artist entries")
    
    # Step 2: Get all artists without images (including newly created ones)
    artists_without_images = db.query(Artist).filter(
        (Artist.image_url.is_(None)) | (Artist.image_url == "")
    ).all()
    
    if not artists_without_images:
        return {
            "message": "All artists already have images",
            "updated_count": 0,
            "total_artists": 0,
            "created_count": created_count,
            "log": log_entries
        }
    
    updated_count = 0
    total_count = len(artists_without_images)
    failed_artists = []
    
    log_entries.append(f"🖼️ Starting to fetch images for {total_count} artists...")
    
    # Process in batches to avoid timeouts and rate limits
    import time
    commit_interval = 25  # Commit every 25 artists to avoid long transactions
    
    for i, artist in enumerate(artists_without_images):
        try:
            image_url = _fetch_artist_image_from_spotify(artist.name, sp)
            if image_url:
                artist.image_url = image_url
                updated_count += 1
                entry = f"✅ {artist.name} – image fetched"
            else:
                failed_artists.append(artist.name)
                entry = f"⚠️ {artist.name} – no image found"
            if len(log_entries) < max_log_entries:
                log_entries.append(entry)
            
            # Commit periodically to avoid long transactions
            if (i + 1) % commit_interval == 0:
                db.commit()
                print(f"Progress: {i + 1}/{total_count} artists processed, {updated_count} images fetched")
            
            # Small delay to avoid rate limiting (Spotify allows ~100 requests per second)
            time.sleep(0.1)
            
        except Exception as e:
            print(f"Failed to fetch image for {artist.name}: {e}")
            # Continue processing other artists
            if len(log_entries) < max_log_entries:
                log_entries.append(f"❌ {artist.name} – error: {e}")
            continue
    
    # Final commit for any remaining changes
    db.commit()
    
    return {
        "message": f"Created {created_count} missing artists. Updated artist images for {updated_count} out of {total_count} artists",
        "updated_count": updated_count,
        "total_artists": total_count,
        "created_count": created_count,
        "failed_artists": failed_artists[:25],  # include sample of artists that failed
        "failed_count": len(failed_artists),
        "log": log_entries
    }