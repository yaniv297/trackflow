"""
Feature Requests module - Clean architecture refactored Feature Requests API.

This module provides feature request functionality with a clean architecture:
- Routes: HTTP request handling
- Services: Business logic
- Repositories: Data access
- Validators: Request/response validation

The module maintains backward compatibility with the original feature_requests.py API.
"""

from .routes.feature_request_routes import router
from .services.feature_request_service import FeatureRequestService

# Export the main components for external use
__all__ = ["router", "FeatureRequestService"]