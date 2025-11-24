import { apiGet, apiPost } from '../utils/api';

/**
 * Service for public songs API endpoints
 */
class PublicSongsService {
  /**
   * Browse public songs with optional filters
   */
  async browsePublicSongs({
    search = '',
    artist = '',
    user = '',
    status = '',
    limit = 50,
    offset = 0
  } = {}) {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (artist) params.append('artist', artist);
      if (user) params.append('user', user);
      if (status) params.append('status', status);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await apiGet(`/api/public-songs/browse?${params}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error browsing public songs:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to browse public songs',
      };
    }
  }

  /**
   * Get shared connections between current user and others
   */
  async getSharedConnections() {
    try {
      const response = await apiGet('/api/public-songs/shared-connections');
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching shared connections:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch shared connections',
      };
    }
  }

  /**
   * Toggle public status of a song
   */
  async toggleSongPublic(songId) {
    try {
      const response = await apiPost(`/api/public-songs/songs/${songId}/toggle-public`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error toggling song public status:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to toggle song public status',
      };
    }
  }

  /**
   * Toggle user's default public sharing setting
   */
  async toggleDefaultSharing() {
    try {
      const response = await apiPost('/api/public-songs/users/toggle-default-sharing');
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error toggling default sharing:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to toggle default sharing',
      };
    }
  }

  /**
   * Get current user's public songs
   */
  async getMyPublicSongs() {
    try {
      const response = await apiGet('/api/public-songs/my-public-songs');
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Error fetching my public songs:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch public songs',
      };
    }
  }
}

export default new PublicSongsService();