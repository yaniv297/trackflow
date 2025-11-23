import { useCallback } from "react";
import { apiPatch, apiPut } from "../../utils/api";
import { checkAndShowNewAchievements } from "../../utils/achievements";

/**
 * Custom hook for managing bulk operations on songs
 */
export const useBulkOperations = (
  songs,
  setSongs,
  selectedSongs,
  setSelectedSongs,
  status,
  refreshSongs
) => {
  const handleStartWork = useCallback(
    async (songIds = null) => {
      // Move songs from Future Plans to In Progress
      try {
        const songsToMove = songIds
          ? songs.filter((s) => songIds.includes(s.id))
          : songs.filter((s) => selectedSongs.includes(s.id));

        const movedIds = new Set(songsToMove.map((s) => s.id));

        // Group songs by album series for status updates
        const seriesGroups = {};
        songsToMove.forEach((song) => {
          if (song.album_series_id) {
            if (!seriesGroups[song.album_series_id]) {
              seriesGroups[song.album_series_id] = [];
            }
            seriesGroups[song.album_series_id].push(song);
          }
        });

        // Optimistic UI update
        setSongs((prev) => {
          if (status === "Future Plans") {
            // Remove moved songs from the current view
            return prev.filter((s) => !movedIds.has(s.id));
          }
          // Otherwise, mark them as In Progress
          return prev.map((s) =>
            movedIds.has(s.id) ? { ...s, status: "In Progress" } : s
          );
        });

        await Promise.all(
          songsToMove.map((song) =>
            apiPatch(`/songs/${song.id}`, { status: "In Progress" })
          )
        );

        // Check achievements after status change
        await checkAndShowNewAchievements();

        // Update album series status to "in_progress" if any songs belong to a series
        for (const [seriesId, seriesSongs] of Object.entries(seriesGroups)) {
          if (seriesSongs.length > 0) {
            try {
              await apiPut(`/album-series/${seriesId}/status`, {
                status: "in_progress",
              });
            } catch (err) {
              console.error(
                `Failed to update album series ${seriesId} status:`,
                err
              );
            }
          }
        }

        // Invalidate cache so fetchSongs pulls fresh data
        refreshSongs();
        setSelectedSongs([]);

        if (window.showNotification) {
          window.showNotification(
            `Started work on ${songsToMove.length} song${
              songsToMove.length === 1 ? "" : "s"
            }.`,
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to start work:", error);
        if (window.showNotification) {
          window.showNotification("Failed to start work", "error");
        }
        // Optionally refresh to recover from any mismatch
        refreshSongs();
      }
    },
    [songs, selectedSongs, status, setSongs, setSelectedSongs, refreshSongs]
  );

  return {
    handleStartWork,
  };
};

