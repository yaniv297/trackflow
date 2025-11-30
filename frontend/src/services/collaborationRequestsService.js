import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

/**
 * Service for collaboration requests API endpoints
 */
class CollaborationRequestsService {
  /**
   * Create a new collaboration request
   */
  async createRequest({ songId, message, requestedParts = null }) {
    try {
      const response = await apiPost('/api/collaboration-requests/', {
        song_id: songId,
        message,
        requested_parts: requestedParts,
      });
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error creating collaboration request:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create collaboration request',
      };
    }
  }

  /**
   * Get collaboration requests received by current user
   */
  async getReceivedRequests(status = null) {
    try {
      const params = status ? new URLSearchParams({ status }) : '';
      const response = await apiGet(`/api/collaboration-requests/received?${params}`);
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching received requests:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch received requests',
      };
    }
  }

  /**
   * Get collaboration requests sent by current user
   */
  async getSentRequests(status = null) {
    try {
      const params = status ? new URLSearchParams({ status }) : '';
      const response = await apiGet(`/api/collaboration-requests/sent?${params}`);
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch sent requests',
      };
    }
  }

  /**
   * Respond to a collaboration request
   */
  async respondToRequest(requestId, { response, message, assignedParts = null }) {
    try {
      const result = await apiPut(`/api/collaboration-requests/${requestId}/respond`, {
        response,
        message,
        assigned_parts: assignedParts,
      });
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error responding to collaboration request:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to respond to request',
      };
    }
  }

  /**
   * Cancel/delete a collaboration request
   */
  async cancelRequest(requestId) {
    try {
      const response = await apiDelete(`/api/collaboration-requests/${requestId}`);
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error cancelling collaboration request:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to cancel request',
      };
    }
  }

  /**
   * Reopen a rejected collaboration request (only by song owner)
   */
  async reopenRequest(requestId) {
    try {
      const response = await apiPut(`/api/collaboration-requests/${requestId}/reopen`, {});
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error reopening collaboration request:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to reopen request',
      };
    }
  }

  /**
   * Get available authoring parts for a WIP song
   */
  async getAvailableParts(songId) {
    try {
      const response = await apiGet(`/api/collaboration-requests/song/${songId}/available-parts`);
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching available parts:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch available parts',
      };
    }
  }
}

export default new CollaborationRequestsService();