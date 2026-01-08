import { useCallback } from "react";
import { apiPut, apiPatch, apiDelete } from "../../utils/api";
import { isSongComplete } from "../../utils/progressUtils";
import { checkAndShowNewAchievements } from "../../utils/achievements";

/**
 * Custom hook for managing song operations in WipPage
 */
export const useWipSongOperations = (
  songs,
  setSongs,
  authoringFields,
  setFireworksTrigger
) => {
  const updateAuthoringField = useCallback(
    async (songId, field, value) => {
      // Update local state immediately (optimistic)
      setSongs((prev) =>
        prev.map((song) => {
          if (song.id !== songId) return song;
          const nextProgress = { ...(song.progress || {}), [field]: value };
          return { ...song, progress: nextProgress };
        })
      );

      // Persist to backend and wait for it
      try {
        await apiPut(`/authoring/${songId}`, { [field]: value });

        // Check if song is now complete for fireworks
        const updatedSong = songs.find((s) => s.id === songId);
        if (updatedSong) {
          const isComplete = isSongComplete(
            {
              ...updatedSong,
              progress: { ...(updatedSong.progress || {}), [field]: value },
            },
            authoringFields
          );
          if (isComplete) {
            setFireworksTrigger((prev) => prev + 1);
          }
        }
      } catch (error) {
        console.error("Failed to update authoring field:", error);
        // Revert optimistic update on error
        setSongs((prev) =>
          prev.map((song) => {
            if (song.id !== songId) return song;
            const revertedProgress = {
              ...(song.progress || {}),
              [field]: !value,
            };
            return { ...song, progress: revertedProgress };
          })
        );
        throw error; // Re-throw so WipSongCard can handle it
      }
    },
    [songs, setSongs, authoringFields, setFireworksTrigger]
  );

  const updateSongData = useCallback(
    (songId, updatedSongData) => {
      setSongs((prev) =>
        prev.map((song) => {
          if (song.id !== songId) {
            return song;
          }
          // Only update specific fields to avoid overwriting completion status
          const updatedSong = { ...song };

          // Safe fields that can be updated without affecting song status
          const safeFields = [
            "album_cover",
            "title",
            "artist",
            "album",
            "year",
            "notes",
            "irrelevantSteps",  // N/A steps for progress calculation
            "content_rating",   // Content maturity rating
          ];

          safeFields.forEach((field) => {
            if (updatedSongData.hasOwnProperty(field)) {
              updatedSong[field] = updatedSongData[field];
            }
          });

          return updatedSong;
        })
      );
    },
    [setSongs]
  );

  const toggleOptional = useCallback(
    async (songId, isCurrentlyOptional) => {
      const newOptionalValue = !isCurrentlyOptional;

      // Optimistic UI update
      setSongs((prev) =>
        prev.map((song) =>
          song.id === songId ? { ...song, optional: newOptionalValue } : song
        )
      );

      try {
        const response = await apiPatch(`/songs/${songId}`, {
          optional: newOptionalValue,
        });

        // Update the local song with the response data to ensure consistency
        setSongs((prev) =>
          prev.map((song) =>
            song.id === songId
              ? { ...song, ...response, optional: newOptionalValue }
              : song
          )
        );

      } catch (error) {
        console.error("Failed to update optional status:", error);
        // Revert the UI change on error
        setSongs((prev) =>
          prev.map((song) =>
            song.id === songId ? { ...song, optional: isCurrentlyOptional } : song
          )
        );
        if (window.showNotification) {
          window.showNotification("Failed to update optional status", "error");
        }
      }
    },
    [setSongs]
  );

  const createDeleteSongHandler = useCallback(
    (setAlertConfig) => {
      return (songId) => {
        setAlertConfig({
          isOpen: true,
          title: "Delete Song",
          message:
            "Are you sure you want to delete this song? This action cannot be undone.",
          type: "warning",
          onConfirm: async () => {
            try {
              await apiDelete(`/songs/${songId}`);
              setSongs((prev) => prev.filter((song) => song.id !== songId));
              if (window.showNotification) {
                window.showNotification("Song deleted successfully", "success");
              }
            } catch (error) {
              console.error("Failed to delete song:", error);
              if (window.showNotification) {
                window.showNotification("Failed to delete song", "error");
              }
            }
            setAlertConfig((prev) => ({ ...prev, isOpen: false }));
          },
        });
      };
    },
    [setSongs]
  );

  return {
    updateAuthoringField,
    updateSongData,
    toggleOptional,
    createDeleteSongHandler,
  };
};

