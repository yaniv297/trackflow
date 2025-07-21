from sqlalchemy.orm import Session
from models import Song, AuthoringProgress
from schemas import SongCreate, AuthoringUpdate

def get_songs(db: Session):
    return db.query(Song).all()

def create_song_in_db(db: Session, song: SongCreate):
    db_song = Song(**song.dict())
    db.add(db_song)
    db.commit()
    db.refresh(db_song)
    
        # Auto-create authoring row if song is "In Progress"
    if db_song.status.value == "In Progress":
        db_authoring = AuthoringProgress(song_id=db_song.id)
        db.add(db_authoring)
        db.commit()
        db.refresh(db_authoring)
        
    return db_song

def get_authoring_by_song_id(db: Session, song_id: int):
    return db.query(AuthoringProgress).filter(AuthoringProgress.song_id == song_id).first()

def update_authoring_progress(db: Session, song_id: int, updates: AuthoringUpdate):
    db_row = get_authoring_by_song_id(db, song_id)
    if not db_row:
        return None
    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_row, key, value)
    db.commit()
    db.refresh(db_row)
    return db_row

def delete_song_from_db(db: Session, song_id: int) -> bool:
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        return False

    # Delete authoring row if exists
    authoring = db.query(AuthoringProgress).filter(AuthoringProgress.song_id == song_id).first()
    if authoring:
        db.delete(authoring)

    db.delete(song)
    db.commit()
    return True
