import { useCallback } from "react";
import { apiPatch, apiDelete } from "../../utils/api";

/**
 * Custom hook for managing pack-related operations
 */
export const usePackOperations = (songs, setSongs, packs, setPacks, refreshSongs) => {
  const handlePackNameUpdate = useCallback(
    async (packId, newName) => {
      try {
        await apiPatch(`/packs/${packId}`, { name: newName });
        // Clear cache and refresh
        refreshSongs();
      } catch (error) {
        console.error("Failed to update pack name:", error);
        throw error; // Re-throw so the component can handle it
      }
    },
    [refreshSongs]
  );

  const handleDeletePack = useCallback(
    async (packName, packId) => {
      if (!packId) {
        throw new Error("Pack ID is missing - cannot delete pack");
      }

      // Delete the pack (this will cascade delete songs and album series)
      await apiDelete(`/packs/${packId}`);

      // Clear cache and refresh
      refreshSongs();

      if (window.showNotification) {
        window.showNotification(
          `Pack "${packName}" deleted successfully`,
          "success"
        );
      }
    },
    [refreshSongs]
  );

  const updatePackPriority = useCallback(
    async (packName, priority) => {
      if (!packName) return;

      // Find pack ID from songs
      const packSongs = songs.filter((song) => song.pack_name === packName);
      const packId = packSongs[0]?.pack_id;

      if (!packId) {
        if (window.showNotification) {
          window.showNotification("Could not find pack ID", "error");
        }
        return;
      }

      try {
        await apiPatch(`/packs/${packId}`, { priority });

        // Update local packs state immediately (no page refresh!)
        setPacks((prevPacks) =>
          prevPacks.map((pack) =>
            pack.id === packId ? { ...pack, priority } : pack
          )
        );

        // ALSO update the pack_priority field on all songs in this pack
        // This is what the UI actually displays!
        setSongs((prevSongs) =>
          prevSongs.map((song) =>
            song.pack_id === packId
              ? { ...song, pack_priority: priority }
              : song
          )
        );

        const priorityText = priority
          ? `Priority ${priority} (${['💤 Someday', '📋 Low', '📝 Medium', '⚡ High', '🔥 Urgent'][priority - 1]})`
          : "No priority";

        if (window.showNotification) {
          window.showNotification(
            `Pack priority updated to: ${priorityText}`,
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to update pack priority:", error);
        if (window.showNotification) {
          const errorMessage = error.message || "Failed to update pack priority";
          window.showNotification(errorMessage, "error");
        }
        throw error;
      }
    },
    [songs, setSongs, packs, setPacks]
  );

  return {
    handlePackNameUpdate,
    handleDeletePack,
    updatePackPriority,
  };
};

