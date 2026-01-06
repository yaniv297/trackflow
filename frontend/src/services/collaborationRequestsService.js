import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

/**
 * Service for collaboration requests API endpoints
 */
class CollaborationRequestsService {
  /**
   * Create a new collaboration request (single song)
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
   * Create a batch collaboration request (multiple songs, same owner)
   */
  async createBatchRequest({ songIds, message }) {
    try {
      const response = await apiPost('/api/collaboration-requests/batch', {
        song_ids: songIds,
        message,
      });
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error creating batch collaboration request:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create batch collaboration request',
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
   * @param {number} requestId - The request ID
   * @param {object} options - Response options
   * @param {string} options.response - 'accepted' or 'rejected'
   * @param {string} options.message - Response message
   * @param {Array} options.assignedParts - Parts to assign (for WIP songs)
   * @param {boolean} options.grantFullPackPermissions - Grant pack-level permissions
   */
  async respondToRequest(requestId, { response, message, assignedParts = null, grantFullPackPermissions = false }) {
    try {
      const result = await apiPut(`/api/collaboration-requests/${requestId}/respond`, {
        response,
        message,
        assigned_parts: assignedParts,
        grant_full_pack_permissions: grantFullPackPermissions,
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

  // =============================================================================
  // BATCH COLLABORATION REQUESTS
  // =============================================================================

  /**
   * Get batch collaboration requests received by current user
   */
  async getReceivedBatches(status = null) {
    try {
      const params = status ? new URLSearchParams({ status }) : '';
      const response = await apiGet(`/api/collaboration-requests/batches/received?${params}`);
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching received batches:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch received batches',
      };
    }
  }

  /**
   * Get batch collaboration requests sent by current user
   */
  async getSentBatches(status = null) {
    try {
      const params = status ? new URLSearchParams({ status }) : '';
      const response = await apiGet(`/api/collaboration-requests/batches/sent?${params}`);
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching sent batches:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch sent batches',
      };
    }
  }

  /**
   * Respond to a batch collaboration request
   * @param {number} batchId - The batch ID to respond to
   * @param {object} options - Response options
   * @param {string} options.action - 'approve_all', 'reject_all', or 'selective'
   * @param {string} options.responseMessage - Message to send with response
   * @param {object} options.decisions - Per-song decisions when action is 'selective' (request_id -> 'approved'|'rejected')
   * @param {boolean} options.grantFullPackPermissions - Whether to grant pack-level permissions
   */
  async respondToBatch(batchId, { action, responseMessage = '', decisions = null, grantFullPackPermissions = false }) {
    try {
      const response = await apiPut(`/api/collaboration-requests/batches/${batchId}/respond`, {
        action,
        response_message: responseMessage,
        decisions,
        grant_full_pack_permissions: grantFullPackPermissions,
      });
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error responding to batch:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to respond to batch',
      };
    }
  }

  /**
   * Cancel a batch collaboration request
   */
  async cancelBatch(batchId) {
    try {
      const response = await apiDelete(`/api/collaboration-requests/batches/${batchId}`);
      
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error cancelling batch:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to cancel batch',
      };
    }
  }
}

export default new CollaborationRequestsService();