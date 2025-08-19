from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import RockBandDLC
from typing import List, Optional

router = APIRouter(prefix="/rockband-dlc", tags=["Rock Band DLC"])

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
    
    # Search for exact matches first (case insensitive)
    exact_match = db.query(RockBandDLC).filter(
        RockBandDLC.title.ilike(title_clean),
        RockBandDLC.artist.ilike(artist_clean)
    ).first()
    
    if exact_match:
        return {
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
    
    # Search for partial matches (case insensitive)
    partial_matches = db.query(RockBandDLC).filter(
        RockBandDLC.title.ilike(f"%{title_clean}%"),
        RockBandDLC.artist.ilike(f"%{artist_clean}%")
    ).limit(5).all()
    
    if partial_matches:
        return {
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
    
    return {
        "is_dlc": False,
        "origin": None,
        "match_type": None,
        "dlc_entry": None
    }

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