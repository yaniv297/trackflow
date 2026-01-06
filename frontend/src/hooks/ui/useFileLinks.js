import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing file links count and notifications
 * 
 * IMPORTANT: This hook is designed to NOT fetch on every render to avoid
 * flooding the API with requests when many WipSongCard components re-render.
 * File links are fetched:
 * 1. Once on initial mount (if song has collaborations)
 * 2. On a 30-second interval (for real-time notifications)
 * 3. NOT on every state change
 */
export const useFileLinks = (songId, songTitle, wipCollaborations, showFileHistoryModal) => {
  const [fileLinksCount, setFileLinksCount] = useState(0);
  const [lastKnownFileIds, setLastKnownFileIds] = useState(new Set());
  
  // Track if we've done the initial fetch to avoid re-fetching on re-renders
  const hasFetchedRef = useRef(false);
  // Track the songId to reset fetch state if song changes
  const songIdRef = useRef(songId);

  const loadFileLinksCount = useCallback(async () => {
    try {
      const response = await apiGet(`/file-links/${songId}`);
      const fileLinks = response || [];
      const newCount = fileLinks.length;

      // Get current file IDs
      const currentFileIds = new Set(fileLinks.map((link) => link.id));

      setFileLinksCount(newCount);
      setLastKnownFileIds((prevFileIds) => {
        // Find truly new files (files we haven't seen before)
        const newFileIds = new Set();
        currentFileIds.forEach((id) => {
          if (!prevFileIds.has(id)) {
            newFileIds.add(id);
          }
        });

        // Show notification only for genuinely new files
        if (newFileIds.size > 0 && prevFileIds.size > 0) {
          const newFilesCount = newFileIds.size;
          window.showNotification(
            `${newFilesCount} new file${
              newFilesCount > 1 ? "s" : ""
            } uploaded to "${songTitle}"!`,
            "info"
          );
        }

        return currentFileIds;
      });
    } catch (error) {
      console.error("Error loading file links count:", error);
    }
  }, [songId, songTitle]);

  // Reset fetch state if songId changes
  useEffect(() => {
    if (songIdRef.current !== songId) {
      songIdRef.current = songId;
      hasFetchedRef.current = false;
    }
  }, [songId]);

  // Load file links count ONCE on initial mount (not on every state change)
  // This prevents flooding the API when parent components re-render
  useEffect(() => {
    if (wipCollaborations.length > 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadFileLinksCount();
    }
  }, [wipCollaborations.length, loadFileLinksCount]);

  // Periodically check for new files (every 30 seconds)
  // This provides real-time notifications without constant API polling
  useEffect(() => {
    if (wipCollaborations.length > 0 && !showFileHistoryModal) {
      const interval = setInterval(() => {
        loadFileLinksCount();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [wipCollaborations.length, showFileHistoryModal, loadFileLinksCount]);

  const handleFileLinkAdded = (newLink) => {
    setFileLinksCount((prev) => prev + 1);
    setLastKnownFileIds((prev) => new Set([...prev, newLink.id]));
  };

  const handleFileLinkDeleted = (deletedLinkId) => {
    setFileLinksCount((prev) => Math.max(0, prev - 1));
    setLastKnownFileIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(deletedLinkId);
      return newSet;
    });
  };

  return {
    fileLinksCount,
    handleFileLinkAdded,
    handleFileLinkDeleted,
  };
};