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
    artist_names = [row.artist for row in top_artists_data if row.artist]
    artist_name_lowers = {name.lower() for name in artist_names}
    artist_images = {
        name.lower(): image_url
        for name, image_url in db.query(Artist.name, Artist.image_url)
            .filter(func.lower(Artist.name).in_(artist_name_lowers))
            .all()
    }

    top_artists = [
        {
            "artist": row.artist, 
            "count": row.count, 
            "artist_image_url": artist_images.get(row.artist.lower()) if row.artist else None
        }
        for row in top_artists_data
    ]

    # Get top albums - filter by user access, group by album and artist only
    top_albums = [
        {"album": album, "count": count, "album_cover": album_cover, "artist": artist}
        for album, count, album_cover, artist in db.query(
            Song.album, 
            func.count(), 
            func.max(Song.album_cover),  # Pick any album cover for the album
            Song.artist
        ).filter(
            Song.status.in_(included_statuses),
            Song.album.isnot(None),
            song_access_filter
        ).group_by(
            Song.album, Song.artist  # Group by album and artist only, ignoring cover differences
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

    pack_artist_names = [row.artist for row in top_pack_artists if row.artist]
    pack_artist_name_lowers = {name.lower() for name in pack_artist_names}
    pack_artist_images = {
        name.lower(): image_url
        for name, image_url in db.query(Artist.name, Artist.image_url)
            .filter(func.lower(Artist.name).in_(pack_artist_name_lowers))
            .all()
    }

    top_packs = []
    for pack, count in pack_counts.items():
        pack_artist = next((row.artist for row in top_pack_artists if row.pack == pack), None)
        top_packs.append({
            "pack": pack,
            "count": count,
            "artist": pack_artist,
            "artist_image_url": pack_artist_images.get(pack_artist.lower()) if pack_artist else None
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
        "point_system": {
            "release_bonus": {
                "points": 10,
                "description": "Points earned per song released"
            }
        }
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
    
    # Batch lookup artist images (case-insensitive, artists are shared)
    artist_names = [row.artist for row in top_artists_data if row.artist]
    artist_name_lowers = {name.lower() for name in artist_names}
    artist_images_lower = dict(
        db.query(func.lower(Artist.name), Artist.image_url)
          .filter(func.lower(Artist.name).in_(artist_name_lowers))
          .all()
    )
    artist_images = {name: artist_images_lower.get(name.lower()) for name in artist_names}
    
    top_artists = [
        {
            "artist": row.artist, 
            "count": row.count, 
            "artist_image_url": artist_images.get(row.artist)
        }
        for row in top_artists_data
    ]
    
    # Get top albums with optimized query, group by album only
    top_albums_data = db.query(
        Song.album,
        func.count().label('count'),
        func.max(Song.album_cover)  # Pick any album cover for the album
    ).filter(
        Song.year == year,
        Song.status.in_(included_statuses),
        Song.album.isnot(None),
        song_access_filter
    ).group_by(
        Song.album  # Group by album only, ignoring cover differences
    ).order_by(
        func.count().desc()
    ).limit(5).all()
    
    top_albums = [
        {
            "album": row[0],  # album
            "count": row[1],  # count
            "album_cover": row[2]  # func.max(Song.album_cover)
        }
        for row in top_albums_data
    ]
    
    return {
        "year": year,
        "total_songs": total_songs,
        "top_artists": top_artists,
        "top_albums": top_albums
    }


@router.get("/user/top_artists")
def get_user_top_artists(limit: int = 5, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    included_statuses = [SongStatus.released]
    
    # Build base filter for songs the user has access to (owner OR collaborator)
    song_access_filter = or_(
        Song.user_id == current_user.id,
        Song.id.in_(
            db.query(Collaboration.song_id)
            .filter(
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            )
            .subquery()
        )
    )
    
    top_artists_data = db.query(
        Song.artist.label('name'),
        func.count().label('count')
    ).filter(
        Song.status.in_(included_statuses),
        Song.artist.isnot(None),
        song_access_filter
    ).group_by(
        Song.artist
    ).order_by(
        func.count().desc()
    ).limit(limit).all()
    
    # Get artist images for the top artists
    artist_names = [artist.name for artist in top_artists_data]
    artist_name_lowers = {name.lower() for name in artist_names}
    artist_images = {
        name.lower(): image_url
        for name, image_url in db.query(Artist.name, Artist.image_url)
            .filter(func.lower(Artist.name).in_(artist_name_lowers))
            .all()
    }
    
    return [
        {
            "name": artist.name, 
            "count": artist.count,
            "artist_image_url": artist_images.get(artist.name.lower())
        } 
        for artist in top_artists_data
    ]


@router.get("/user/top_albums")
def get_user_top_albums(limit: int = 5, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    included_statuses = [SongStatus.released]
    
    song_access_filter = or_(
        Song.user_id == current_user.id,
        Song.id.in_(
            db.query(Collaboration.song_id)
            .filter(
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            )
            .subquery()
        )
    )
    
    top_albums_data = db.query(
        Song.album.label('name'),
        func.count().label('count'),
        func.max(Song.album_cover).label('album_cover'),  # Pick any album cover for the album
        Song.artist.label('artist_name')
    ).filter(
        Song.status.in_(included_statuses),
        Song.album.isnot(None),
        song_access_filter
    ).group_by(
        Song.album, Song.artist  # Group by album and artist only, ignoring cover differences
    ).order_by(
        func.count().desc()
    ).limit(limit).all()
    
    return [
        {
            "name": album.name,
            "artist_name": album.artist_name,
            "count": album.count,
            "album_cover": album.album_cover
        } 
        for album in top_albums_data
    ]


@router.get("/user/top_years")
def get_user_top_years(limit: int = 5, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    included_statuses = [SongStatus.released]
    
    song_access_filter = or_(
        Song.user_id == current_user.id,
        Song.id.in_(
            db.query(Collaboration.song_id)
            .filter(
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            )
            .subquery()
        )
    )
    
    top_years_data = db.query(
        Song.year.label('year'),
        func.count().label('count')
    ).filter(
        Song.status.in_(included_statuses),
        Song.year.isnot(None),
        song_access_filter
    ).group_by(
        Song.year
    ).order_by(
        func.count().desc()
    ).limit(limit).all()
    
    result = []
    for year in top_years_data:
        # Get one song from this year to get an album cover
        sample_song = db.query(Song).filter(
            Song.year == year.year,
            Song.status.in_(included_statuses),
            song_access_filter,
            Song.album_cover.isnot(None)
        ).first()
        
        album_cover = None
        album_name = None
        if sample_song:
            album_cover = sample_song.album_cover
            album_name = sample_song.album
        
        result.append({
            "name": str(year.year),
            "count": year.count,
            "album_cover": album_cover,
            "album_name": album_name
        })
    
    return result


@router.get("/user/top_decades")
def get_user_top_decades(limit: int = 5, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    included_statuses = [SongStatus.released]
    
    song_access_filter = or_(
        Song.user_id == current_user.id,
        Song.id.in_(
            db.query(Collaboration.song_id)
            .filter(
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            )
            .subquery()
        )
    )
    
    # Calculate decade: (year // 10) * 10
    top_decades_data = db.query(
        (func.floor(Song.year / 10) * 10).label('decade'),
        func.count().label('count')
    ).filter(
        Song.status.in_(included_statuses),
        Song.year.isnot(None),
        song_access_filter
    ).group_by(
        func.floor(Song.year / 10) * 10
    ).order_by(
        func.count().desc()
    ).limit(limit).all()
    
    result = []
    for decade_row in top_decades_data:
        decade = int(decade_row.decade)
        # Get one song from this decade to get an album cover
        sample_song = db.query(Song).filter(
            Song.year >= decade,
            Song.year < decade + 10,
            Song.status.in_(included_statuses),
            song_access_filter,
            Song.album_cover.isnot(None)
        ).first()
        
        album_cover = None
        if sample_song:
            album_cover = sample_song.album_cover
        
        result.append({
            "name": f"{decade}s",
            "count": decade_row.count,
            "album_cover": album_cover
        })
    
    return result


@router.get("/user/top_packs")
def get_user_top_packs(limit: int = 5, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    included_statuses = [SongStatus.released]
    
    song_access_filter = or_(
        Song.user_id == current_user.id,
        Song.id.in_(
            db.query(Collaboration.song_id)
            .filter(
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            )
            .subquery()
        )
    )
    
    top_packs_data = db.query(
        Pack.name.label('name'),
        func.count().label('count')
    ).join(Song, Pack.id == Song.pack_id).filter(
        Song.status.in_(included_statuses),
        song_access_filter
    ).group_by(
        Pack.name
    ).order_by(
        func.count().desc()
    ).limit(limit).all()
    
    result = []
    for pack in top_packs_data:
        # Get the most common artist from this pack
        most_common_artist = db.query(
            Song.artist,
            func.count().label('artist_count')
        ).join(Pack, Pack.id == Song.pack_id).filter(
            Pack.name == pack.name,
            Song.status.in_(included_statuses),
            Song.artist.isnot(None),
            song_access_filter
        ).group_by(
            Song.artist
        ).order_by(
            func.count().desc()
        ).first()
        
        artist_image_url = None
        artist_name = None
        if most_common_artist and most_common_artist.artist:
            # Get artist image for this artist
            artist_data = db.query(Artist.image_url).filter(
                func.lower(Artist.name) == most_common_artist.artist.lower()
            ).first()
            if artist_data:
                artist_image_url = artist_data.image_url
                artist_name = most_common_artist.artist
        
        result.append({
            "name": pack.name,
            "count": pack.count,
            "artist_image_url": artist_image_url,
            "artist_name": artist_name
        })
    
    return result


@router.get("/user/top_collaborators")
def get_user_top_collaborators(limit: int = 5, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    song_access_filter = or_(
        Song.user_id == current_user.id,
        Song.id.in_(
            db.query(Collaboration.song_id)
            .filter(
                Collaboration.user_id == current_user.id,
                Collaboration.collaboration_type == CollaborationType.SONG_EDIT
            )
            .subquery()
        )
    )
    
    top_collaborators = db.query(
        User.username.label('name'),
        func.count().label('count')
    ).join(Collaboration).join(Song).filter(
        song_access_filter,
        Collaboration.collaboration_type == CollaborationType.SONG_EDIT,
        User.username != current_user.username  # Exclude current user
    ).group_by(
        User.username
    ).order_by(
        func.count().desc()
    ).limit(limit).all()
    
    return [{"name": collab.name, "count": collab.count} for collab in top_collaborators]