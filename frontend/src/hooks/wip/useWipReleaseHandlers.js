import { useCallback } from "react";

/**
 * Custom hook for release handlers (opening release modals)
 */
export const useWipReleaseHandlers = (
  songs,
  setReleaseModalData,
  setShowReleaseModal
) => {
  const releasePack = useCallback(
    (pack) => {
      // Find the pack ID for the new API
      const allPackSongs = songs.filter(
        (s) => (s.pack_name || "(no pack)") === pack
      );
      const packId = allPackSongs[0]?.pack_id;

      if (!packId) {
        if (window.showNotification) {
          window.showNotification("Pack not found", "error");
        }
        return;
      }

      // Filter out optional songs from individual download links
      const packSongs = allPackSongs.filter((s) => !s.optional);

      // Set up release modal data
      setReleaseModalData({
        type: "pack",
        itemId: packId,
        itemName: pack,
        title: `Release "${pack}"`,
        packSongs: packSongs,
      });

      // Open release modal
      setShowReleaseModal(true);
    },
    [songs, setReleaseModalData, setShowReleaseModal]
  );

  const releaseSong = useCallback(
    (songId) => {
      // Get song info
      const song = songs.find((s) => s.id === songId);
      if (!song) return;

      // Set up release modal data
      setReleaseModalData({
        type: "song",
        itemId: songId,
        itemName: song.title,
        title: `Release "${song.title}"`,
      });

      // Open release modal
      setShowReleaseModal(true);
    },
    [songs, setReleaseModalData, setShowReleaseModal]
  );

  return {
    releasePack,
    releaseSong,
  };
};

