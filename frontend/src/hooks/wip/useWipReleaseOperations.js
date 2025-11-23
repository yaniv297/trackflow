import { useCallback } from "react";
import { apiPost, apiPatch } from "../../utils/api";
import { checkAndShowNewAchievements } from "../../utils/achievements";

/**
 * Custom hook for managing release operations in WipPage
 */
export const useWipReleaseOperations = (
  songs,
  setSongs,
  setFireworksTrigger,
  releaseModalData
) => {
  const handlePackReleaseComplete = useCallback(
    async (packId, releaseData) => {
      try {
        // Call the new pack release endpoint with metadata
        const response = await apiPost(`/packs/${packId}/release`, releaseData);

        // Get pack name for notifications
        const packName = releaseModalData?.itemName || "Pack";

        // Get the pack songs that will be affected
        const packSongs = songs.filter((s) => s.pack_id === packId);

        // Optimistic update - remove songs from current view (they're now in Released or Future Plans)
        setSongs((prev) =>
          prev.filter(
            (song) => !packSongs.some((packSong) => packSong.id === song.id)
          )
        );

        // Show notification
        if (window.showNotification) {
          window.showNotification(
            response.message || `Pack "${packName}" released successfully!`,
            "success"
          );
        }
        setFireworksTrigger((prev) => prev + 1);

        // Check for new achievements after releasing pack
        await checkAndShowNewAchievements();
      } catch (error) {
        console.error("Failed to release pack:", error);
        if (window.showNotification) {
          window.showNotification("Failed to release pack", "error");
        }
      }
    },
    [songs, setSongs, setFireworksTrigger, releaseModalData]
  );

  const handleSongReleaseComplete = useCallback(
    async (songId, releaseData) => {
      try {
        // Update song status to Released with release metadata
        const updatePayload = {
          status: "Released",
          release_description: releaseData.description || null,
          release_download_link: releaseData.download_link || null,
          release_youtube_url: releaseData.youtube_url || null,
        };

        await apiPatch(`/songs/${songId}`, updatePayload);

        // Remove song from WIP view optimistically
        setSongs((prev) => prev.filter((song) => song.id !== songId));

        // Get song info for notification
        const song = songs.find((s) => s.id === songId);
        const songTitle = song ? `"${song.title}"` : "Song";

        if (window.showNotification) {
          window.showNotification(`${songTitle} released successfully!`, "success");
        }
        setFireworksTrigger((prev) => prev + 1);

        // Check for new achievements after releasing song
        await checkAndShowNewAchievements();
      } catch (error) {
        console.error("Failed to release song:", error);
        if (window.showNotification) {
          window.showNotification("Failed to release song", "error");
        }
      }
    },
    [songs, setSongs, setFireworksTrigger]
  );

  return {
    handlePackReleaseComplete,
    handleSongReleaseComplete,
  };
};

