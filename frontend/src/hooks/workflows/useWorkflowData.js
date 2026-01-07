import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { apiGet } from "../../utils/api";

// Module-level cache to prevent redundant API calls across component instances
const workflowCache = {
  data: null,
  userId: null,
  timestamp: 0,
  loading: false,
  promise: null,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Custom hook for managing dynamic workflow data
 * Replaces the static authoringFields with user-customizable workflows
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Uses user.id instead of user object to prevent re-fetching on object reference changes
 * 2. Module-level cache prevents redundant API calls across component instances
 * 3. Request deduplication prevents concurrent duplicate requests
 */
export const useWorkflowData = (user) => {
  const [userWorkflow, setUserWorkflow] = useState(() => {
    // Initialize from cache if available for this user
    if (workflowCache.data && workflowCache.userId === user?.id) {
      return workflowCache.data;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    // If we have cached data, don't show loading
    if (workflowCache.data && workflowCache.userId === user?.id) {
      return false;
    }
    return true;
  });
  const [error, setError] = useState(null);
  
  // Track the user ID to detect changes
  const userIdRef = useRef(user?.id);

  // Fallback to static fields if dynamic workflow is not available yet
  const fallbackAuthoringFields = useMemo(
    () => [
      "demucs",
      "midi",
      "tempo_map",
      "fake_ending",
      "drums",
      "bass",
      "guitar",
      "vocals",
      "harmonies",
      "pro_keys",
      "keys",
      "animations",
      "drum_fills",
      "overdrive",
      "compile",
    ],
    []
  );

  // Memoized loader function with caching
  const loadUserWorkflow = useCallback(async (forceRefresh = false) => {
    const userId = user?.id;
    if (!userId) return;
    
    const now = Date.now();
    
    // Check if cache is valid and not forcing refresh
    if (
      !forceRefresh &&
      workflowCache.data &&
      workflowCache.userId === userId &&
      now - workflowCache.timestamp < CACHE_DURATION
    ) {
      // Use cached data
      setUserWorkflow(workflowCache.data);
      setLoading(false);
      return;
    }
    
    // If there's already a request in flight for this user, wait for it
    if (workflowCache.loading && workflowCache.userId === userId && workflowCache.promise) {
      try {
        const workflow = await workflowCache.promise;
        setUserWorkflow(workflow);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
      return;
    }
    
    // Start new request
    setLoading(true);
    setError(null);
    workflowCache.loading = true;
    workflowCache.userId = userId;
    
    // Create and store the promise for deduplication
    workflowCache.promise = apiGet("/workflows/my-workflow")
      .then((workflow) => {
        workflowCache.data = workflow;
        workflowCache.timestamp = Date.now();
        workflowCache.loading = false;
        return workflow;
      })
      .catch((err) => {
        workflowCache.loading = false;
        throw err;
      });
    
    try {
      const workflow = await workflowCache.promise;
      setUserWorkflow(workflow);
    } catch (err) {
      console.warn(
        "Failed to load user workflow, falling back to static fields:",
        err
      );
      setError(err);
      setUserWorkflow(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Use user.id as dependency instead of user object to prevent re-fetching
  // when user object reference changes but ID stays the same
  useEffect(() => {
    const userId = user?.id;
    
    if (userId) {
      // Only fetch if user ID changed or we don't have cached data
      if (userIdRef.current !== userId || !workflowCache.data) {
        userIdRef.current = userId;
        loadUserWorkflow();
      } else if (workflowCache.data && workflowCache.userId === userId) {
        // Use cached data immediately
        setUserWorkflow(workflowCache.data);
        setLoading(false);
      }
    }
  }, [user?.id, loadUserWorkflow]);

  // Listen for workflow update events to clear cache
  useEffect(() => {
    const handleWorkflowUpdate = () => {
      // Clear the cache and force reload
      workflowCache.data = null;
      workflowCache.timestamp = 0;
      if (user?.id) {
        loadUserWorkflow(true);
      }
    };
    
    window.addEventListener("workflow-updated", handleWorkflowUpdate);
    return () => {
      window.removeEventListener("workflow-updated", handleWorkflowUpdate);
    };
  }, [user?.id, loadUserWorkflow]);

  // Dynamic authoring fields based on user's workflow (simplified)
  const authoringFields = useMemo(() => {
    if (!userWorkflow || !userWorkflow.steps) {
      return fallbackAuthoringFields;
    }

    return userWorkflow.steps
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((step) => step.step_name);
  }, [userWorkflow, fallbackAuthoringFields]);

  // Get workflow step display information (simplified)
  const getStepDisplayInfo = useMemo(() => {
    if (!userWorkflow || !userWorkflow.steps) {
      return (stepName) => {
        const displayName = stepName
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        return { displayName };
      };
    }

    const stepMap = new Map(
      userWorkflow.steps.map((step) => [
        step.step_name,
        { displayName: step.display_name },
      ])
    );

    return (stepName) => {
      return stepMap.get(stepName) || { displayName: stepName };
    };
  }, [userWorkflow]);

  // All steps are required in simplified model
  const requiredAuthoringFields = useMemo(() => {
    return authoringFields;
  }, [authoringFields]);

  // Check if a song is complete based on the user's workflow
  const isSongComplete = useMemo(() => {
    return (song) => {
      if (!song.authoring) return false;

      return requiredAuthoringFields.every(
        (field) => song.authoring[field] === true
      );
    };
  }, [requiredAuthoringFields]);

  // Get completion percentage for a song
  const getSongCompletionPercentage = useMemo(() => {
    return (song) => {
      if (!song.authoring || authoringFields.length === 0) return 0;

      const completedFields = authoringFields.filter(
        (field) => song.authoring[field] === true
      );
      return Math.round(
        (completedFields.length / authoringFields.length) * 100
      );
    };
  }, [authoringFields]);

  // No categories in simplified model
  const getStepsByCategory = useMemo(() => {
    return { "": authoringFields };
  }, [authoringFields]);

  // Refresh workflow data (force refresh bypasses cache)
  const refreshWorkflow = useCallback(async () => {
    await loadUserWorkflow(true);
  }, [loadUserWorkflow]);

  // Check if workflow is using fallback (static) mode
  const isUsingFallback = !userWorkflow && !loading;

  return {
    // Workflow data
    userWorkflow,
    authoringFields,
    requiredAuthoringFields,

    // Utility functions
    getStepDisplayInfo,
    isSongComplete,
    getSongCompletionPercentage,
    getStepsByCategory,
    refreshWorkflow,

    // State
    loading,
    error,
    isUsingFallback,
  };
};
