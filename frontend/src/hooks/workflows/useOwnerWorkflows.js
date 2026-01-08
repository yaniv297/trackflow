import { useCallback, useEffect } from "react";
import { apiGet } from "../../utils/api";

/**
 * Global cache for full owner workflows
 * Used by UnifiedCollaborationModal to show workflow steps when editing collaborations
 * 
 * This is separate from useUserWorkflowFields which only caches field names.
 * The full workflow includes step display names, order, and other metadata.
 */

// Global cache shared across all component instances
const ownerWorkflowCache = new Map();
const pendingRequests = new Map();

// Cache duration: 10 minutes
const CACHE_DURATION = 10 * 60 * 1000;

/**
 * Get a cached owner workflow if available and not expired
 */
export const getCachedOwnerWorkflow = (ownerId) => {
  const cached = ownerWorkflowCache.get(ownerId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

/**
 * Fetch an owner's workflow with caching and request deduplication
 * @param {number} ownerId - The user ID of the song owner
 * @returns {Promise<object|null>} - The workflow object or null on error
 */
export const fetchOwnerWorkflow = async (ownerId) => {
  if (!ownerId) return null;
  
  // Check cache first
  const cached = getCachedOwnerWorkflow(ownerId);
  if (cached) {
    return cached;
  }
  
  // If there's already a request in flight, wait for it
  if (pendingRequests.has(ownerId)) {
    return pendingRequests.get(ownerId);
  }
  
  // Create new request
  const requestPromise = (async () => {
    try {
      const workflow = await apiGet(`/workflows/user/${ownerId}`);
      ownerWorkflowCache.set(ownerId, {
        data: workflow,
        timestamp: Date.now(),
      });
      return workflow;
    } catch (error) {
      console.warn(`Failed to fetch workflow for owner ${ownerId}:`, error);
      return null;
    } finally {
      pendingRequests.delete(ownerId);
    }
  })();
  
  pendingRequests.set(ownerId, requestPromise);
  return requestPromise;
};

/**
 * Preload workflows for multiple owner IDs in parallel
 * Call this after songs load to warm the cache
 * @param {number[]} ownerIds - Array of unique owner user IDs
 */
export const preloadOwnerWorkflows = async (ownerIds) => {
  if (!ownerIds || ownerIds.length === 0) return;
  
  // Filter out already cached workflows
  const uncachedIds = ownerIds.filter(id => !getCachedOwnerWorkflow(id));
  
  if (uncachedIds.length === 0) {
    return; // All workflows already cached
  }
  
  // Fetch all uncached workflows in parallel
  await Promise.all(uncachedIds.map(id => fetchOwnerWorkflow(id)));
};

/**
 * Clear the cache (useful for logout or workflow updates)
 */
export const clearOwnerWorkflowCache = () => {
  ownerWorkflowCache.clear();
  pendingRequests.clear();
};

/**
 * React hook for accessing owner workflow functions
 * Provides access to fetch and cache functions within React components
 */
export const useOwnerWorkflows = () => {
  const getOwnerWorkflow = useCallback((ownerId) => {
    return getCachedOwnerWorkflow(ownerId);
  }, []);
  
  const loadOwnerWorkflow = useCallback(async (ownerId) => {
    return fetchOwnerWorkflow(ownerId);
  }, []);
  
  const preloadWorkflows = useCallback(async (ownerIds) => {
    return preloadOwnerWorkflows(ownerIds);
  }, []);
  
  // Listen for workflow update events to clear cache
  // This ensures owner workflows are refreshed when the current user updates their workflow
  // (since owner workflows might be the current user's workflow)
  useEffect(() => {
    const handleWorkflowUpdate = () => {
      clearOwnerWorkflowCache();
    };
    
    window.addEventListener("workflow-updated", handleWorkflowUpdate);
    return () => {
      window.removeEventListener("workflow-updated", handleWorkflowUpdate);
    };
  }, []);
  
  return {
    getOwnerWorkflow,
    loadOwnerWorkflow,
    preloadWorkflows,
    clearCache: clearOwnerWorkflowCache,
  };
};

