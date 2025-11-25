from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from database import get_db
from auth import get_current_user
from models import User, Song, Artist, ActivityLog, ReleasePost, Pack, PostType
from schemas import (
    UserOut,
    ActivityLogOut,
    RecentlyAuthoredPartOut,
    ReleasePostCreate,
    ReleasePostUpdate,
    ReleasePostOut,
    SongOut,
)
from typing import List, Optional
from datetime import timedelta, datetime
from .auth import create_access_token, clear_user_cache
from .user_activity import get_online_user_count, get_online_user_ids
from pydantic import BaseModel
import json

router = APIRouter(prefix="/admin", tags=["admin"])

class BroadcastNotificationRequest(BaseModel):
    title: str
    message: str

def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to check if user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/users", response_model=List[UserOut])
def list_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all users (admin only)"""
    from sqlalchemy import func
    from models import Song
    
    # Get users with song counts
    users_with_counts = db.query(
        User,
        func.count(Song.id).label('song_count')
    ).outerjoin(
        Song, User.id == Song.user_id
    ).group_by(User.id).all()
    
    # Convert to UserOut format
    result = []
    for user, song_count in users_with_counts:
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
            "display_name": user.display_name,
            "preferred_contact_method": user.preferred_contact_method,
            "discord_username": user.discord_username,
            "song_count": song_count or 0
        }
        result.append(UserOut(**user_dict))
    
    return result

@router.patch("/users/{user_id}/toggle-admin")
def toggle_admin_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Toggle admin status for a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-demotion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot change your own admin status"
        )
    
    user.is_admin = not user.is_admin
    db.commit()
    db.refresh(user)
    
    return {
        "user_id": user.id,
        "username": user.username,
        "is_admin": user.is_admin
    }

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.username} deleted successfully"}

@router.post("/impersonate/{user_id}")
def impersonate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get an access token for another user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Clear user cache to prevent confusion between admin and impersonated user
    clear_user_cache()
    
    # Create access token for the target user using the same function as login
    access_token_expires = timedelta(minutes=1440)  # 24 hours, same as login
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "impersonated": True
    }

@router.get("/online-users")
def get_online_users_count(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get count and list of users currently online (admin only)"""
    online_user_ids_list = get_online_user_ids()
    
    # Get usernames for online users
    if online_user_ids_list:
        users = db.query(User).filter(User.id.in_(online_user_ids_list)).all()
        usernames = [user.username for user in users]
    else:
        usernames = []
    
    return {
        "online_count": len(usernames),
        "online_users": usernames
    }

