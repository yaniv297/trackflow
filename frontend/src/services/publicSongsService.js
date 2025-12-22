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
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "publicSongsService.js:165",
        message: "makeAllFuturePlansPublic called",
        data: {
          endpoint: "/api/public-songs/make-all-future-plans-public",
          method: "POST",
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
      }),
    }).catch(() => {});
    // #endregion
    try {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "publicSongsService.js:167",
            message: "About to call apiPost",
            data: {
              endpoint: "/api/public-songs/make-all-future-plans-public",
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion
      const response = await apiPost(
        "/api/public-songs/make-all-future-plans-public"
      );
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "publicSongsService.js:170",
            message: "apiPost succeeded",
            data: { response },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/a47a5c1f-7076-402f-ae60-162f1322f038",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "publicSongsService.js:175",
            message: "apiPost failed",
            data: {
              error: error.message,
              status: error.status,
              detail: error.detail,
              endpoint: "/api/public-songs/make-all-future-plans-public",
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "A",
          }),
        }
      ).catch(() => {});
      // #endregion
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
