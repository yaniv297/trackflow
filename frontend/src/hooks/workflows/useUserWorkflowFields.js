import { useState, useCallback, useEffect } from "react";
import { apiGet } from "../../utils/api";

// GLOBAL cache shared across all component instances (outside React state)
const globalWorkflowCache = {};
const globalLoadingState = {};
const pendingRequests = {};

/**
 * Hook to fetch and cache workflow fields for different users
 * Uses a global cache to avoid duplicate API calls across components
 */
export const useUserWorkflowFields = () => {
  const [, forceUpdate] = useState(0);

  const fetchUserWorkflowFields = useCallback(async (userId) => {
    // Return cached data if available
    if (globalWorkflowCache[userId]) {
      return globalWorkflowCache[userId];
    }

    // If already fetching, wait for existing request
    if (pendingRequests[userId]) {
      return pendingRequests[userId];
    }

    // Start new fetch
    globalLoadingState[userId] = true;
    pendingRequests[userId] = (async () => {
      try {
        const response = await apiGet(
          `/workflows/user/${userId}/workflow-fields`
        );
        const authoringFields = response.authoringFields || [];

        // Cache globally
        globalWorkflowCache[userId] = authoringFields;
        return authoringFields;
      } catch (error) {
        console.error(
          `Failed to fetch workflow fields for user ${userId}:`,
          error
        );
        return [];
      } finally {
        globalLoadingState[userId] = false;
        delete pendingRequests[userId];
      }
    })();

    return pendingRequests[userId];
  }, []);

  const getWorkflowFields = useCallback((userId) => {
    return globalWorkflowCache[userId];
  }, []);

  const clearCache = useCallback(() => { 
    Object.keys(globalWorkflowCache).forEach(
      (key) => delete globalWorkflowCache[key]
    );
    Object.keys(globalLoadingState).forEach(
      (key) => delete globalLoadingState[key]
    );
    Object.keys(pendingRequests).forEach((key) => delete pendingRequests[key]);
    forceUpdate((prev) => prev + 1);
  }, []);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleInvalidate = () => clearCache();
    window.addEventListener("workflow-fields-invalidate", handleInvalidate);
    return () =>
      window.removeEventListener(
        "workflow-fields-invalidate",
        handleInvalidate
      );
  }, [clearCache]);

  return {
    fetchUserWorkflowFields,
    getWorkflowFields,
    clearCache,
    isLoading: (userId) => globalLoadingState[userId] || false,
  };
};
