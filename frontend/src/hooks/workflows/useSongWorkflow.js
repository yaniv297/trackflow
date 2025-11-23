import { useState, useEffect, useMemo } from "react";
import { apiGet } from "../../utils/api";

/**
 * Hook for getting workflow information for a specific song
 * Handles collaboration inheritance: songs display based on their owner's workflow
 */
export const useSongWorkflow = (song, currentUser) => {
  const [songOwnerWorkflow, setSongOwnerWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Determine if we need to load a different user's workflow
  const needsOwnerWorkflow = song && song.user_id !== currentUser?.id;
  const workflowUserId = needsOwnerWorkflow ? song.user_id : currentUser?.id;

  useEffect(() => {
    if (!song || !currentUser) {
      setLoading(false);
      return;
    }

    loadSongWorkflow();
  }, [song?.id, song?.user_id, currentUser?.id]);

  const loadSongWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);

      if (needsOwnerWorkflow) {
        // For collaboration songs, get the owner's workflow
        const ownerWorkflow = await apiGet(`/workflows/user/${song.user_id}`);
        setSongOwnerWorkflow(ownerWorkflow);
      } else {
        // For owned songs, get current user's workflow
        const myWorkflow = await apiGet("/workflows/my-workflow");
        setSongOwnerWorkflow(myWorkflow);
      }
    } catch (error) {
      console.warn("Failed to load song workflow:", error);
      setError(error);
      setSongOwnerWorkflow(null);
    } finally {
      setLoading(false);
    }
  };

  // Get workflow steps for this song (based on owner's workflow)
  const authoringFields = useMemo(() => {
    if (!songOwnerWorkflow || !songOwnerWorkflow.steps) {
      // Fallback to static fields
      return [
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
      ];
    }

    return songOwnerWorkflow.steps
      .filter((step) => step.is_enabled)
      .sort((a, b) => a.order_index - b.order_index)
      .map((step) => step.step_name);
  }, [songOwnerWorkflow]);

  // Get step display information
  const getStepDisplayInfo = useMemo(() => {
    if (!songOwnerWorkflow || !songOwnerWorkflow.steps) {
      // Fallback display info generator
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
      songOwnerWorkflow.steps.map((step) => [
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
  }, [songOwnerWorkflow]);

  // Get required steps only
  const requiredAuthoringFields = useMemo(() => {
    if (!songOwnerWorkflow || !songOwnerWorkflow.steps) {
      return authoringFields; // Assume all fallback fields are required
    }

    return songOwnerWorkflow.steps
      .filter((step) => step.is_enabled && step.is_required)
      .sort((a, b) => a.order_index - b.order_index)
      .map((step) => step.step_name);
  }, [songOwnerWorkflow, authoringFields]);

  // Check if song is complete based on owner's workflow
  const isSongComplete = useMemo(() => {
    if (!song.authoring || requiredAuthoringFields.length === 0) return false;
    return requiredAuthoringFields.every(
      (field) => song.authoring[field] === true
    );
  }, [song.authoring, requiredAuthoringFields]);

  // Get completion percentage
  const getSongCompletionPercentage = useMemo(() => {
    if (!song.authoring || authoringFields.length === 0) return 0;

    const completedFields = authoringFields.filter(
      (field) => song.authoring[field] === true
    );
    return Math.round((completedFields.length / authoringFields.length) * 100);
  }, [song.authoring, authoringFields]);

  // Group steps by category
  const getStepsByCategory = useMemo(() => {
    if (!songOwnerWorkflow || !songOwnerWorkflow.steps) {
      return { "": authoringFields }; // Return all fields in default category
    }

    const grouped = {};
    songOwnerWorkflow.steps
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
  }, [songOwnerWorkflow, authoringFields]);

  // Get workflow owner information
  const workflowOwnerInfo = useMemo(() => {
    return {
      isOwnSong: !needsOwnerWorkflow,
      ownerUserId: song?.user_id,
      workflowName: songOwnerWorkflow?.name || "Default Workflow",
      isUsingFallback: !songOwnerWorkflow && !loading,
    };
  }, [needsOwnerWorkflow, song?.user_id, songOwnerWorkflow, loading]);

  return {
    // Workflow data
    songOwnerWorkflow,
    authoringFields,
    requiredAuthoringFields,

    // Utility functions
    getStepDisplayInfo,
    isSongComplete,
    getSongCompletionPercentage,
    getStepsByCategory,

    // Workflow ownership info
    workflowOwnerInfo,

    // State
    loading,
    error,

    // Actions
    refreshWorkflow: loadSongWorkflow,
  };
};

