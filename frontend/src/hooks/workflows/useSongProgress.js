import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, apiPut } from "../../utils/api";
import { getFieldCompletion } from "../../utils/progressUtils";
import { checkAndShowNewAchievements } from "../../utils/achievements";

/**
 * Custom hook for managing song progress state and operations
 * 
 * IMPORTANT: This hook uses bulk-loaded progress data from song.progress when available.
 * Individual API calls are only made if bulk data is missing, to avoid flooding the API.
 */
export const useSongProgress = (song, fields, onAuthoringUpdate) => {
  const [progress, setProgress] = useState(song.progress || {});
  
  // Track if we've attempted to fetch to avoid repeated calls
  const hasFetchedRef = useRef(false);
  const songIdRef = useRef(song.id);

  // Update progress when song.progress changes (from bulk load or external update)
  useEffect(() => {
    setProgress(song.progress || {});
  }, [song.progress]);

  // Reset fetch state if songId changes
  useEffect(() => {
    if (songIdRef.current !== song.id) {
      songIdRef.current = song.id;
      hasFetchedRef.current = false;
    }
  }, [song.id]);

  // Fetch song progress from new endpoint (only used as fallback)
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

  // Only fetch individual progress if bulk data is NOT available
  // This prevents flooding the API with individual calls when the WIP page
  // has already bulk-loaded all progress data
  useEffect(() => {
    // Skip if we've already fetched or if we have bulk-loaded data
    const hasBulkData = song.progress && Object.keys(song.progress).length > 0;
    if (hasFetchedRef.current || hasBulkData) {
      return;
    }
    
    hasFetchedRef.current = true;
    loadSongProgress();
  }, [song.progress, loadSongProgress]);

  const toggleAuthoringField = async (field) => {
    const currentVal = getFieldCompletion(song, field);
    const nextVal = !currentVal;

    // Optimistic local update
    setProgress((prev) => ({ ...prev, [field]: nextVal }));

    // Let parent handle the API call - it will update global state and call API
    if (onAuthoringUpdate) {
      try {
        await onAuthoringUpdate(song.id, field, nextVal);
        // Check for achievements after successful authoring field update
        await checkAndShowNewAchievements();
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

      
      // Check for achievements after marking all parts complete
      await checkAndShowNewAchievements();
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