import { useCallback } from "react";
import { apiPost, apiGet } from "../../utils/api";

/**
 * Custom hook for adding songs to packs in WipPage
 */
export const useWipSongAdd = (
  setSongs,
  setShowAddForm,
  setNewSongData
) => {
  const addSongToPack = useCallback(
    async (packId, songData) => {
      try {
        if (!songData.title || !songData.artist) {
          if (window.showNotification) {
            window.showNotification(
              "Please fill in song title and artist",
              "error"
            );
          }
          return;
        }

        const payload = {
          title: songData.title,
          artist: songData.artist,
          pack_id: packId, // Use pack_id instead of pack_name
          status: "In Progress",
        };

        const newSong = await apiPost("/songs/", payload);

        // Note: Spotify enhancement happens automatically on the backend
        // No need for manual enhancement call

        const allSongs = await apiGet("/songs/?status=In%20Progress");
        const found = allSongs.find((s) => s.id === newSong.id);
        if (found) {
          setSongs((prev) => [...prev, found]);
        }

        setShowAddForm(null);
        setNewSongData({});
        if (window.showNotification) {
          window.showNotification(`Added "${songData.title}" to pack`, "success");
        }
      } catch (error) {
        if (window.showNotification) {
          window.showNotification(error.message, "error");
        }
      }
    },
    [setSongs, setShowAddForm, setNewSongData]
  );

  return {
    addSongToPack,
  };
};

