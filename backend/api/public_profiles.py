from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import User, Song, Pack, UserStats, Achievement, UserAchievement, SongStatus, Artist
from schemas import PublicUserProfileOut, SongOut
from api.auth import get_optional_user
from typing import Optional, Dict, List
from sqlalchemy import desc, func

router = APIRouter(prefix="/profiles", tags=["Public Profiles"])

def get_artist_images_batch(db: Session, artist_names: List[str]) -> Dict[str, str]:
    """Get artist image URLs for multiple artist names using case-insensitive batch lookup"""
    if not artist_names:
        return {}
    
    artist_name_lowers = {name.lower() for name in artist_names if name}
    artist_images = {
        name.lower(): image_url
        for name, image_url in db.query(Artist.name, Artist.image_url)
            .filter(func.lower(Artist.name).in_(artist_name_lowers))
            .all()
    }
    return artist_images

def get_user_achievement_score(db: Session, user_id: int) -> int:
    """Calculate total achievement score for a user"""
    result = db.query(func.sum(Achievement.points)).join(
        UserAchievement, Achievement.id == UserAchievement.achievement_id
    ).filter(UserAchievement.user_id == user_id).scalar()
    return result or 0

def get_user_achievement_scores_batch(db: Session, user_ids: List[int]) -> Dict[int, int]:
    """Calculate total achievement scores for multiple users in a batch query"""
    if not user_ids:
        return {}
    
    results = db.query(
        UserAchievement.user_id,
        func.sum(Achievement.points).label('total_points')
    ).join(
        Achievement, Achievement.id == UserAchievement.achievement_id
    ).filter(
        UserAchievement.user_id.in_(user_ids)
    ).group_by(UserAchievement.user_id).all()
    
    # Create a dictionary with default score of 0 for users with no achievements
    user_scores = {user_id: 0 for user_id in user_ids}
    for user_id, total_points in results:
        user_scores[user_id] = total_points or 0
    
    return user_scores

def get_user_leaderboard_rank(db: Session, user_id: int) -> Optional[int]:
    """Calculate user's rank on the leaderboard"""
    try:
        # Get all users with their cached total points, sorted like the leaderboard
        users_query = db.query(
            User.id,
            User.username,
            func.coalesce(UserStats.total_points, 0).label('total_points')
        ).outerjoin(
            UserStats, User.id == UserStats.user_id
        ).filter(User.is_active == True).all()
        
        # Sort by points (descending), then by username (ascending) - same logic as leaderboard
        sorted_users = sorted(users_query, key=lambda x: (-x.total_points, x.username))
        
        # Find the user's rank
        for i, user_data in enumerate(sorted_users, 1):
            if user_data.id == user_id:
                return i
        
        return None  # User not found
    except Exception as e:
        print(f"Error calculating leaderboard rank for user {user_id}: {e}")
        return None

def get_user_rarest_achievements(db: Session, user_id: int, limit: int = 3) -> List[Dict]:
    """Get user's rarest achievements by rarity order"""
    rarity_order = {'legendary': 5, 'epic': 4, 'rare': 3, 'uncommon': 2, 'common': 1}
    
    achievements = db.query(Achievement).join(
        UserAchievement, Achievement.id == UserAchievement.achievement_id
    ).filter(UserAchievement.user_id == user_id).all()
    
    # Sort by rarity (rarest first) then by points
    sorted_achievements = sorted(
        achievements, 
        key=lambda a: (rarity_order.get(a.rarity, 0), a.points), 
        reverse=True
    )
    
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "icon": a.icon,
            "rarity": a.rarity,
            "points": a.points
        }
        for a in sorted_achievements[:limit]
    ]

def format_songs_for_profile(songs, artist_images: Dict[str, str]) -> List[Dict]:
    """Format multiple songs for profile response using batch artist images"""
    return [
        {
            "id": song.id,
            "title": song.title,
            "artist": song.artist,
            "album": song.album,
            "year": song.year,
            "status": song.status,
            "album_cover": song.album_cover,
            "artist_image_url": artist_images.get(song.artist.lower()) if song.artist else None,
            "pack_name": song.pack_obj.name if song.pack_obj else None,
            "created_at": song.created_at,
            "released_at": song.released_at
        }
        for song in songs
    ]

