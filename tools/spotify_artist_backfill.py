import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from spotipy import Spotify
from spotipy.oauth2 import SpotifyClientCredentials
from database import SessionLocal
from models import Song, Artist
from frontend.src.config import SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET

sp = Spotify(auth_manager=SpotifyClientCredentials(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET
))

def backfill_artist_images():
    db = SessionLocal()
    # Get all unique artist names from songs
    artist_names = set(
        a for (a,) in db.query(Song.artist).distinct() if a
    )
    print(f"Found {len(artist_names)} unique artists.")
    added = 0
    for name in artist_names:
        artist = db.query(Artist).filter_by(name=name).first()
        if not artist:
            # Fetch image from Spotify
            image_url = None
            try:
                res = sp.search(q=name, type="artist", limit=1)
                items = res.get("artists", {}).get("items", [])
                if items and items[0].get("images"):
                    image_url = items[0]["images"][0]["url"]
            except Exception as e:
                print(f"Error fetching {name}: {e}")
            artist = Artist(name=name, image_url=image_url)
            db.add(artist)
            db.flush()  # assign id
            added += 1
            print(f"Added: {name} ({'image' if image_url else 'no image'})")
        # Set artist_id for all songs by this artist
        db.query(Song).filter(Song.artist == name).update({"artist_id": artist.id})
    db.commit()
    print(f"Done. Added {added} new artists and updated artist_id for all songs.")
    db.close()

if __name__ == "__main__":
    backfill_artist_images() 