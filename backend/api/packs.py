"""Backward compatibility for packs module imports."""

# Import the new router
from .packs.router import router

# Import schemas for backward compatibility
from .packs.schemas import (
    PackCreate,
    PackUpdate,
    PackStatusUpdate,
    PackReleaseData,
    PackResponse
)

# Import services for backward compatibility
from .packs.services.pack_service import PackService
from .packs.services.pack_completion_service import PackCompletionService
from .packs.services.pack_release_service import PackReleaseService

# Import the completion function for backward compatibility with dashboard
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

# Export all for backward compatibility
__all__ = [
    "router",
    "PackCreate",
    "PackUpdate", 
    "PackStatusUpdate",
    "PackReleaseData",
    "PackResponse",
    "compute_packs_near_completion"
]