"""
Caching service for song completion data to improve dashboard performance.

This module provides a TTL-based cache for completion data to avoid redundant
database queries when the same songs are requested multiple times.
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import hashlib
import json

# Cache entry structure: (data, expiry_time)
_cache: Dict[str, Tuple[Dict[int, Dict[str, Any]], datetime]] = {}
_cache_ttl_seconds = 300  # 5 minutes default TTL


def _make_cache_key(song_ids: List[int], include_remaining_steps: bool) -> str:
    """Generate a cache key from song IDs and options."""
    # Sort song IDs for consistent keys
    sorted_ids = sorted(song_ids)
    key_data = {
        "song_ids": sorted_ids,
        "include_remaining_steps": include_remaining_steps,
    }
    key_str = json.dumps(key_data, sort_keys=True)
    return hashlib.md5(key_str.encode()).hexdigest()


def get_cached_completion_data(
    song_ids: List[int], include_remaining_steps: bool
) -> Optional[Dict[int, Dict[str, Any]]]:
    """
    Get cached completion data if available and not expired.
    
    Args:
        song_ids: List of song IDs to look up
        include_remaining_steps: Whether remaining steps were included
        
    Returns:
        Cached completion data or None if not found/expired
    """
    if not song_ids:
        return None
    
    cache_key = _make_cache_key(song_ids, include_remaining_steps)
    
    if cache_key not in _cache:
        return None
    
    data, expiry_time = _cache[cache_key]
    
    # Check if expired
    if datetime.utcnow() > expiry_time:
        del _cache[cache_key]
        return None
    
    return data


def set_cached_completion_data(
    song_ids: List[int],
    include_remaining_steps: bool,
    completion_data: Dict[int, Dict[str, Any]],
    ttl_seconds: Optional[int] = None,
):
    """
    Cache completion data with TTL.
    
    Args:
        song_ids: List of song IDs that were queried
        include_remaining_steps: Whether remaining steps were included
        completion_data: The completion data to cache
        ttl_seconds: Optional TTL override (defaults to module default)
    """
    if not song_ids or not completion_data:
        return
    
    cache_key = _make_cache_key(song_ids, include_remaining_steps)
    expiry_time = datetime.utcnow() + timedelta(
        seconds=ttl_seconds or _cache_ttl_seconds
    )
    
    _cache[cache_key] = (completion_data, expiry_time)
    
    # Clean up expired entries periodically (every 100 cache sets)
    if len(_cache) > 1000:
        _cleanup_expired()


def invalidate_song_cache(song_id: int):
    """
    Invalidate cache entries for a specific song.
    
    This should be called when song progress is updated.
    
    Args:
        song_id: The song ID to invalidate
    """
    keys_to_remove = []
    for cache_key, (data, _) in _cache.items():
        if song_id in data:
            keys_to_remove.append(cache_key)
    
    for key in keys_to_remove:
        _cache.pop(key, None)


def invalidate_all_cache():
    """Clear all cached completion data."""
    _cache.clear()


def _cleanup_expired():
    """Remove expired cache entries."""
    now = datetime.utcnow()
    expired_keys = [
        key for key, (_, expiry_time) in _cache.items() if now > expiry_time
    ]
    for key in expired_keys:
        _cache.pop(key, None)


def get_cache_stats() -> Dict[str, Any]:
    """Get cache statistics for monitoring."""
    now = datetime.utcnow()
    expired_count = sum(
        1 for _, expiry_time in _cache.values() if now > expiry_time
    )
    
    return {
        "total_entries": len(_cache),
        "expired_entries": expired_count,
        "active_entries": len(_cache) - expired_count,
        "ttl_seconds": _cache_ttl_seconds,
    }


