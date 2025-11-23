import { useCallback } from "react";
import { apiPatch, apiDelete } from "../../utils/api";

/**
 * Custom hook for managing pack operations in WipPage
 */
export const useWipPackOperations = (
  songs,
  setSongs,
  updatePackPriorityLocal,
  setAlertConfig,
  refreshSongs
) => {
  const updatePackPriority = useCallback(
    async (packName, priority) => {
      if (!packName) return;

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

        // Update local pack data immediately without loading state
        // The grouped data will automatically re-sort based on updated pack priority
        updatePackPriorityLocal(packId, priority);

        const priorityText = priority
          ? `Priority ${priority} (${
              ["💤 Someday", "📋 Low", "📝 Medium", "⚡ High", "🔥 Urgent"][
                priority - 1
              ]
            })`
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
    [songs, updatePackPriorityLocal]
  );

  const handleDeletePack = useCallback(
    async (packName, packId) => {
      setAlertConfig({
        isOpen: true,
        title: "Delete Pack",
        message: `Are you sure you want to delete "${packName}"? This will permanently delete the pack and all songs in it.`,
        onConfirm: async () => {
          try {
            // Delete the pack using the proper backend endpoint (this will cascade delete songs and album series)
            await apiDelete(`/packs/${packId}`);

            // Remove songs from current view (optimistic update)
            setSongs((prev) =>
              prev.filter((song) => (song.pack_name || "(no pack)") !== packName)
            );

            if (window.showNotification) {
              window.showNotification(
                `Pack "${packName}" deleted successfully`,
                "success"
              );
            }
          } catch (error) {
            console.error("Failed to delete pack:", error);
            if (window.showNotification) {
              const errorMessage = error.message || "Failed to delete pack";
              window.showNotification(errorMessage, "error");
            }
          }
          setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        },
        type: "danger",
      });
    },
    [setSongs, setAlertConfig]
  );

  const handleRenamePack = useCallback(
    async (oldPackName, newPackName) => {
      try {
        // Find the pack ID by looking at songs in the pack
        const packSongs = songs.filter(
          (s) => (s.pack_name || "(no pack)") === oldPackName
        );
        if (packSongs.length === 0) {
          if (window.showNotification) {
            window.showNotification("No songs found in pack", "error");
          }
          return;
        }

        const packId = packSongs[0].pack_id;
        if (!packId) {
          if (window.showNotification) {
            window.showNotification("Pack ID not found", "error");
          }
          return;
        }

        await apiPatch(`/packs/${packId}`, { name: newPackName });

        // Optimistic update - update pack_name for all songs in the pack
        setSongs((prev) =>
          prev.map((song) =>
            (song.pack_name || "(no pack)") === oldPackName
              ? { ...song, pack_name: newPackName }
              : song
          )
        );

        if (window.showNotification) {
          window.showNotification(`Pack renamed to "${newPackName}"`, "success");
        }
      } catch (error) {
        console.error("Failed to rename pack:", error);
        if (window.showNotification) {
          const errorMessage = error.message || "Failed to rename pack";
          window.showNotification(errorMessage, "error");
        }
        // Revert optimistic update on error
        refreshSongs();
      }
    },
    [songs, setSongs]
  );

  const handleMovePackToFuturePlans = useCallback(
    async (packName) => {
      try {
        // Find the pack ID by looking at songs in the pack
        const packSongs = songs.filter(
          (s) => (s.pack_name || "(no pack)") === packName
        );
        if (packSongs.length === 0) {
          if (window.showNotification) {
            window.showNotification("No songs found in pack", "error");
          }
          return;
        }

        const packId = packSongs[0].pack_id;
        if (!packId) {
          if (window.showNotification) {
            window.showNotification("Pack ID not found", "error");
          }
          return;
        }

        // Optimistic update BEFORE server call for instant feedback
        setSongs((prev) =>
          prev.map((song) =>
            (song.pack_name || "(no pack)") === packName
              ? { ...song, status: "Future Plans" }
              : song
          )
        );

        await apiPatch(`/packs/${packId}/status`, { status: "Future Plans" });

        // Refresh WIP data to ensure consistency
        refreshSongs();

        if (window.showNotification) {
          window.showNotification(
            `Pack "${packName}" moved back to Future Plans`,
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to move pack to Future Plans:", error);
        if (window.showNotification) {
          const errorMessage = error.message || "Failed to move pack to Future Plans";
          window.showNotification(errorMessage, "error");
        }
        // Revert optimistic update on error
        refreshSongs();
      }
    },
    [songs, setSongs]
  );

  return {
    updatePackPriority,
    handleDeletePack,
    handleRenamePack,
    handleMovePackToFuturePlans,
  };
};

