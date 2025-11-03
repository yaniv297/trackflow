from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Song, SongStatus, Artist, Collaboration, CollaborationType, User, Pack
from sqlalchemy import func, text, or_
from api.auth import get_current_active_user

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("/")
def get_stats(db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    included_statuses = [SongStatus.released]

    # Build base filter for songs the user has access to (owner OR collaborator)
    song_access_filter = or_(
        Song.user_id == current_user.id,  # Songs owned by current user
        Song.id.in_(  # Songs where current user is a collaborator
            db.query(Collaboration.song_id)
            .filter(
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            )
            .subquery()
        )
    )

    # Get all stats in optimized queries - filter by user access
    total = db.query(Song).filter(
        Song.status.in_(included_statuses),
        song_access_filter
    ).count()

    by_status = dict(
        db.query(Song.status, func.count())
          .filter(
              Song.status.in_(included_statuses),
              song_access_filter
          )
          .group_by(Song.status)
          .all()
    )

    # Get top artists with a single optimized query - filter by user access
    top_artists_data = db.query(
        Song.artist, 
        func.count().label('count')
    ).filter(
        Song.status.in_(included_statuses),
        Song.artist.isnot(None),
        song_access_filter
    ).group_by(
        Song.artist
    ).order_by(
        func.count().desc()
    ).limit(50).all()

    # Get all unique artists for batch lookup - filter by user access
    artist_names = [row.artist for row in top_artists_data]
    artist_images = dict(
        db.query(Artist.name, Artist.image_url)
          .filter(
              Artist.name.in_(artist_names),
              Artist.user_id == current_user.id
          )
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

    # Get top albums - filter by user access
    top_albums = [
        {"album": album, "count": count, "album_cover": album_cover, "artist": artist}
        for album, count, album_cover, artist in db.query(
            Song.album, 
            func.count(), 
            Song.album_cover, 
            Song.artist
        ).filter(
            Song.status.in_(included_statuses),
            Song.album.isnot(None),
            song_access_filter
        ).group_by(
            Song.album, Song.album_cover, Song.artist
        ).order_by(
            func.count().desc()
        ).limit(50).all()
    ]

    # Optimized pack processing with single query - filter by user access
    pack_artist_counts = db.query(
        Pack.name.label('pack'),
        Song.artist,
        func.count().label('artist_count')
    ).join(Song, Pack.id == Song.pack_id).filter(
        Song.status.in_(included_statuses),
        Song.artist.isnot(None),
        song_access_filter
    ).group_by(
        Pack.name, Song.artist
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
        db.query(Pack.name, func.count())
          .join(Song, Pack.id == Song.pack_id).filter(
              Song.status.in_(included_statuses), 
              song_access_filter
          )
          .group_by(Pack.name)
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
        Song.artist.isnot(None),
        song_access_filter
    ).distinct().count()
    
    total_albums = db.query(Song.album).filter(
        Song.status.in_(included_statuses),
        Song.album.isnot(None),
        song_access_filter
    ).distinct().count()
    
    total_packs = db.query(Pack.name).join(Song, Pack.id == Song.pack_id).filter(
        Song.status.in_(included_statuses),
        song_access_filter
    ).distinct().count()

    # Get collaboration stats - include collaborations on songs the user has access to
    total_collaborations = db.query(Collaboration).join(Song).filter(
        song_access_filter,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).count()
    
    # Get unique collaborators count - include collaborations on songs the user has access to
    total_collaborators = db.query(Collaboration.user_id).join(Song).filter(
        song_access_filter,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT
    ).distinct().count()
    
    # Get top collaborators (excluding the current user) - include collaborations on songs the user has access to
    top_collaborators_data = db.query(
        User.username,
        func.count().label('count')
    ).join(Collaboration).join(Song).filter(
        song_access_filter,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT,
        User.username != current_user.username  # Exclude current user
    ).group_by(
        User.username
    ).order_by(
        func.count().desc()
    ).limit(10).all()
    
    top_collaborators = [
        {"author": username, "count": count}
        for username, count in top_collaborators_data
    ]

    # Get year distribution
    year_distribution = [
        {"year": year, "count": count}
        for year, count in db.query(
            Song.year, func.count()
        ).filter(
            Song.status.in_(included_statuses),
            Song.year.isnot(None),
            song_access_filter
        ).group_by(
            Song.year
        ).order_by(
            Song.year.asc()
        ).all()
    ]

    # WIP processing - simplified to avoid errors
    # Just count total WIPs for now and return empty progress
    total_wips = db.query(Song).filter(
        Song.status == SongStatus.wip,
        song_access_filter
    ).count()
    
    # Return empty progress stats for now (workflow-based stats can be added later)
    authoring_percent = {}
    fully_ready_wips = 0
    actually_in_progress = 0

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
def get_year_details(year: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    included_statuses = [SongStatus.released]
    
    # Build base filter for songs the user has access to (owner OR collaborator)
    song_access_filter = or_(
        Song.user_id == current_user.id,  # Songs owned by current user
        Song.id.in_(  # Songs where current user is a collaborator
            db.query(Collaboration.song_id)
            .filter(
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            )
            .subquery()
        )
    )
    
    # Get total songs for the year
    total_songs = db.query(Song).filter(
        Song.year == year,
        Song.status.in_(included_statuses),
        song_access_filter
    ).count()
    
    # Get top artists with optimized query
    top_artists_data = db.query(
        Song.artist,
        func.count().label('count')
    ).filter(
        Song.year == year,
        Song.status.in_(included_statuses),
        Song.artist.isnot(None),
        song_access_filter
    ).group_by(
        Song.artist
    ).order_by(
        func.count().desc()
    ).limit(5).all()
    
    # Batch lookup artist images
    artist_names = [row.artist for row in top_artists_data]
    artist_images = dict(
        db.query(Artist.name, Artist.image_url)
          .filter(
              Artist.name.in_(artist_names),
              Artist.user_id == current_user.id
          )
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
        Song.album.isnot(None),
        song_access_filter
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