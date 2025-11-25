import { apiGet } from '../utils/api';

const profileService = {
  /**
   * Get public profile data for a user by username
   * @param {string} username - Username to fetch profile for
   * @returns {Promise<Object>} User profile data
   */
  async getPublicProfile(username) {
    try {
      const response = await apiGet(`/api/profiles/${username}`);
      return response;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  /**
   * Get list of all public users
   * @param {number} limit - Number of users to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Users list with pagination info
   */
  async getPublicUsers(limit = 20, offset = 0) {
    try {
      const response = await apiGet(`/api/profiles/?limit=${limit}&offset=${offset}`);
      return response;
    } catch (error) {
      console.error('Error fetching users list:', error);
      throw error;
    }
  }
};

export default profileService;