from sqlalchemy.orm import Session
from models import Song, AuthoringProgress, SongCollaboration, User
from schemas import SongCreate, AuthoringUpdate
from fastapi import HTTPException



def get_songs(db: Session):
    return db.query(Song).all()

def create_song_in_db(db: Session, song: SongCreate, user: User):
    # Extract collaborations from the song data
    song_data = song.dict()
    collaborations = song_data.pop('collaborations', [])
    
    # Check if song already exists for this user (same title and artist)
    existing_song = db.query(Song).filter(
        Song.title == song_data.get('title'),
        Song.artist == song_data.get('artist'),
        Song.user_id == user.id
    ).first()
    
    if existing_song:
        raise HTTPException(
            status_code=400,
            detail=f"Song '{song_data.get('title')}' by {song_data.get('artist')} already exists in your database"
        )
    
    print(f"Creating song: {song_data.get('title')} by {song_data.get('artist')} with author: {song_data.get('author')}")
    
    # Ensure user_id is set
    song_data['user_id'] = user.id
    
    db_song = Song(**song_data)
    db.add(db_song)
    db.commit()
    db.refresh(db_song)
    
    print(f"Successfully created song with ID: {db_song.id}")
    
    # Create collaboration records if provided
    if collaborations:
        for collab_data in collaborations:
            # Handle both Pydantic objects and dicts
            if hasattr(collab_data, 'author'):
                author = collab_data.author
            else:
                author = collab_data['author']
            
            # Don't add the current user as a collaborator
            if author != user.username:
                db_collab = SongCollaboration(
                    song_id=db_song.id,
                    author=author,
                    parts=None  # No longer using parts
                )
                db.add(db_collab)
        db.commit()
    
    # Auto-create authoring row if song is "In Progress"
    if db_song.status.value == "In Progress":
        db_authoring = AuthoringProgress(song_id=db_song.id)
        db.add(db_authoring)
        db.commit()
        db.refresh(db_authoring)
    
    # Auto-enhance song with Spotify data
    try:
        from api.spotify import auto_enhance_song
        if auto_enhance_song(db_song.id, db):
            print(f"Auto-enhanced song {db_song.id} with Spotify data")
        else:
            print(f"Auto-enhancement skipped for song {db_song.id}")
    except Exception as e:
        print(f"Failed to auto-enhance song {db_song.id}: {e}")
        
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
        print(f"Song {song_id} not found in database")
        return False

    print(f"Attempting to delete song {song_id}: '{song.title}' by {song.artist}")

    # Try multiple times with exponential backoff
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Delete all related records in a single transaction
            # Delete authoring row if exists
            db.query(AuthoringProgress).filter(AuthoringProgress.song_id == song_id).delete()
            print(f"  Deleted authoring records for song {song_id}")

            # Delete all collaborations at once
            collab_count = db.query(SongCollaboration).filter(SongCollaboration.song_id == song_id).count()
            db.query(SongCollaboration).filter(SongCollaboration.song_id == song_id).delete()
            print(f"  Deleted {collab_count} collaborations for song {song_id}")

            # Finally delete the song
            db.delete(song)
            db.commit()
            print(f"  Successfully deleted song {song_id}")
            return True
            
        except Exception as e:
            db.rollback()
            print(f"Attempt {attempt + 1} failed for song {song_id}: {e}")
            if attempt < max_retries - 1:
                import time
                time.sleep(2 ** attempt)  # Exponential backoff: 1s, 2s, 4s
                continue
            else:
                print(f"All {max_retries} attempts failed for song {song_id}")
                return False
    
    return False
