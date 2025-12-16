"""
Simple in-memory cache for expensive database operations.
"""

import time
from typing import Any, Optional, Dict, Callable
from functools import wraps
import hashlib
import json


class SimpleCache:
    """Thread-safe in-memory cache with TTL support."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = 300  # 5 minutes default
    
    def _is_expired(self, entry: Dict[str, Any]) -> bool:
        """Check if cache entry is expired."""
        return time.time() > entry['expires_at']
    
    def _cleanup_expired(self):
        """Remove expired entries (basic cleanup)."""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items() 
            if current_time > entry['expires_at']
        ]
        for key in expired_keys:
            del self._cache[key]
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        if key not in self._cache:
            return None
        
        entry = self._cache[key]
        if self._is_expired(entry):
            del self._cache[key]
            return None
        
        entry['last_accessed'] = time.time()
        return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL."""
        if ttl is None:
            ttl = self._default_ttl
        
        current_time = time.time()
        self._cache[key] = {
            'value': value,
            'expires_at': current_time + ttl,
            'created_at': current_time,
            'last_accessed': current_time
        }
        
        # Cleanup expired entries occasionally
        if len(self._cache) % 100 == 0:  # Every 100 inserts
            self._cleanup_expired()
    
    def delete(self, key: str) -> None:
        """Remove key from cache."""
        self._cache.pop(key, None)
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        current_time = time.time()
        valid_entries = sum(1 for entry in self._cache.values() if not self._is_expired(entry))
        
        return {
            'total_entries': len(self._cache),
            'valid_entries': valid_entries,
            'expired_entries': len(self._cache) - valid_entries
        }


# Global cache instance
cache = SimpleCache()


def cached(ttl: int = 300, key_func: Optional[Callable] = None):
    """
    Decorator for caching function results.
    
    Args:
        ttl: Time to live in seconds
        key_func: Optional function to generate cache key from args
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [func.__name__]
                if args:
                    key_parts.extend(str(arg) for arg in args)
                if kwargs:
                    key_parts.append(json.dumps(sorted(kwargs.items()), default=str))
                cache_key = hashlib.md5('|'.join(key_parts).encode()).hexdigest()
            
            # Check cache first
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        # Add cache control methods
        wrapper.cache_clear = lambda: cache.clear()
        wrapper.cache_stats = lambda: cache.stats()
        
        return wrapper
    return decorator


def cache_key_for_user_data(user_id: int, operation: str) -> str:
    """Generate cache key for user-specific data."""
    return f"user:{user_id}:{operation}"


def cache_key_for_leaderboard(limit: int = 50) -> str:
    """Generate cache key for leaderboard data."""
    return f"leaderboard:limit:{limit}"


def cache_key_for_public_songs(search: str = "", status: str = "", limit: int = 50, offset: int = 0) -> str:
    """Generate cache key for public songs queries."""
    key_parts = [
        f"search:{search}",
        f"status:{status}", 
        f"limit:{limit}",
        f"offset:{offset}"
    ]
    return f"public_songs:{hashlib.md5('|'.join(key_parts).encode()).hexdigest()}"


def invalidate_user_caches(user_id: int) -> None:
    """Invalidate all cached data for a specific user."""
    patterns_to_clear = [
        cache_key_for_user_data(user_id, "achievements_progress"),
        f"shared_connections:{user_id}",
        f"user:{user_id}:*"  # Pattern for any user-specific cache
    ]
    
    for pattern in patterns_to_clear:
        if '*' in pattern:
            # Clear all keys matching pattern
            prefix = pattern.replace('*', '')
            keys_to_delete = [key for key in cache._cache.keys() if key.startswith(prefix)]
            for key in keys_to_delete:
                cache.delete(key)
        else:
            cache.delete(pattern)


def invalidate_leaderboard_cache() -> None:
    """Invalidate leaderboard cache when user points change."""
    # Clear all leaderboard entries
    keys_to_delete = [key for key in cache._cache.keys() if key.startswith('leaderboard:')]
    for key in keys_to_delete:
        cache.delete(key)


def invalidate_achievement_caches() -> None:
    """Invalidate achievement-related caches globally."""
    patterns = ['achievements_progress', 'leaderboard:']
    for pattern in patterns:
        keys_to_delete = [key for key in cache._cache.keys() if pattern in key]
        for key in keys_to_delete:
            cache.delete(key)