def get_user_released_packs(db: Session, user_id: int) -> List[Dict]:
    """Get user's released packs with their songs"""
    packs = db.query(Pack).filter(
        Pack.user_id == user_id,
        Pack.released_at.isnot(None)
    ).options(joinedload(Pack.songs)).order_by(desc(Pack.released_at)).all()
    
    pack_list = []
    for pack in packs:
        released_songs_objs = [song for song in pack.songs if song.status == SongStatus.released]
        
        if released_songs_objs:  # Only include packs that have released songs
            # Get artist images for this pack's songs
            pack_artist_names = [song.artist for song in released_songs_objs if song.artist]
            pack_artist_images = get_artist_images_batch(db, pack_artist_names)
            
            released_songs = format_songs_for_profile(released_songs_objs, pack_artist_images)
            
            pack_list.append({
                "id": pack.id,
                "name": pack.name,
                "released_at": pack.released_at,
                "release_description": pack.release_description,
                "release_download_link": pack.release_download_link,
                "release_youtube_url": pack.release_youtube_url,
                "song_count": len(released_songs),
                "songs": released_songs
            })
    return pack_list

@router.get("/{username}", response_model=PublicUserProfileOut)
def get_public_user_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get public profile information for a user by username.
    Shows:
    - Basic user info (username, display_name, profile image, contact method)
    - Achievement score (total points)
    - Released songs and packs
    - Public WIP songs (if any)
    - Rarest achievements
    """
    
    # Get the user by username
    user = db.query(User).filter(
        User.username == username,
        User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get achievement score
    achievement_score = get_user_achievement_score(db, user.id)
    
    # Get leaderboard rank
    leaderboard_rank = get_user_leaderboard_rank(db, user.id)
    
    # Get released songs (individual songs not in packs or released from packs)
    released_songs_objs = db.query(Song).filter(
        Song.user_id == user.id,
        Song.status == SongStatus.released
    ).options(joinedload(Song.pack_obj)).order_by(desc(Song.released_at)).all()
    
    # Get artist images for released songs
    released_artist_names = [song.artist for song in released_songs_objs if song.artist]
    released_artist_images = get_artist_images_batch(db, released_artist_names)
    
    released_songs = format_songs_for_profile(released_songs_objs, released_artist_images)
    
    # Get released packs
    released_packs = get_user_released_packs(db, user.id)
    
    # Get public WIP songs
    public_wip_songs_objs = db.query(Song).filter(
        Song.user_id == user.id,
        Song.status.in_([SongStatus.wip, SongStatus.future]),
        Song.is_public == True
    ).options(joinedload(Song.pack_obj)).order_by(desc(Song.updated_at)).all()
    
    # Get artist images for public WIP songs
    wip_artist_names = [song.artist for song in public_wip_songs_objs if song.artist]
    wip_artist_images = get_artist_images_batch(db, wip_artist_names)
    
    public_wip_songs = format_songs_for_profile(public_wip_songs_objs, wip_artist_images)
    
    # Get rarest achievements
    rarest_achievements = get_user_rarest_achievements(db, user.id, limit=3)
    
    return PublicUserProfileOut(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        preferred_contact_method=user.preferred_contact_method,
        discord_username=user.discord_username,
        profile_image_url=user.profile_image_url,
        website_url=user.website_url,
        created_at=user.created_at,
        achievement_score=achievement_score,
        leaderboard_rank=leaderboard_rank,
        released_songs=released_songs,
        released_packs=released_packs,
        public_wip_songs=public_wip_songs,
        rarest_achievements=rarest_achievements
    )

@router.get("/")
def list_public_users(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    List all public users with basic profile information.
    Useful for discovering other users in the community.
    """
    
    # Get users ordered by total achievement points or creation date
    users_query = db.query(User).filter(User.is_active == True)
    users = users_query.offset(offset).limit(limit).all()
    
    # Batch fetch achievement scores for all users
    user_ids = [user.id for user in users]
    user_scores = get_user_achievement_scores_batch(db, user_ids)
    
    # Build users with their achievement scores
    users_with_scores = []
    for user in users:
        users_with_scores.append({
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "profile_image_url": user.profile_image_url,
            "created_at": user.created_at,
            "achievement_score": user_scores.get(user.id, 0)
        })
    
    # Sort by achievement score (highest first), then by username
    users_with_scores.sort(key=lambda x: (x["achievement_score"], x["username"]), reverse=True)
    
    return {
        "users": users_with_scores,
        "total_count": users_query.count(),
        "limit": limit,
        "offset": offset
    }