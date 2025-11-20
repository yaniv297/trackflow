import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPut } from "../utils/api";
import { getFieldCompletion } from "../utils/progressUtils";

/**
 * Custom hook for managing song progress state and operations
 */
export const useSongProgress = (song, fields, onAuthoringUpdate) => {
  const [progress, setProgress] = useState(song.progress || {});

  // Update progress when song.progress changes
  useEffect(() => {
    setProgress(song.progress || {});
  }, [song.progress]);

  // Fetch song progress from new endpoint
  const loadSongProgress = useCallback(async () => {
    try {
      const rows = await apiGet(`/workflows/songs/${song.id}/progress`);
      const map = {};
      (rows || []).forEach((r) => {
        map[r.step_name] = !!r.is_completed;
      });
      setProgress(map);
    } catch (e) {
      console.warn(`Failed to load progress for song ${song.id}:`, e);
      // Silent fallback; progress stays empty and we rely on existing data
    }
  }, [song.id]);

  useEffect(() => {
    loadSongProgress();
  }, [loadSongProgress]);

  const toggleAuthoringField = async (field) => {
    const currentVal = getFieldCompletion(song, field);
    const nextVal = !currentVal;

    // Optimistic local update
    setProgress((prev) => ({ ...prev, [field]: nextVal }));

    // Let parent handle the API call - it will update global state and call API
    if (onAuthoringUpdate) {
      try {
        await onAuthoringUpdate(song.id, field, nextVal);
      } catch (error) {
        // Revert on failure
        setProgress((prev) => ({ ...prev, [field]: currentVal }));
        console.error(`Error updating ${field}:`, error);
      }
    }
  };

  const markAllDone = async () => {
    try {
      const partsToMark = fields;
      const updates = {};
      partsToMark.forEach((f) => {
        updates[f] = true;
      });

      // Use PUT method; backend writes song_progress
      await apiPut(`/authoring/${song.id}`, updates);

      // Update UI state
      setProgress((prev) => {
        const next = { ...prev };
        partsToMark.forEach((f) => (next[f] = true));
        return next;
      });

      if (onAuthoringUpdate) {
        partsToMark.forEach((f) => {
          onAuthoringUpdate(song.id, f, true);
        });
      }

      window.showNotification("All parts marked as complete!", "success");
    } catch (err) {
      console.error("Failed to mark all complete", err);
      window.showNotification("Failed to mark all parts complete", "error");
    }
  };

  return {
    progress,
    toggleAuthoringField,
    markAllDone,
  };
};