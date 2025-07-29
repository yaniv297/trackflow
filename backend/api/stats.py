from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Song, SongStatus, Artist, SongCollaboration
from sqlalchemy import func, text

router = APIRouter(prefix="/stats", tags=["Stats"], trailing_slash=False)

@router.get("")
def get_stats(db: Session = Depends(get_db)):
    included_statuses = [SongStatus.released, SongStatus.wip]

    # Get all stats in optimized queries
    total = db.query(Song).filter(Song.status.in_(included_statuses)).count()

    by_status = dict(
        db.query(Song.status, func.count())
          .filter(Song.status.in_(included_statuses))
          .group_by(Song.status)
          .all()
    )

    # Get top artists with a single optimized query
    top_artists_data = db.query(
        Song.artist, 
        func.count().label('count')
    ).filter(
        Song.status.in_(included_statuses),
        Song.artist.isnot(None)
    ).group_by(
        Song.artist
    ).order_by(
        func.count().desc()
    ).limit(50).all()

    # Get all unique artists for batch lookup
    artist_names = [row.artist for row in top_artists_data]
    artist_images = dict(
        db.query(Artist.name, Artist.image_url)
          .filter(Artist.name.in_(artist_names))
          .all()
    )

    top_artists = [
        {
            "artist": row.artist, 
            "count": row.count, 
            "artist_image_url": artist_images.get(row.artist)
        }
        for row in top_artists_data
    ]

    # Get top albums
    top_albums = [
        {"album": album, "count": count, "album_cover": album_cover, "artist": artist}
        for album, count, album_cover, artist in db.query(
            Song.album, 
            func.count(), 
            Song.album_cover, 
            Song.artist
        ).filter(
            Song.status.in_(included_statuses),
            Song.album.isnot(None)
        ).group_by(
            Song.album, Song.album_cover, Song.artist
        ).order_by(
            func.count().desc()
        ).limit(50).all()
    ]

    # Optimized pack processing with single query
    pack_artist_counts = db.query(
        Song.pack,
        Song.artist,
        func.count().label('artist_count')
    ).filter(
        Song.status.in_(included_statuses),
        Song.pack.isnot(None),
        Song.artist.isnot(None)
    ).group_by(
        Song.pack, Song.artist
    ).subquery()

    # Get the most common artist per pack using window function
    pack_ranked_artists = db.query(
        pack_artist_counts.c.pack,
        pack_artist_counts.c.artist,
        func.row_number().over(
            partition_by=pack_artist_counts.c.pack,
            order_by=pack_artist_counts.c.artist_count.desc()
        ).label('rank')
    ).subquery()

    pack_counts = dict(
        db.query(Song.pack, func.count())
          .filter(Song.status.in_(included_statuses), Song.pack.isnot(None))
          .group_by(Song.pack)
          .order_by(func.count().desc())
          .limit(50)
          .all()
    )

    # Get top pack artists in batch
    top_pack_artists = db.query(
        pack_ranked_artists.c.pack,
        pack_ranked_artists.c.artist
    ).filter(
        pack_ranked_artists.c.rank == 1,
        pack_ranked_artists.c.pack.in_(pack_counts.keys())
    ).all()

    pack_artist_names = [row.artist for row in top_pack_artists]
    pack_artist_images = dict(
        db.query(Artist.name, Artist.image_url)
          .filter(Artist.name.in_(pack_artist_names))
          .all()
    )

    top_packs = []
    for pack, count in pack_counts.items():
        pack_artist = next((row.artist for row in top_pack_artists if row.pack == pack), None)
        top_packs.append({
            "pack": pack,
            "count": count,
            "artist": pack_artist,
            "artist_image_url": pack_artist_images.get(pack_artist) if pack_artist else None
        })

    # Get total counts
    total_artists = db.query(Song.artist).filter(
        Song.status.in_(included_statuses),
        Song.artist.isnot(None)
    ).distinct().count()
    
    total_albums = db.query(Song.album).filter(
        Song.status.in_(included_statuses),
        Song.album.isnot(None)
    ).distinct().count()
    
    total_packs = db.query(Song.pack).filter(
        Song.status.in_(included_statuses),
        Song.pack.isnot(None)
    ).distinct().count()

    # Get collaboration stats
    total_collaborations = db.query(SongCollaboration).count()
    
    # Get unique collaborators count
    total_collaborators = db.query(SongCollaboration.author).distinct().count()
    
    # Get top collaborators (excluding the current user)
    top_collaborators = [
        {"author": author, "count": count}
        for author, count in db.query(
            SongCollaboration.author,
            func.count().label('count')
        ).filter(
            SongCollaboration.author != "yaniv297"  # Exclude current user
        ).group_by(
            SongCollaboration.author
        ).order_by(
            func.count().desc()
        ).limit(10).all()
    ]

    # Get year distribution
    year_distribution = [
        {"year": year, "count": count}
        for year, count in db.query(
            Song.year, func.count()
        ).filter(
            Song.status.in_(included_statuses),
            Song.year.isnot(None)
        ).group_by(
            Song.year
        ).order_by(
            Song.year.asc()
        ).all()
    ]

    # Optimized WIP processing - only load necessary fields
    wip_songs = db.query(Song).filter(
        Song.status == SongStatus.wip
    ).all()
    
    total_wips = len(wip_songs)
    authoring_fields = [
        "demucs", "tempo_map", "fake_ending", "drums", "bass", "guitar",
        "vocals", "harmonies", "pro_keys", "keys", "animations",
        "drum_fills", "overdrive", "compile"
    ]
    progress = {field: 0 for field in authoring_fields}

    # Count fully ready WIP songs and progress
    fully_ready_wips = 0
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
        "total_collaborations": total_collaborations,
        "total_collaborators": total_collaborators,
        "top_collaborators": top_collaborators,
        "authoring_progress": authoring_percent,
        "fully_ready_wips": fully_ready_wips,
        "year_distribution": year_distribution,
    }

