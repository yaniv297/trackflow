import { useState, useEffect, useCallback } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing WIP collaborations
 */
export const useWipCollaborations = (songId) => {
  const [wipCollaborations, setWipCollaborations] = useState([]);

  const loadWipCollaborations = useCallback(async () => {
    try {
      const response = await apiGet(`/authoring/${songId}/wip-collaborations`);
      setWipCollaborations(response.assignments || []);
    } catch (error) {
      console.error("Error loading WIP collaborations:", error);
    }
  }, [songId]);

  useEffect(() => {
    loadWipCollaborations();
  }, [loadWipCollaborations]);

  return {
    wipCollaborations,
    loadWipCollaborations,
  };
};