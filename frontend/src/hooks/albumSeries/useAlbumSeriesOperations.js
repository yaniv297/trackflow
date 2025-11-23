import { useCallback } from "react";
import API_BASE_URL from "../../config";

/**
 * Custom hook for managing album series operations
 */
export const useAlbumSeriesOperations = (fetchAlbumSeries) => {
  const fetchAlbumArtForSeries = useCallback(
    async (seriesId) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/album-series/${seriesId}/fetch-album-art`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Failed to fetch album art");
        }

        const result = await response.json();
        if (window.showNotification) {
          window.showNotification(result.message, "success");
        }

        // Refresh the album series list to show the new cover art
        fetchAlbumSeries();
      } catch (error) {
        if (window.showNotification) {
          window.showNotification(
            `Failed to fetch album art: ${error.message}`,
            "error"
          );
        }
      }
    },
    [fetchAlbumSeries]
  );

  return {
    fetchAlbumArtForSeries,
  };
};

