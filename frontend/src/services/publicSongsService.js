import { apiGet, apiPost } from "../utils/api";

/**
 * Service for public songs API endpoints
 */
class PublicSongsService {
  /**
   * Browse public songs with optional filters
   */
  async browsePublicSongs({
    search = "",
    status = "",
    sort_by = "updated_at",
    sort_direction = "desc",
    group_by = null,
    limit = 50,
    offset = 0,
  } = {}) {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);
      if (sort_by) params.append("sort_by", sort_by);
      if (sort_direction) params.append("sort_direction", sort_direction);
      if (group_by) params.append("group_by", group_by);
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());

      const response = await apiGet(`/api/public-songs/browse?${params}`);
      return {
        success: true,
        data: response.songs || response, // Handle both old and new response formats
        pagination: response.songs
          ? {
              total_count: response.total_count,
              page: response.page,
              per_page: response.per_page,
              total_pages: response.total_pages,
            }
          : null,
      };
    } catch (error) {
      console.error("Error browsing public songs:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to browse public songs",
      };
    }
  }

  /**
   * Get shared connections between current user and others
   */
  async getSharedConnections() {
    try {
      const response = await apiGet("/api/public-songs/shared-connections");
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error fetching shared connections:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to fetch shared connections",
      };
    }
  }

  /**
   * Get detailed artist connection data for a specific artist and user
   */
  async getArtistConnectionDetails(artist, username) {
    try {
      const params = new URLSearchParams();
      params.append("artist", artist);
      params.append("username", username);
      
      const response = await apiGet(`/api/public-songs/artist-connection-details?${params}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error fetching artist connection details:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to fetch artist connection details",
      };
    }
  }

  /**
   * Toggle public status of a song
   */
  async toggleSongPublic(songId) {
    try {
      const response = await apiPost(
        `/api/public-songs/songs/${songId}/toggle-public`
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error toggling song public status:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to toggle song public status",
      };
    }
  }

  /**
   * Toggle user's default public sharing setting
   */
  async toggleDefaultSharing() {
    try {
      const response = await apiPost(
        "/api/public-songs/users/toggle-default-sharing"
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error toggling default sharing:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to toggle default sharing",
      };
    }
  }

  /**
   * Get current user's public songs
   */
  async getMyPublicSongs() {
    try {
      const response = await apiGet("/api/public-songs/my-public-songs");
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error fetching my public songs:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to fetch public songs",
      };
    }
  }

  /**
   * Bulk toggle public status of multiple songs
   */
  async bulkToggleSongsPublic(songIds, makePublic) {
    try {
      const response = await apiPost(
        "/api/public-songs/songs/bulk-toggle-public",
        {
          song_ids: songIds,
          make_public: makePublic,
        }
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error bulk toggling songs public status:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail ||
          "Failed to bulk toggle songs public status",
      };
    }
  }

  /**
   * Efficiently make all Future Plans songs public for the current user
   * Uses a single SQL UPDATE query instead of looping through songs
   */
  async makeAllFuturePlansPublic() {
    try {
      const response = await apiPost(
        "/api/public-songs/make-all-future-plans-public"
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error making all Future Plans songs public:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail ||
          "Failed to make all Future Plans songs public",
      };
    }
  }

  /**
   * Efficiently make all Future Plans songs private for the current user
   * Uses a single SQL UPDATE query instead of looping through songs
   */
  async makeAllFuturePlansPrivate() {
    try {
      const response = await apiPost(
        "/api/public-songs/make-all-future-plans-private"
      );
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error("Error making all Future Plans songs private:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail ||
          "Failed to make all Future Plans songs private",
      };
    }
  }
}

export default new PublicSongsService();
