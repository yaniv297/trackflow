# Packs API module - refactored into clean architecture layers

from .router import router
from .services.pack_completion_service import PackCompletionService

# Backward compatibility function
def compute_packs_near_completion(db, current_user, limit: int, threshold: int):
    """Backward compatibility function for dashboard."""
    completion_service = PackCompletionService(db)
    results = completion_service.get_packs_near_completion(current_user.id, limit, threshold)
    
    # Convert to the format expected by dashboard
    return [
        {
            "pack_id": result.pack_id,
            "pack_name": result.pack_name, 
            "completion_percentage": result.completion_percentage,
            "incomplete_songs": result.incomplete_songs,
            "total_songs": result.total_songs,
            "display_name": result.display_name or result.pack_name,
            "album_cover": result.album_cover
        }
        for result in results
    ]

__all__ = ["router", "compute_packs_near_completion"]