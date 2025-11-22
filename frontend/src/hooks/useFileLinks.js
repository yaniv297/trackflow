import { useState, useEffect, useCallback } from "react";
import { apiGet } from "../utils/api";

/**
 * Custom hook for managing file links count and notifications
 */
export const useFileLinks = (songId, songTitle, wipCollaborations, showFileHistoryModal) => {
  const [fileLinksCount, setFileLinksCount] = useState(0);
  const [lastKnownFileIds, setLastKnownFileIds] = useState(new Set());

  const loadFileLinksCount = useCallback(async () => {
    try {
      const response = await apiGet(`/file-links/${songId}`);
      const fileLinks = response || [];
      const newCount = fileLinks.length;

      // Get current file IDs
      const currentFileIds = new Set(fileLinks.map((link) => link.id));

      // Find truly new files (files we haven't seen before)
      const newFileIds = new Set();
      currentFileIds.forEach((id) => {
        if (!lastKnownFileIds.has(id)) {
          newFileIds.add(id);
        }
      });

      // Show notification only for genuinely new files
      if (newFileIds.size > 0 && lastKnownFileIds.size > 0) {
        const newFilesCount = newFileIds.size;
        window.showNotification(
          `${newFilesCount} new file${
            newFilesCount > 1 ? "s" : ""
          } uploaded to "${songTitle}"!`,
          "info"
        );
      }

      setFileLinksCount(newCount);
      setLastKnownFileIds(currentFileIds);
    } catch (error) {
      console.error("Error loading file links count:", error);
    }
  }, [songId, songTitle, lastKnownFileIds]);

  // Load file links count when collaborations change
  useEffect(() => {
    if (wipCollaborations.length > 0) {
      loadFileLinksCount();
    }
  }, [wipCollaborations.length, loadFileLinksCount]);

  // Periodically check for new files (every 30 seconds)
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