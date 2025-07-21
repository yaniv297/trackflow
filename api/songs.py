from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from database import get_db
from schemas import SongCreate, SongOut
from api.data_access import create_song_in_db, delete_song_from_db
from models import Song, SongStatus, AuthoringProgress
from typing import Optional
from typing import List

router = APIRouter(prefix="/songs", tags=["Songs"])


@router.post("/", response_model=SongOut)
def create_song(song: SongCreate, db: Session = Depends(get_db)):
    return create_song_in_db(db, song)

@router.get("/", response_model=list[SongOut])
def get_filtered_songs(
    status: Optional[SongStatus] = Query(None),
    query: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(Song).options(joinedload(Song.authoring), joinedload(Song.artist_obj))

    if status:
        q = q.filter(Song.status == status)

    if query:
        pattern = f"%{query}%"
        q = q.filter(
            or_(
                Song.title.ilike(pattern),
                Song.artist.ilike(pattern),
                Song.album.ilike(pattern)
            )
        )

    songs = q.order_by(Song.artist.asc(), Song.title.asc()).all()
    # Attach artist_image_url to each song for the response
    result = []
    for song in songs:
        song_dict = song.__dict__.copy()
        song_dict["artist_image_url"] = song.artist_obj.image_url if song.artist_obj else None
        # Attach authoring as well
        if hasattr(song, "authoring") and song.authoring:
            song_dict["authoring"] = song.authoring
        result.append(SongOut.from_orm(song_dict))
    return result

@router.delete("/{song_id}", status_code=204)
def delete_song(song_id: int, db: Session = Depends(get_db)):
    success = delete_song_from_db(db, song_id)
    if not success:
        raise HTTPException(status_code=404, detail="Song not found")

@router.post("/batch", response_model=list[SongOut])
def create_songs_batch(songs: List[SongCreate], db: Session = Depends(get_db)):
    new_songs = []
    for song_data in songs:
        new_song = Song(**song_data.dict())
        db.add(new_song)
        db.commit()
        db.refresh(new_song)

        if new_song.status == SongStatus.wip:
            authoring = AuthoringProgress(song_id=new_song.id)
            db.add(authoring)
            db.commit()

        new_songs.append(new_song)

    return new_songs

@router.patch("/{song_id}", response_model=SongOut)
def update_song(song_id: int, updates: dict = Body(...), db: Session = Depends(get_db)):
    song = db.query(Song).get(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

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
    songs_to_release = (
        db.query(Song)
        .filter(Song.pack == pack, Song.status == SongStatus.wip)
        .all()
    )

    for song in songs_to_release:
        song.status = SongStatus.released

    db.commit()
    return {"message": f"Released {len(songs_to_release)} songs in pack '{pack}'"}

@router.post("/bulk-delete")
def bulk_delete(song_ids: list[int], db: Session = Depends(get_db)):
    deleted = db.query(Song).filter(Song.id.in_(song_ids)).delete(synchronize_session="fetch")
    db.commit()
    return {"deleted": deleted}