@router.post("/fix-song-artist-links")
def fix_song_artist_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Link songs with null artist_id to existing artists by name"""
    from sqlalchemy import func
    log_entries = []
    songs_to_fix = db.query(Song).filter(
        Song.artist_id.is_(None),
        Song.artist.isnot(None),
        Song.artist != ""
    ).all()

    if not songs_to_fix:
        return {"message": "No songs with missing artist links found", "linked": 0, "checked": 0}

    linked = 0
    missing_artists = set()

    for song in songs_to_fix:
        artist = db.query(Artist).filter(
            func.lower(Artist.name) == func.lower(song.artist)
        ).first()
        if artist:
            song.artist_id = artist.id
            linked += 1
            if len(log_entries) < 200:
                log_entries.append(f"✅ Linked song '{song.title}' to artist {artist.name}")
        else:
            missing_artists.add(song.artist)
            if len(log_entries) < 200:
                log_entries.append(f"⚠️ Artist '{song.artist}' not found for song '{song.title}'")

    db.commit()

    return {
        "message": f"Linked {linked} songs to artists. {len(missing_artists)} artists still missing.",
        "linked": linked,
        "checked": len(songs_to_fix),
        "missing_artist_names": list(missing_artists)[:25],
        "log": log_entries
    }

@router.get("/activity-feed", response_model=List[ActivityLogOut])
def get_activity_feed(
    limit: Optional[int] = Query(50, ge=1, le=500),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get activity feed for admin (admin only) - only shows last 48 hours"""
    from datetime import datetime, timedelta
    
    # Only show activities from the last 48 hours
    cutoff_time = datetime.utcnow() - timedelta(hours=48)
    
    activities = db.query(ActivityLog).join(User).filter(
        ActivityLog.created_at >= cutoff_time
    ).order_by(
        ActivityLog.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    result = []
    for activity in activities:
        # Parse metadata JSON if present
        metadata = None
        if activity.metadata_json:
            try:
                metadata = json.loads(activity.metadata_json)
            except:
                pass
        
        result.append(ActivityLogOut(
            id=activity.id,
            user_id=activity.user_id,
            username=activity.user.username,
            activity_type=activity.activity_type,
            description=activity.description,
            metadata=metadata,
            created_at=activity.created_at
        ))
    
    return result

@router.get("/recently-authored-parts", response_model=List[RecentlyAuthoredPartOut])
def get_recently_authored_parts(
    limit: Optional[int] = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Return the most recent song progress completions across the platform."""
    rows = db.execute(
        text(
            """
            SELECT
                sp.id,
                sp.song_id,
                sp.step_name,
                sp.completed_at,
                s.title AS song_title,
                s.artist AS song_artist,
                s.album_cover AS album_cover,
                u.id AS user_id,
                u.username AS username
            FROM song_progress sp
            JOIN songs s ON sp.song_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE sp.is_completed = 1
              AND sp.completed_at IS NOT NULL
            ORDER BY sp.completed_at DESC
            LIMIT :limit
            """
        ),
        {"limit": limit},
    ).mappings().all()
    
    return [
        RecentlyAuthoredPartOut(
            id=row["id"],
            song_id=row["song_id"],
            song_title=row["song_title"],
            song_artist=row["song_artist"],
            album_cover=row["album_cover"],
            step_name=row["step_name"],
            completed_at=row["completed_at"],
            user_id=row["user_id"],
            username=row["username"],
        )
        for row in rows
    ]

@router.post("/broadcast-notification")
def broadcast_notification(
    request: BroadcastNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Send a notification to all users (admin only)"""
    from api.notifications.services.notification_service import NotificationService
    from models import NotificationType
    
    title = request.title
    message = request.message
    
    if not title or not message:
        raise HTTPException(status_code=400, detail="Title and message are required")
    
    # Get all active users
    users = db.query(User).filter(User.is_active == True).all()
    
    if not users:
        return {"message": "No active users found", "sent_count": 0}
    
    # Initialize notification service
    notification_service = NotificationService(db)
    
    sent_count = 0
    errors = []
    
    for user in users:
        try:
            notification_service.create_general_notification(
                user_id=user.id,
                title=title,
                message=message
            )
            sent_count += 1
        except Exception as e:
            errors.append(f"Failed to send to {user.username}: {str(e)}")
    
    result = {
        "message": f"Broadcast notification sent to {sent_count} users",
        "sent_count": sent_count,
        "total_users": len(users)
    }
    
    if errors:
        result["errors"] = errors[:10]  # Limit to first 10 errors
    
    return result


# ==================== RELEASE POST MANAGEMENT ====================

@router.get("/release-posts", response_model=List[ReleasePostOut])
def list_release_posts(
    published_only: Optional[bool] = Query(False),
    limit: Optional[int] = Query(20, le=100),
    offset: Optional[int] = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all release posts (admin only)"""
    query = db.query(ReleasePost).options(
        joinedload(ReleasePost.author),
        joinedload(ReleasePost.pack)
    )
    
    if published_only:
        query = query.filter(ReleasePost.is_published == True)
    
    posts = query.order_by(
        ReleasePost.is_featured.desc(),
        ReleasePost.published_at.desc().nullslast(),
        ReleasePost.created_at.desc()
    ).offset(offset).limit(limit).all()
    
    result = []
    for post in posts:
        # Parse linked song IDs and fetch songs
        linked_songs = []
        if post.linked_song_ids:
            try:
                song_ids = json.loads(post.linked_song_ids)
                if song_ids:
                    songs = db.query(Song).filter(Song.id.in_(song_ids)).all()
                    linked_songs = [format_song_for_release_post(song) for song in songs]
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Parse tags
        tags = []
        if post.tags:
            try:
                tags = json.loads(post.tags)
            except (json.JSONDecodeError, TypeError):
                pass
        
        result.append(ReleasePostOut(
            id=post.id,
            post_type=post.post_type,
            title=post.title,
            subtitle=post.subtitle,
            description=post.description,
            cover_image_url=post.cover_image_url,
            banner_image_url=post.banner_image_url,
            author_id=post.author_id,
            author_username=post.author.username,
            is_published=post.is_published,
            is_featured=post.is_featured,
            published_at=post.published_at,
            pack_id=post.pack_id,
            pack_name=post.pack.name if post.pack else None,
            linked_song_ids=json.loads(post.linked_song_ids) if post.linked_song_ids else None,
            linked_songs=linked_songs,
            slug=post.slug,
            tags=tags,
            created_at=post.created_at,
            updated_at=post.updated_at
        ))
    
    return result

@router.post("/release-posts", response_model=ReleasePostOut)
def create_release_post(
    post_data: ReleasePostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new release post (admin only)"""
    
    # Generate slug if not provided
    slug = post_data.slug
    if not slug and post_data.title:
        import re
        slug = re.sub(r'[^a-zA-Z0-9\s\-]', '', post_data.title.lower())
        slug = re.sub(r'[\s\-]+', '-', slug).strip('-')
        
        # Ensure slug is unique
        counter = 1
        original_slug = slug
        while db.query(ReleasePost).filter(ReleasePost.slug == slug).first():
            slug = f"{original_slug}-{counter}"
            counter += 1
    
    # Serialize lists to JSON
    linked_song_ids_json = None
    if post_data.linked_song_ids:
        linked_song_ids_json = json.dumps(post_data.linked_song_ids)
    
    tags_json = None
    if post_data.tags:
        tags_json = json.dumps(post_data.tags)
    
    # Set published_at if publishing
    published_at = post_data.published_at
    if post_data.is_published and not published_at:
        published_at = datetime.utcnow()
    
    new_post = ReleasePost(
        post_type=post_data.post_type,
        title=post_data.title,
        subtitle=post_data.subtitle,
        description=post_data.description,
        cover_image_url=post_data.cover_image_url,
        banner_image_url=post_data.banner_image_url,
        author_id=current_user.id,
        is_published=post_data.is_published,
        is_featured=post_data.is_featured,
        published_at=published_at,
        pack_id=post_data.pack_id,
        linked_song_ids=linked_song_ids_json,
        slug=slug,
        tags=tags_json
    )
    
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    # Return formatted response
    return get_release_post_response(db, new_post)

@router.post("/release-posts/auto-generate")
def auto_generate_release_post(
    pack_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Auto-generate a release post from a pack (admin only)"""
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    # Get songs in the pack
    songs = db.query(Song).filter(
        Song.pack_id == pack_id,
        Song.status == "Released"
    ).all()
    
    if not songs:
        raise HTTPException(status_code=400, detail="No released songs found in pack")
    
    # Generate post content
    artist = songs[0].artist if songs else "Various Artists"
    album = songs[0].album if songs and songs[0].album else pack.name
    song_count = len(songs)
    
    title = f"{artist} - {album}"
    subtitle = f"{song_count} song{'s' if song_count != 1 else ''} now available"
    description = f"The complete {album} pack by {artist} is now available for rhythm gaming! " \
                 f"Featuring {song_count} track{'s' if song_count != 1 else ''}: " \
                 + ", ".join([f'"{song.title}"' for song in songs[:5]]) \
                 + ("..." if len(songs) > 5 else "")
    
    # Use first song's album cover or pack cover
    cover_image_url = songs[0].album_cover if songs and songs[0].album_cover else None
    
    new_post = ReleasePost(
        post_type=PostType.PACK_RELEASE,
        title=title,
        subtitle=subtitle,
        description=description,
        cover_image_url=cover_image_url,
        author_id=current_user.id,
        is_published=False,  # Start as draft
        is_featured=False,
        pack_id=pack_id,
        linked_song_ids=json.dumps([song.id for song in songs]),
        tags=json.dumps([artist.lower(), album.lower(), "pack", "release"])
    )
    
    # Generate slug
    import re
    slug = re.sub(r'[^a-zA-Z0-9\s\-]', '', title.lower())
    slug = re.sub(r'[\s\-]+', '-', slug).strip('-')
    
    # Ensure slug is unique
    counter = 1
    original_slug = slug
    while db.query(ReleasePost).filter(ReleasePost.slug == slug).first():
        slug = f"{original_slug}-{counter}"
        counter += 1
    
    new_post.slug = slug
    
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    return get_release_post_response(db, new_post)


def get_release_post_response(db: Session, post: ReleasePost) -> ReleasePostOut:
    """Helper to format release post response"""
    # Load relationships if not loaded
    if not hasattr(post, 'author') or post.author is None:
        post = db.query(ReleasePost).options(
            joinedload(ReleasePost.author),
            joinedload(ReleasePost.pack)
        ).filter(ReleasePost.id == post.id).first()
    
    # Parse linked song IDs and fetch songs
    linked_songs = []
    if post.linked_song_ids:
        try:
            song_ids = json.loads(post.linked_song_ids)
            if song_ids:
                songs = db.query(Song).filter(Song.id.in_(song_ids)).all()
                linked_songs = [format_song_for_release_post(song) for song in songs]
        except (json.JSONDecodeError, TypeError):
            pass
    
    # Parse tags
    tags = []
    if post.tags:
        try:
            tags = json.loads(post.tags)
        except (json.JSONDecodeError, TypeError):
            pass
    
    return ReleasePostOut(
        id=post.id,
        post_type=post.post_type,
        title=post.title,
        subtitle=post.subtitle,
        description=post.description,
        cover_image_url=post.cover_image_url,
        banner_image_url=post.banner_image_url,
        author_id=post.author_id,
        author_username=post.author.username,
        is_published=post.is_published,
        is_featured=post.is_featured,
        published_at=post.published_at,
        pack_id=post.pack_id,
        pack_name=post.pack.name if post.pack else None,
        linked_song_ids=json.loads(post.linked_song_ids) if post.linked_song_ids else None,
        linked_songs=linked_songs,
        slug=post.slug,
        tags=tags,
        created_at=post.created_at,
        updated_at=post.updated_at
    )

def format_song_for_release_post(song: Song) -> SongOut:
    """Helper to format song for release post"""
    return SongOut(
        id=song.id,
        title=song.title,
        artist=song.artist,
        album=song.album,
        status=song.status,
        pack_id=song.pack_id,
        year=song.year,
        album_cover=song.album_cover,
        author=song.user.username if song.user else "Unknown",
        user_id=song.user_id,
        collaborations=[],
        authoring=None,
        optional=song.optional,
        released_at=song.released_at
    )
