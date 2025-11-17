from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import RockBandDLC
from typing import List, Optional
import time
import hashlib

router = APIRouter(prefix="/rockband-dlc", tags=["Rock Band DLC"])

# Aggressive caching for DLC checks since data never changes
_dlc_cache = {}
DLC_CACHE_TTL = 3600  # 1 hour - data is static

def _get_cache_key(title: str, artist: str) -> str:
    """Generate cache key for title/artist combination"""
    combined = f"{title.lower().strip()}|{artist.lower().strip()}"
    return hashlib.md5(combined.encode()).hexdigest()

def _get_cached_dlc_check(title: str, artist: str):
    """Get DLC check result from cache if not expired"""
    cache_key = _get_cache_key(title, artist)
    if cache_key in _dlc_cache:
        result, timestamp = _dlc_cache[cache_key]
        if time.time() - timestamp < DLC_CACHE_TTL:
            return result
        else:
            del _dlc_cache[cache_key]
    return None

def _cache_dlc_check(title: str, artist: str, result):
    """Cache DLC check result"""
    cache_key = _get_cache_key(title, artist)
    _dlc_cache[cache_key] = (result, time.time())

@router.get("/check")
def check_dlc_status(
    title: str = Query(..., description="Song title"),
    artist: str = Query(..., description="Artist name"),
    db: Session = Depends(get_db)
):
    """Check if a song is already official Rock Band DLC"""
    
    # Clean the input strings
    title_clean = title.strip()
    artist_clean = artist.strip()
    
    # Try cache first
    cached_result = _get_cached_dlc_check(title_clean, artist_clean)
    if cached_result is not None:
        return cached_result
    
    # Search for exact matches first (case insensitive)
    exact_match = db.query(RockBandDLC).filter(
        RockBandDLC.title.ilike(title_clean),
        RockBandDLC.artist.ilike(artist_clean)
    ).first()
    
    if exact_match:
        result = {
            "is_dlc": True,
            "origin": exact_match.origin,
            "match_type": "exact",
            "dlc_entry": {
                "id": exact_match.id,
                "title": exact_match.title,
                "artist": exact_match.artist,
                "origin": exact_match.origin
            }
        }
        _cache_dlc_check(title_clean, artist_clean, result)
        return result
    
    # Search for partial matches (case insensitive)
    partial_matches = db.query(RockBandDLC).filter(
        RockBandDLC.title.ilike(f"%{title_clean}%"),
        RockBandDLC.artist.ilike(f"%{artist_clean}%")
    ).limit(5).all()
    
    if partial_matches:
        result = {
            "is_dlc": True,
            "origin": partial_matches[0].origin,
            "match_type": "partial",
            "dlc_entry": {
                "id": partial_matches[0].id,
                "title": partial_matches[0].title,
                "artist": partial_matches[0].artist,
                "origin": partial_matches[0].origin
            },
            "similar_matches": [
                {
                    "id": match.id,
                    "title": match.title,
                    "artist": match.artist,
                    "origin": match.origin
                }
                for match in partial_matches
            ]
        }
        _cache_dlc_check(title_clean, artist_clean, result)
        return result
    
    result = {
        "is_dlc": False,
        "origin": None,
        "match_type": None,
        "dlc_entry": None
    }
    _cache_dlc_check(title_clean, artist_clean, result)
    return result

@router.get("/search")
def search_dlc(
    q: str = Query(..., description="Search query (artist or song title)"),
    limit: int = Query(10, description="Maximum number of results"),
    db: Session = Depends(get_db)
):
    """Search Rock Band DLC by artist or song title"""
    
    query_clean = q.strip()
    
    results = db.query(RockBandDLC).filter(
        (RockBandDLC.title.ilike(f"%{query_clean}%")) |
        (RockBandDLC.artist.ilike(f"%{query_clean}%"))
    ).limit(limit).all()
    
    return {
        "query": query_clean,
        "count": len(results),
        "results": [
            {
                "id": dlc.id,
                "title": dlc.title,
                "artist": dlc.artist,
                "origin": dlc.origin
            }
            for dlc in results
        ]
    }

@router.get("/stats")
def get_dlc_stats(db: Session = Depends(get_db)):
    """Get statistics about the DLC database"""
    
    total_count = db.query(RockBandDLC).count()
    
    # Count by origin
    origins = db.query(RockBandDLC.origin).distinct().all()
    origin_counts = {}
    
    for origin in origins:
        if origin[0]:  # origin is a tuple from distinct()
            count = db.query(RockBandDLC).filter(RockBandDLC.origin == origin[0]).count()
            origin_counts[origin[0]] = count
    
    return {
        "total_songs": total_count,
        "by_origin": origin_counts
    } 