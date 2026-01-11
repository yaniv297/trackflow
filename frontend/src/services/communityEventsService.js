import { apiGet, apiPost, apiPatch, apiDelete } from "../utils/api";

/**
 * Service for community events API endpoints
 */
class CommunityEventsService {
  // ============================================
  // Public endpoints
  // ============================================

  /**
   * Get all community events
   */
  async getEvents(includeEnded = true) {
    try {
      const response = await apiGet(
        `/api/community-events?include_ended=${includeEnded}`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching community events:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to fetch community events",
      };
    }
  }

  /**
   * Get active community events only
   */
  async getActiveEvents() {
    try {
      const response = await apiGet("/api/community-events/active");
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching active events:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to fetch active events",
      };
    }
  }

  /**
   * Get featured event for homepage (active or recently released within 7 days)
   */
  async getFeaturedEvent() {
    try {
      const response = await apiGet("/api/community-events/featured");
      return { success: true, data: response };
    } catch (error) {
      // 404 is expected when no featured event exists
      if (error.response?.status === 404) {
        return { success: true, data: null };
      }
      console.error("Error fetching featured event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to fetch featured event",
      };
    }
  }

  /**
   * Get a specific community event
   */
  async getEvent(eventId) {
    try {
      const response = await apiGet(`/api/community-events/${eventId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to fetch event",
      };
    }
  }

  /**
   * Get songs in an event
   */
  async getEventSongs(eventId) {
    try {
      const response = await apiGet(`/api/community-events/${eventId}/songs`);
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching event songs:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to fetch event songs",
      };
    }
  }

  /**
   * Get registrations for an event
   */
  async getEventRegistrations(eventId) {
    try {
      const response = await apiGet(
        `/api/community-events/${eventId}/registrations`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching event registrations:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to fetch event registrations",
      };
    }
  }

  // ============================================
  // User participation endpoints
  // ============================================

  /**
   * Register interest in an event
   */
  async registerForEvent(eventId) {
    try {
      const response = await apiPost(
        `/api/community-events/${eventId}/register`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error registering for event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to register for event",
      };
    }
  }

  /**
   * Unregister from an event
   */
  async unregisterFromEvent(eventId) {
    try {
      const response = await apiDelete(
        `/api/community-events/${eventId}/register`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error unregistering from event:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to unregister from event",
      };
    }
  }

  /**
   * Add a song to an event
   */
  async addSongToEvent(eventId, songData) {
    try {
      const response = await apiPost(
        `/api/community-events/${eventId}/add-song`,
        songData
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error adding song to event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to add song to event",
      };
    }
  }

  /**
   * Swap user's song in an event
   */
  async swapEventSong(eventId, swapData) {
    try {
      const response = await apiPost(
        `/api/community-events/${eventId}/swap-song`,
        swapData
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error swapping event song:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to swap event song",
      };
    }
  }

  /**
   * Remove user's song from an event
   */
  async removeSongFromEvent(eventId, removeData) {
    try {
      const response = await apiPost(
        `/api/community-events/${eventId}/remove-song`,
        removeData
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error removing song from event:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to remove song from event",
      };
    }
  }

  /**
   * Submit a completed song (with RhythmVerse link)
   */
  async submitSongToEvent(eventId, submissionData) {
    try {
      const response = await apiPost(
        `/api/community-events/${eventId}/submit-song`,
        submissionData
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error submitting song to event:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to submit song to event",
      };
    }
  }

  /**
   * Update an existing song submission
   */
  async updateSongSubmission(eventId, submissionData) {
    try {
      const response = await apiPatch(
        `/api/community-events/${eventId}/submission`,
        submissionData
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error updating song submission:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to update song submission",
      };
    }
  }

  // ============================================
  // Admin endpoints
  // ============================================

  /**
   * Create a new community event (admin only)
   */
  async createEvent(eventData) {
    try {
      const response = await apiPost(
        "/api/admin/community-events/",
        eventData
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error creating event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to create event",
      };
    }
  }

  /**
   * Get all events for admin management
   */
  async getAdminEvents(includeEnded = true) {
    try {
      const response = await apiGet(
        `/api/admin/community-events/?include_ended=${includeEnded}`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching admin events:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to fetch admin events",
      };
    }
  }

  /**
   * Get a specific event for admin
   */
  async getAdminEvent(eventId) {
    try {
      const response = await apiGet(`/api/admin/community-events/${eventId}`);
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching admin event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to fetch admin event",
      };
    }
  }

  /**
   * Update a community event (admin only)
   */
  async updateEvent(eventId, eventData) {
    try {
      const response = await apiPatch(
        `/api/admin/community-events/${eventId}`,
        eventData
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error updating event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to update event",
      };
    }
  }

  /**
   * Release event pack (admin only)
   * This single action: reveals links, marks songs as Released, ends event
   */
  async releaseEvent(eventId) {
    try {
      const response = await apiPost(
        `/api/admin/community-events/${eventId}/release`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error releasing event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to release event",
      };
    }
  }

  /**
   * Unrelease event (admin only, for data repair)
   * Reverts a released event back to active state
   */
  async unreleaseEvent(eventId) {
    try {
      const response = await apiPost(
        `/api/admin/community-events/${eventId}/unrelease`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error unreleasing event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to unrelease event",
      };
    }
  }

  /**
   * Delete a community event (admin only)
   */
  async deleteEvent(eventId) {
    try {
      const response = await apiDelete(
        `/api/admin/community-events/${eventId}`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error deleting event:", error);
      return {
        success: false,
        error: error.response?.data?.detail || "Failed to delete event",
      };
    }
  }

  /**
   * Get event registrations (admin only)
   */
  async getAdminEventRegistrations(eventId) {
    try {
      const response = await apiGet(
        `/api/admin/community-events/${eventId}/registrations`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching admin event registrations:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail ||
          "Failed to fetch admin event registrations",
      };
    }
  }

  /**
   * Get event songs for admin (sees all links)
   */
  async getAdminEventSongs(eventId) {
    try {
      const response = await apiGet(
        `/api/admin/community-events/${eventId}/songs`
      );
      return { success: true, data: response };
    } catch (error) {
      console.error("Error fetching admin event songs:", error);
      return {
        success: false,
        error:
          error.response?.data?.detail || "Failed to fetch admin event songs",
      };
    }
  }
}

const communityEventsService = new CommunityEventsService();
export default communityEventsService;

