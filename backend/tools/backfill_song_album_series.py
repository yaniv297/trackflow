import os
import sys
from sqlalchemy.orm import Session

# Ensure backend path is on sys.path if needed
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from database import SessionLocal
from models import Song, Pack


def backfill_song_album_series():
    db: Session = SessionLocal()
    try:
        updated = 0
        songs = db.query(Song).all()
        for song in songs:
            if getattr(song, "album_series_id", None) is None and song.pack_id:
                pack = db.query(Pack).filter(Pack.id == song.pack_id).first()
                if pack and getattr(pack, "album_series_id", None):
                    song.album_series_id = pack.album_series_id
                    updated += 1
        db.commit()
        print(f"Backfill complete. Updated {updated} songs.")
    except Exception as e:
        db.rollback()
        print(f"Backfill failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    backfill_song_album_series() 