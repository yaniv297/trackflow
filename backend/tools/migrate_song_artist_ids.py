import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from database import SessionLocal
from models import Song, Artist

def migrate_song_artist_ids():
    db = SessionLocal()
    updated = 0
    songs = db.query(Song).all()
    for song in songs:
        if song.artist_id:
            continue
        if not song.artist:
            continue
        artist = db.query(Artist).filter_by(name=song.artist).first()
        if artist:
            song.artist_id = artist.id
            updated += 1
    db.commit()
    print(f"Updated {updated} songs with artist_id.")
    db.close()

if __name__ == "__main__":
    migrate_song_artist_ids() 