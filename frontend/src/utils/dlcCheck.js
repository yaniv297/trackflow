import { apiGet } from "./api";

/**
 * Check if a song is already official Rock Band DLC
 * @param {string} title - Song title
 * @param {string} artist - Artist name
 * @returns {Promise<Object>} DLC status information
 */
export async function checkDLCStatus(title, artist) {
  if (!title || !artist) {
    return {
      is_dlc: false,
      origin: null,
      match_type: null,
      dlc_entry: null,
    };
  }

  try {
    const response = await apiGet(
      `/rockband-dlc/check?title=${encodeURIComponent(
        title
      )}&artist=${encodeURIComponent(artist)}`
    );
    return response;
  } catch (error) {
    console.error("Error checking DLC status:", error);
    return {
      is_dlc: false,
      origin: null,
      match_type: null,
      dlc_entry: null,
      error: error.message,
    };
  }
}

/**
 * Search Rock Band DLC by query
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Object>} Search results
 */
export async function searchDLC(query, limit = 10) {
  if (!query) {
    return {
      query: "",
      count: 0,
      results: [],
    };
  }

  try {
    const response = await apiGet(
      `/rockband-dlc/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response;
  } catch (error) {
    console.error("Error searching DLC:", error);
    return {
      query,
      count: 0,
      results: [],
      error: error.message,
    };
  }
}

/**
 * Get DLC statistics
 * @returns {Promise<Object>} DLC statistics
 */
export async function getDLCStats() {
  try {
    const response = await apiGet("/rockband-dlc/stats");
    return response;
  } catch (error) {
    console.error("Error getting DLC stats:", error);
    return {
      total_songs: 0,
      by_origin: {},
      error: error.message,
    };
  }
}
