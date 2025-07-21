from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Song, SongStatus, Artist
from sqlalchemy import func

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/")
def get_stats(db: Session = Depends(get_db)):
    included_statuses = [SongStatus.released, SongStatus.wip]

    # Include both RELEASED and WIP songs in main stats
    base_query = db.query(Song).filter(Song.status.in_(included_statuses))

    total = base_query.count()

    by_status = dict(
        db.query(Song.status, func.count())
          .filter(Song.status.in_(included_statuses))
          .group_by(Song.status)
          .all()
    )

    top_artists = [
        {"artist": artist, "count": count, "artist_image_url": db.query(Artist.image_url).filter(Artist.name == artist).scalar()}
        for artist, count in base_query
            .with_entities(Song.artist, func.count())
            .group_by(Song.artist)
            .order_by(func.count().desc())
            .limit(50)
            .all()
    ]

    top_albums = [
        {"album": album, "count": count, "album_cover": album_cover, "artist": artist}
        for album, count, album_cover, artist in base_query
            .with_entities(Song.album, func.count(), Song.album_cover, Song.artist)
            .group_by(Song.album, Song.album_cover, Song.artist)
            .order_by(func.count().desc())
            .limit(50)
            .all()
    ]

    top_packs = []
    for pack, count in base_query.with_entities(Song.pack, func.count()).group_by(Song.pack).order_by(func.count().desc()).limit(50).all():
        # Find the most common artist in this pack
        pack_songs = db.query(Song).filter(Song.pack == pack, Song.status.in_(included_statuses)).all()
        artist_counts = {}
        for song in pack_songs:
            if song.artist:
                artist_counts[song.artist] = artist_counts.get(song.artist, 0) + 1
        most_common_artist = None
        artist_image_url = None
        if artist_counts:
            most_common_artist = max(artist_counts.items(), key=lambda x: x[1])[0]
            artist_image_url = db.query(Artist.image_url).filter(Artist.name == most_common_artist).scalar()
        top_packs.append({
            "pack": pack,
            "count": count,
            "artist": most_common_artist,
            "artist_image_url": artist_image_url
        })

    # Get total counts (not limited)
    total_artists = db.query(Song.artist).filter(Song.status.in_(included_statuses)).distinct().count()
    total_albums = db.query(Song.album).filter(Song.status.in_(included_statuses)).distinct().count()
    total_packs = db.query(Song.pack).filter(Song.status.in_(included_statuses)).distinct().count()

    # Get year distribution
    year_distribution = [
        {"year": year, "count": count}
        for year, count in base_query
            .with_entities(Song.year, func.count())
            .filter(Song.year.isnot(None))
            .group_by(Song.year)
            .order_by(Song.year.asc())
            .all()
    ]

    # Still include WIP songs for authoring progress
    wip_songs = db.query(Song).filter(Song.status == SongStatus.wip).all()
    total_wips = len(wip_songs)
    authoring_fields = [
        "demucs", "tempo_map", "fake_ending", "drums", "bass", "guitar",
        "vocals", "harmonies", "pro_keys", "keys", "animations",
        "drum_fills", "overdrive", "compile"
    ]
    progress = {field: 0 for field in authoring_fields}

    # Count fully ready WIP songs (all authoring fields complete)
    fully_ready_wips = 0
    # Count WIP songs with at least tempo_map done (actually in progress)
    actually_in_progress = 0
    
    for song in wip_songs:
        if song.authoring:
            all_complete = all(getattr(song.authoring, field, False) for field in authoring_fields)
            if all_complete:
                fully_ready_wips += 1
            elif getattr(song.authoring, "tempo_map", False):
                actually_in_progress += 1
        
        for field in authoring_fields:
            if getattr(song.authoring, field, False):
                progress[field] += 1

    # Adjust by_status to show only songs that are actually in progress
    if "In Progress" in by_status:
        by_status["In Progress"] = actually_in_progress

    authoring_percent = {
        field: round((count / total_wips) * 100, 1) if total_wips else 0
        for field, count in progress.items()
    }

    return {
        "total_songs": total,
        "by_status": by_status,
        "top_artists": top_artists,
        "top_albums": top_albums,
        "top_packs": top_packs,
        "total_artists": total_artists,
        "total_albums": total_albums,
        "total_packs": total_packs,
        "authoring_progress": authoring_percent,
        "fully_ready_wips": fully_ready_wips,
        "year_distribution": year_distribution,
    }

@router.get("/year/{year}/details")
def get_year_details(year: int, db: Session = Depends(get_db)):
    included_statuses = [SongStatus.released, SongStatus.wip]
    year_songs = db.query(Song).filter(
        Song.year == year,
        Song.status.in_(included_statuses)
    ).all()
    artist_counts = {}
    album_counts = {}
    album_covers = {}
    for song in year_songs:
        if song.artist:
            artist_counts[song.artist] = artist_counts.get(song.artist, 0) + 1
        if song.album:
            album_counts[song.album] = album_counts.get(song.album, 0) + 1
            if song.album_cover:
                album_covers[song.album] = song.album_cover
    top_artists = sorted(artist_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    # Add artist_image_url
    top_artists = [
        {"artist": artist, "count": count, "artist_image_url": db.query(Artist.image_url).filter(Artist.name == artist).scalar()}
        for artist, count in top_artists
    ]
    top_albums = sorted(album_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_albums = [
        {"album": album, "count": count, "album_cover": album_covers.get(album)}
        for album, count in top_albums
    ]
    return {
        "year": year,
        "total_songs": len(year_songs),
        "top_artists": top_artists,
        "top_albums": top_albums
    }