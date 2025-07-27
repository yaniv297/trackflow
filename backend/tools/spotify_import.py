import sys
import spotipy
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Song, SongStatus
import time

# 🔧 Spotipy credentials – already set up
sp = spotipy.Spotify(auth_manager=spotipy.oauth2.SpotifyClientCredentials(
    client_id='7939abf6b76d4fc7a627869350dbe3d7',
    client_secret='b1aefd1ba3504dc28a441b1344698bd9'
))

# 🛠 Main Import Function
def import_playlist_to_db(playlist_url: str):
    db: Session = SessionLocal()

    results = sp.playlist_tracks(playlist_url)
    count = 0

    while results:
        for item in results['items']:
            track = item['track']
            if not track: continue

            title = track['name']
            artist = track['artists'][0]['name']
            album = track['album']['name']
            year = int(track['album']['release_date'][:4]) if track['album'].get('release_date') else None
            cover = track['album']['images'][0]['url'] if track['album']['images'] else None

            # Check if song already exists
            exists = db.query(Song).filter_by(title=title, artist=artist).first()
            if exists:
                print(f"⏩ Skipping: {artist} – {title} (already in DB)")
                continue

            song = Song(
                artist=artist,
                title=title,
                album=album,
                year=year,
                album_cover=cover,
                status=SongStatus.done,
                author="yaniv297"  # Force author to be yaniv297
            )

            db.add(song)
            count += 1
            print(f"✅ Added: {artist} – {title}")

        db.commit()

        # Fetch next page if available
        if results['next']:
            results = sp.next(results)
            time.sleep(0.5)  # throttle to avoid rate limits
        else:
            break

    db.close()
    print(f"\n🎉 Done! Imported {count} new songs.")

# 🏁 Entry Point
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide the playlist URL as a command line argument")
        sys.exit(1)

    playlist_url = sys.argv[1]
    import_playlist_to_db(playlist_url)
