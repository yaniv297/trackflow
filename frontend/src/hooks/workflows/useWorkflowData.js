import { useState, useEffect, useMemo } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing dynamic workflow data
 * Replaces the static authoringFields with user-customizable workflows
 */
export const useWorkflowData = (user) => {
  const [userWorkflow, setUserWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (user) {
      loadUserWorkflow();
    }
  }, [user]);

  const loadUserWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load user's custom workflow
      const workflow = await apiGet("/workflows/my-workflow");
      setUserWorkflow(workflow);
    } catch (error) {
      console.warn(
        "Failed to load user workflow, falling back to static fields:",
        error
      );
      setError(error);
      setUserWorkflow(null);
    } finally {
      setLoading(false);
    }
  };

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

  // Refresh workflow data
  const refreshWorkflow = async () => {
    await loadUserWorkflow();
  };

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
