import { useState, useCallback } from "react";
import { apiPatch, apiDelete, apiGet, apiPost } from "../../utils/api";
import { checkAndShowNewAchievements } from "../../utils/achievements";

/**
 * Custom hook for managing individual song operations (CRUD, Spotify enhancement)
 */
export const useSongOperations = (songs, setSongs, refreshSongs) => {
  const [spotifyOptions, setSpotifyOptions] = useState({});

  const saveEdit = useCallback(
    async (id, field, editValues, setEditing, setEditValues) => {
      const value = editValues[`${id}_${field}`];
      if (value === undefined) return;

      try {
        let updates = { [field]: value };
        const oldSong = songs.find((s) => s.id === id);

        // Special handling for pack field - backend expects "pack" field, not "pack_name"
        // The backend will handle pack creation if it doesn't exist
        if (field === "pack") {
          // Keep the field name as "pack" (confirmed by MovePackModal.js)
          updates = { pack: value };
        }
        const response = await apiPatch(`/songs/${id}`, updates);

        setSongs((prevSongs) =>
          prevSongs.map((song) =>
            song.id === id ? { ...song, ...response } : song
          )
        );

        // Check achievements if status changed
        if (field === "status" && oldSong && oldSong.status !== value) {
          await checkAndShowNewAchievements();
        }

        // Clear cache and refresh to get updated pack information
        if (field === "pack") {
          refreshSongs();
        }

        // Clean up editing state
        setEditing((prev) => {
          const newState = { ...prev };
          delete newState[`${id}_${field}`];
          return newState;
        });

        setEditValues((prev) => {
          const newState = { ...prev };
          delete newState[`${id}_${field}`];
          return newState;
        });

        return { success: true, response };
      } catch (error) {
        console.error("Failed to save edit:", error);
        if (window.showNotification) {
          window.showNotification(
            error.message || "Failed to save changes",
            "error"
          );
        }
        throw error;
      }
    },
    [songs, setSongs, refreshSongs]
  );

  const fetchSpotifyOptions = useCallback(async (song) => {
    try {
      const data = await apiGet(`/spotify/${song.id}/spotify-options/`);
      setSpotifyOptions((prev) => ({ ...prev, [song.id]: data }));
    } catch (error) {
      console.error("Failed to fetch Spotify options:", error);
    }
  }, []);

  const applySpotifyEnhancement = useCallback(
    async (songId, trackId) => {
      try {
        const updated = await apiPost(`/spotify/${songId}/enhance/`, {
          track_id: trackId,
        });

        // Only update specific fields that should change from Spotify enhancement
        // Preserve pack-related fields and other important display fields
        setSongs((prevSongs) =>
          prevSongs.map((song) =>
            song.id === songId
              ? {
                  ...song,
                  album: updated.album,
                  year: updated.year,
                  album_cover: updated.album_cover,
                  artist: updated.artist,
                  title: updated.title,
                }
              : song
          )
        );

        // Close the Spotify enhancement modal
        setSpotifyOptions((prev) => ({ ...prev, [songId]: undefined }));

        if (window.showNotification) {
          window.showNotification("Song enhanced successfully!", "success");
        }
      } catch (error) {
        console.error(
          "Failed to apply Spotify enhancement:",
          error.message || error
        );
        if (window.showNotification) {
          window.showNotification("Failed to apply Spotify enhancement", "error");
        }
      }
    },
    [setSongs]
  );

  const handleDelete = useCallback(
    async (id) => {
      try {
        await apiDelete(`/songs/${id}`);
        setSongs((prevSongs) => prevSongs.filter((song) => song.id !== id));
      } catch (error) {
        console.error("Failed to delete song:", error);
        throw error;
      }
    },
    [setSongs]
  );

  return {
    spotifyOptions,
    setSpotifyOptions,
    saveEdit,
    fetchSpotifyOptions,
    applySpotifyEnhancement,
    handleDelete,
  };
};

