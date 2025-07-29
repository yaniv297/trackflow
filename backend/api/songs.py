from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from database import get_db
from schemas import SongCreate, SongOut
from api.data_access import create_song_in_db, delete_song_from_db
from models import Song, SongStatus, AlbumSeries, SongCollaboration
from typing import Optional
from typing import List

router = APIRouter(prefix="/songs", tags=["Songs"], trailing_slash=False)


@router.post("", response_model=SongOut)
def create_song(song: SongCreate, db: Session = Depends(get_db)):
    # Force the author to be yaniv297 for all new songs
    song_data = song.dict()
    song_data["author"] = "yaniv297"
    
    # Create a new SongCreate object with the forced author
    from schemas import SongCreate
    song_with_author = SongCreate(**song_data)
    
    return create_song_in_db(db, song_with_author)

@router.get("", response_model=list[SongOut])
def get_filtered_songs(
    status: Optional[SongStatus] = Query(None),
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    # Build base query with all necessary joins
    q = db.query(Song).options(
        joinedload(Song.authoring), 
        joinedload(Song.artist_obj),
        joinedload(Song.collaborations)
    )

    # Filter to only show songs authored by yaniv297
    q = q.filter(Song.author == "yaniv297")

    if status:
        q = q.filter(Song.status == status)

    if query:
        pattern = f"%{query}%"
        # Search in song fields and also in collaborations
        q = q.filter(
            or_(
                Song.title.ilike(pattern),
                Song.artist.ilike(pattern),
                Song.album.ilike(pattern),
                Song.pack.ilike(pattern),
                # Search in collaborations using EXISTS subquery
                Song.id.in_(
                    db.query(SongCollaboration.song_id)
                    .filter(SongCollaboration.author.ilike(pattern))
                    .subquery()
                )
            )
        )

    # Get all songs with their related data in one query
    songs = q.order_by(Song.artist.asc(), Song.title.asc()).all()
    
    # Pre-fetch all album series data to avoid N+1 queries
    album_series_ids = {song.album_series_id for song in songs if song.album_series_id}
    album_series_map = {}
    if album_series_ids:
        series_list = db.query(AlbumSeries).filter(AlbumSeries.id.in_(album_series_ids)).all()
        album_series_map = {series.id: series for series in series_list}
    
    # Build result efficiently
    result = []
    for song in songs:
        song_dict = song.__dict__.copy()
        song_dict["artist_image_url"] = song.artist_obj.image_url if song.artist_obj else None
        
        # Attach authoring
        if hasattr(song, "authoring") and song.authoring:
            song_dict["authoring"] = song.authoring
        
        # Attach collaborations
        if hasattr(song, "collaborations"):
            song_dict["collaborations"] = song.collaborations
        
        # Attach album series data from pre-fetched map
        if song.album_series_id and song.album_series_id in album_series_map:
            series = album_series_map[song.album_series_id]
            song_dict["album_series_number"] = series.series_number
            song_dict["album_series_name"] = series.album_name
        
        result.append(SongOut.model_validate(song_dict, from_attributes=True))
    
    return result

@router.delete("/{song_id}", status_code=204)
def delete_song(song_id: int, db: Session = Depends(get_db)):
    success = delete_song_from_db(db, song_id)
    if not success:
        raise HTTPException(status_code=404, detail="Song not found")

@router.post("/batch", response_model=list[SongOut])
def create_songs_batch(songs: List[SongCreate], db: Session = Depends(get_db)):
    new_songs = []
    errors = []
    
    for i, song_data in enumerate(songs):
        try:
            # Force the author to be yaniv297 for all new songs
            song_dict = song_data.dict()
            song_dict["author"] = "yaniv297"
            
            # Create a new SongCreate object with the forced author
            from schemas import SongCreate
            song_with_author = SongCreate(**song_dict)
            
            new_song = create_song_in_db(db, song_with_author)
            new_songs.append(new_song)
        except HTTPException as e:
            # If it's a duplicate error, add it to errors list but continue
            if e.status_code == 400 and "already exists" in e.detail:
                errors.append(f"Song {i+1}: {e.detail}")
            else:
                # Re-raise other HTTP exceptions
                raise e
        except Exception as e:
            errors.append(f"Song {i+1}: {str(e)}")
    
    # If there were any errors, return them along with successfully created songs
    if errors:
        raise HTTPException(
            status_code=400,
            detail=f"Some songs could not be created: {'; '.join(errors)}"
        )
    
    return new_songs

@router.patch("/{song_id}", response_model=SongOut)
def update_song(song_id: int, updates: dict = Body(...), db: Session = Depends(get_db)):
    song = db.query(Song).options(
        joinedload(Song.collaborations)
    ).get(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    # Handle collaborations update if provided
    if "collaborations" in updates:
        # Delete existing collaborations
        db.query(SongCollaboration).filter(SongCollaboration.song_id == song_id).delete()
        
        # Add new collaborations
        collaborations = updates["collaborations"]
        
        # Handle both string format (comma-separated) and list format
        if isinstance(collaborations, str):
            # Split comma-separated string and clean up
            collab_names = [name.strip() for name in collaborations.split(",") if name.strip()]
        elif isinstance(collaborations, list):
            # Handle list of strings or list of dictionaries
            collab_names = []
            for collab_data in collaborations:
                if isinstance(collab_data, str):
                    collab_names.append(collab_data)
                elif isinstance(collab_data, dict) and "author" in collab_data:
                    collab_names.append(collab_data["author"])
                else:
                    continue
        else:
            collab_names = []
        
        # Add collaborations to database
        for author in collab_names:
            if author and author != "yaniv297":  # Don't add self as collaborator
                db_collab = SongCollaboration(
                    song_id=song_id,
                    author=author,
                    parts=None
                )
                db.add(db_collab)
        
        # Remove collaborations from updates dict to avoid setting it as an attribute
        del updates["collaborations"]

    # Update other fields
    for key, value in updates.items():
        if hasattr(song, key):
            setattr(song, key, value)

    db.commit()
    db.refresh(song)
    result = SongOut.model_validate(song, from_attributes=True)
    result.artist_image_url = song.artist_obj.image_url if song.artist_obj else None
    return result

@router.post("/release-pack")
def release_pack(pack: str, db: Session = Depends(get_db)):
    songs = db.query(Song).filter(Song.pack == pack).all()
    for song in songs:
        song.status = SongStatus.released
    db.commit()
    return {"message": f"Released pack: {pack}"}

@router.post("/bulk-delete")
def bulk_delete(song_ids: list[int], db: Session = Depends(get_db)):
    for song_id in song_ids:
        delete_song_from_db(db, song_id)
    return {"message": f"Deleted {len(song_ids)} songs"}

@router.post("/{song_id}/collaborations")
def add_collaborations(song_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    song = db.query(Song).get(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    # Delete existing collaborations
    db.query(SongCollaboration).filter(SongCollaboration.song_id == song_id).delete()
    
    # Add new collaborations
    collaborations = data.get("collaborations", [])
    for collab_data in collaborations:
        db_collab = SongCollaboration(
            song_id=song_id,
            author=collab_data["author"],
            parts=None  # No longer using parts
        )
        db.add(db_collab)
    
    db.commit()
    return {"message": f"Updated collaborations for song {song_id}"}

@router.get("/autocomplete/artists")
def get_artists_autocomplete(query: str = Query(""), db: Session = Depends(get_db)):
    """Get artists for auto-complete"""
    if not query:
        return []
    
    artists = db.query(Song.artist).filter(
        Song.author == "yaniv297",
        Song.artist.ilike(f"%{query}%")
    ).distinct().limit(10).all()
    
    return [artist[0] for artist in artists if artist[0]]

@router.get("/autocomplete/albums")
def get_albums_autocomplete(query: str = Query(""), db: Session = Depends(get_db)):
    """Get albums for auto-complete"""
    if not query:
        return []
    
    albums = db.query(Song.album).filter(
        Song.author == "yaniv297",
        Song.album.ilike(f"%{query}%")
    ).distinct().limit(10).all()
    
    return [album[0] for album in albums if album[0]]

@router.get("/autocomplete/collaborators")
def get_collaborators_autocomplete(query: str = Query(""), db: Session = Depends(get_db)):
    """Get collaborators for auto-complete"""
    if not query:
        return []
    
    collaborators = db.query(SongCollaboration.author).filter(
        SongCollaboration.author.ilike(f"%{query}%"),
        SongCollaboration.author != "yaniv297"
    ).distinct().limit(10).all()
    
    return [collab[0] for collab in collaborators if collab[0]]

@router.get("/autocomplete/packs")
def get_packs_autocomplete(query: str = Query(""), db: Session = Depends(get_db)):
    """Get packs for auto-complete"""
    if not query:
        return []
    
    packs = db.query(Song.pack).filter(
        Song.author == "yaniv297",
        Song.pack.ilike(f"%{query}%"),
        Song.pack.isnot(None)
    ).distinct().limit(10).all()
    
    return [pack[0] for pack in packs if pack[0]]

@router.get("/debug-songs")
def debug_songs(db: Session = Depends(get_db)):
    songs = db.query(Song).all()
    return {"count": len(songs), "titles": [song.title for song in songs]}
