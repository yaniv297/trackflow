import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import and_

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from database import SessionLocal
from models import Song, AlbumSeries


def normalize(s: str) -> str:
    return (s or "").strip().lower()


def assign_by_album_and_artist():
    db: Session = SessionLocal()
    try:
        updated = 0
        # Preload all series into a lookup by (artist_name, album_name)
        series_list = db.query(AlbumSeries).all()
        key_to_series = {}
        for s in series_list:
            key = (normalize(s.artist_name), normalize(s.album_name))
            key_to_series[key] = s

        # Iterate songs without album_series_id
        songs = db.query(Song).filter(Song.album_series_id.is_(None)).all()
        for song in songs:
            key = (normalize(song.artist), normalize(song.album))
            series = key_to_series.get(key)
            if series:
                song.album_series_id = series.id
                updated += 1
        db.commit()
        print(f"Assigned album_series_id to {updated} songs based on album+artist match.")
    except Exception as e:
        db.rollback()
        print(f"Assignment failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    assign_by_album_and_artist() 