import { useState, useCallback } from "react";
import { apiGet } from "../utils/api";

/**
 * Hook to fetch and cache workflow fields for different users
 * Used for displaying collaborator songs with their owner's workflow
 */
export const useUserWorkflowFields = () => {
  const [workflowFieldsCache, setWorkflowFieldsCache] = useState({});
  const [loading, setLoading] = useState({});

  const fetchUserWorkflowFields = useCallback(
    async (userId) => {
      // Return cached data if available
      if (workflowFieldsCache[userId]) {
        return workflowFieldsCache[userId];
      }

      // Return empty array if already loading
      if (loading[userId]) {
        return [];
      }

      try {
        setLoading((prev) => ({ ...prev, [userId]: true }));

        const response = await apiGet(
          `/workflows/user/${userId}/workflow-fields`
        );
        let authoringFields = response.authoringFields || [];

        // Cache the result
        setWorkflowFieldsCache((prev) => ({
          ...prev,
          [userId]: authoringFields,
        }));

        return authoringFields;
      } catch (error) {
        console.error(
          `Failed to fetch workflow fields for user ${userId}:`,
          error
        );
        return [];
      } finally {
        setLoading((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [workflowFieldsCache, loading]
  );

  const getWorkflowFields = useCallback(
    (userId) => {
      // Return undefined if not yet loaded, so callers can defer rendering
      return workflowFieldsCache[userId];
    },
    [workflowFieldsCache]
  );

  const clearCache = useCallback(() => {
    setWorkflowFieldsCache({});
    setLoading({});
  }, []);

  return {
    fetchUserWorkflowFields,
    getWorkflowFields,
    clearCache,
    isLoading: (userId) => loading[userId] || false,
  };
};
