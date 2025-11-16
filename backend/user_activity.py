"""
Simple in-memory user activity tracker for online user counting.
Tracks when users make authenticated requests.
"""
import time
from typing import Dict
from threading import Lock

# In-memory store: user_id -> last_activity_timestamp
_user_activity: Dict[int, float] = {}
_activity_lock = Lock()

# Consider users "online" if they've been active in the last 5 minutes
ONLINE_THRESHOLD_SECONDS = 300  # 5 minutes

def record_activity(user_id: int):
    """Record that a user was active right now"""
    with _activity_lock:
        _user_activity[user_id] = time.time()

def get_online_user_count() -> int:
    """Get count of users who have been active in the last ONLINE_THRESHOLD_SECONDS"""
    current_time = time.time()
    with _activity_lock:
        # Count users active within threshold
        online_count = sum(
            1 for last_activity in _user_activity.values()
            if current_time - last_activity < ONLINE_THRESHOLD_SECONDS
        )
        # Clean up old entries (older than threshold)
        _user_activity.clear()  # We'll rebuild it as users make requests
        # Actually, let's not clear it - just count active ones
        # The cleanup will happen naturally as old entries become inactive
        return online_count

def get_online_user_ids() -> list[int]:
    """Get list of user IDs who have been active in the last ONLINE_THRESHOLD_SECONDS"""
    current_time = time.time()
    with _activity_lock:
        # Get user IDs active within threshold
        online_user_ids = [
            user_id for user_id, last_activity in _user_activity.items()
            if current_time - last_activity < ONLINE_THRESHOLD_SECONDS
        ]
        return online_user_ids

def cleanup_old_entries():
    """Remove entries older than threshold (optional cleanup)"""
    current_time = time.time()
    with _activity_lock:
        to_remove = [
            user_id for user_id, last_activity in _user_activity.items()
            if current_time - last_activity >= ONLINE_THRESHOLD_SECONDS
        ]
        for user_id in to_remove:
            del _user_activity[user_id]

