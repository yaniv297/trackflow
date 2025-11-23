import { useState } from "react";
import { apiPatch } from "../../utils/api";
import { checkAndShowNewAchievements } from "../../utils/achievements";

/**
 * Custom hook for managing song editing state and operations
 */
export const useSongEditing = (song, onSongUpdate) => {
  const [editing, setEditing] = useState({});
  const [editValues, setEditValues] = useState({
    title: song.title,
    artist: song.artist,
    album: song.album,
    year: song.year || "",
  });

  const saveEdit = async (field) => {
    const value = editValues[field];
    if (field === "year" && value && !/^\d{4}$/.test(value)) {
      window.showNotification("Please enter a valid 4-digit year.", "warning");
      return;
    }
    
    setEditing((prev) => ({ ...prev, [field]: false }));

    try {
      const updated = await apiPatch(`/songs/${song.id}`, { [field]: value });
      
      // Update the local edit values and the song object
      setEditValues((prev) => ({
        ...prev,
        [field]: updated[field] || value,
      }));
      
      // Update the song object for immediate UI reflection
      if (onSongUpdate) {
        onSongUpdate(song.id, { ...song, [field]: updated[field] || value });
      }
      
      // Check for achievements after successful update
      await checkAndShowNewAchievements();
    } catch (error) {
      console.error("Update failed:", error);
      window.showNotification("Update failed", "error");
    }
  };

  const startEdit = (field) => {
    setEditing((prev) => ({ ...prev, [field]: true }));
  };

  const updateEditValue = (field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditValues = (newValues) => {
    setEditValues((prev) => ({ ...prev, ...newValues }));
  };

  return {
    editing,
    editValues,
    saveEdit,
    startEdit,
    updateEditValue,
    updateEditValues,
  };
};