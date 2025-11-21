"""
Achievements module - Clean architecture refactored Achievements API.

This module provides achievement functionality with a clean architecture:
- Routes: HTTP request handling
- Services: Business logic
- Repositories: Data access
- Validators: Request/response validation

The module maintains backward compatibility with the original achievements.py API.
"""

from .routes.achievements_routes import router
from .services.achievements_service import AchievementsService

# For backward compatibility, expose the service methods at module level
service = AchievementsService()

# Backward compatibility functions
def check_all_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_all_achievements_unified(db, user_id)

def check_status_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_status_achievements(db, user_id)

def check_pack_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_pack_achievements(db, user_id)

def check_collaboration_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_collaboration_achievements(db, user_id)

def check_social_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_social_achievements(db, user_id)

def check_spotify_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_spotify_achievements(db, user_id)

def check_feature_request_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_feature_request_achievements(db, user_id)

def check_wip_completion_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_wip_completion_achievements(db, user_id)

def check_diversity_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_diversity_achievements(db, user_id)

def check_quality_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_quality_achievements(db, user_id)

def check_album_series_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_album_series_achievements(db, user_id)

def check_bug_report_achievements(db, user_id):
    """Legacy function for backward compatibility."""
    return service.check_bug_report_achievements(db, user_id)

# Export the main components for external use
__all__ = [
    "router", "AchievementsService", 
    # Legacy compatibility functions
    "check_all_achievements", "check_status_achievements", "check_pack_achievements",
    "check_collaboration_achievements", "check_social_achievements", 
    "check_spotify_achievements", "check_feature_request_achievements",
    "check_wip_completion_achievements", "check_diversity_achievements",
    "check_quality_achievements", "check_album_series_achievements", 
    "check_bug_report_achievements"
]