@router.get("/year/{year}/details")
def get_year_details(year: int, db: Session = Depends(get_db)):
    included_statuses = [SongStatus.released, SongStatus.wip]
    
    # Get total songs for the year
    total_songs = db.query(Song).filter(
        Song.year == year,
        Song.status.in_(included_statuses)
    ).count()
    
    # Get top artists with optimized query
    top_artists_data = db.query(
        Song.artist,
        func.count().label('count')
    ).filter(
        Song.year == year,
        Song.status.in_(included_statuses),
        Song.artist.isnot(None)
    ).group_by(
        Song.artist
    ).order_by(
        func.count().desc()
    ).limit(5).all()
    
    # Batch lookup artist images
    artist_names = [row.artist for row in top_artists_data]
    artist_images = dict(
        db.query(Artist.name, Artist.image_url)
          .filter(Artist.name.in_(artist_names))
          .all()
    )
    
    top_artists = [
        {
            "artist": row.artist, 
            "count": row.count, 
            "artist_image_url": artist_images.get(row.artist)
        }
        for row in top_artists_data
    ]
    
    # Get top albums with optimized query
    top_albums_data = db.query(
        Song.album,
        func.count().label('count'),
        Song.album_cover
    ).filter(
        Song.year == year,
        Song.status.in_(included_statuses),
        Song.album.isnot(None)
    ).group_by(
        Song.album, Song.album_cover
    ).order_by(
        func.count().desc()
    ).limit(5).all()
    
    top_albums = [
        {
            "album": row.album, 
            "count": row.count, 
            "album_cover": row.album_cover
        }
        for row in top_albums_data
    ]
    
    return {
        "year": year,
        "total_songs": total_songs,
        "top_artists": top_artists,
        "top_albums": top_albums
    }