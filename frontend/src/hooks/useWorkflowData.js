import { useState, useEffect, useMemo } from "react";
import { apiGet } from "../utils/api";

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
      // For now, we'll fall back to static fields
      // In the future, this should create a default workflow for the user
      setError(error);
      setUserWorkflow(null);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic authoring fields based on user's workflow
  const authoringFields = useMemo(() => {
    if (!userWorkflow || !userWorkflow.steps) {
      return fallbackAuthoringFields;
    }

    return userWorkflow.steps
      .filter((step) => step.is_enabled)
      .sort((a, b) => a.order_index - b.order_index)
      .map((step) => step.step_name);
  }, [userWorkflow, fallbackAuthoringFields]);

  // Get workflow step display information
  const getStepDisplayInfo = useMemo(() => {
    if (!userWorkflow || !userWorkflow.steps) {
      // Return fallback display info
      return (stepName) => {
        const displayName = stepName
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        return {
          displayName,
          description: null,
          category: null,
          isRequired: true,
        };
      };
    }

    const stepMap = new Map(
      userWorkflow.steps.map((step) => [
        step.step_name,
        {
          displayName: step.display_name,
          description: step.description,
          category: step.category,
          isRequired: step.is_required,
        },
      ])
    );

    return (stepName) => {
      return (
        stepMap.get(stepName) || {
          displayName: stepName,
          description: null,
          category: null,
          isRequired: true,
        }
      );
    };
  }, [userWorkflow]);

  // Get required steps only
  const requiredAuthoringFields = useMemo(() => {
    if (!userWorkflow || !userWorkflow.steps) {
      return fallbackAuthoringFields; // Assume all fallback fields are required
    }

    return userWorkflow.steps
      .filter((step) => step.is_enabled && step.is_required)
      .sort((a, b) => a.order_index - b.order_index)
      .map((step) => step.step_name);
  }, [userWorkflow, fallbackAuthoringFields]);

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

  // Group steps by category for better display
  const getStepsByCategory = useMemo(() => {
    if (!userWorkflow || !userWorkflow.steps) {
      return { "": authoringFields }; // Return all fields in default category
    }

    const grouped = {};
    userWorkflow.steps
      .filter((step) => step.is_enabled)
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((step) => {
        const category = step.category || "Other";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(step.step_name);
      });

    return grouped;
  }, [userWorkflow, authoringFields]);

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

