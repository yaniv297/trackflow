import { useState, useEffect, useCallback, useMemo } from "react";
import { apiPost, apiGet } from "../../../utils/api";
import communityEventsService from "../../../services/communityEventsService";

// Participation stages
export const STAGE = {
  NOT_REGISTERED: 0,
  REGISTERED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  SUBMITTED: 4,
};

/**
 * Custom hook for managing community event state and actions
 */
export const useCommunityEvent = (onRefreshSongs, authoringFields = []) => {
  const [event, setEvent] = useState(null);
  const [fullSong, setFullSong] = useState(null); // Full song data for WipSongCard
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fireworksTrigger, setFireworksTrigger] = useState(0);
  const [forceEditMode, setForceEditMode] = useState(false);

  // Fetch full song data when we have a song in the event
  const fetchFullSongData = useCallback(async (songId) => {
    if (!songId) {
      setFullSong(null);
      return;
    }
    try {
      // Fetch full song data from the songs API
      const songData = await apiGet(`/songs/${songId}`);
      
      // Also fetch progress data
      let progressData = {};
      try {
        const progressMap = await apiGet(`/workflows/songs/progress/bulk?song_ids=${songId}`);
        progressData = progressMap[songId] || {};
      } catch (e) {
        console.warn("Failed to fetch song progress:", e);
      }
      
      setFullSong({
        ...songData,
        progress: progressData,
      });
    } catch (err) {
      console.error("Error fetching full song data:", err);
      setFullSong(null);
    }
  }, []);

  // Fetch active event
  const fetchActiveEvent = useCallback(async () => {
    try {
      setLoading(true);
      const result = await communityEventsService.getActiveEvents();
      if (result.success && result.data.length > 0) {
        const eventData = result.data[0];
        setEvent(eventData);
        
        // If user has a song in progress, fetch full song data
        const stage = eventData?.participation?.stage ?? STAGE.NOT_REGISTERED;
        const songId = eventData?.participation?.song?.id;
        
        if (stage === STAGE.IN_PROGRESS || stage === STAGE.COMPLETED || stage === STAGE.SUBMITTED) {
          if (songId) {
            await fetchFullSongData(songId);
          }
        } else {
          setFullSong(null);
        }
      } else {
        setEvent(null);
        setFullSong(null);
      }
    } catch (err) {
      console.error("Error fetching active event:", err);
      setError("Failed to load community event");
    } finally {
      setLoading(false);
    }
  }, [fetchFullSongData]);

  useEffect(() => {
    fetchActiveEvent();
  }, [fetchActiveEvent]);

  // Use full song data if available, otherwise fall back to event's song data
  const song = fullSong || event?.participation?.song;

  // Check if all workflow steps are complete (for local stage detection)
  const isWorkflowComplete = useMemo(() => {
    if (!song?.progress || authoringFields.length === 0) return false;
    
    // Check if all authoring fields are complete
    for (const field of authoringFields) {
      if (!song.progress[field.name]) {
        return false;
      }
    }
    return true;
  }, [song?.progress, authoringFields]);

  // Derived stage - use local detection for IN_PROGRESS/COMPLETED transition
  const backendStage = event?.participation?.stage ?? STAGE.NOT_REGISTERED;
  const stage = useMemo(() => {
    // If force edit mode is on, stay in IN_PROGRESS
    if (forceEditMode && (backendStage === STAGE.IN_PROGRESS || (backendStage === STAGE.IN_PROGRESS && isWorkflowComplete))) {
      return STAGE.IN_PROGRESS;
    }
    // If backend says IN_PROGRESS but all steps are locally complete, show COMPLETED
    if (backendStage === STAGE.IN_PROGRESS && isWorkflowComplete) {
      return STAGE.COMPLETED;
    }
    return backendStage;
  }, [backendStage, isWorkflowComplete, forceEditMode]);

  // Handler to go back to editing
  const handleGoBackToEditing = useCallback(() => {
    setForceEditMode(true);
  }, []);

  // Actions
  const handleRegister = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await communityEventsService.registerForEvent(event.id);
      if (result.success) {
        await fetchActiveEvent();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to register for event");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!window.confirm("Are you sure you want to unregister from this event?")) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const result = await communityEventsService.unregisterFromEvent(event.id);
      if (result.success) {
        await fetchActiveEvent();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to unregister from event");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNewSong = async (artist, title) => {
    const songData = {
      title: title.trim(),
      artist: artist.trim(),
      album: "",
      pack_id: event.id,
      status: "In Progress",
      year: null,
    };

    await apiPost("/songs/", songData);
    window.showNotification?.(`Added "${title}" to the event`, "success");
    await fetchActiveEvent();
    if (onRefreshSongs) onRefreshSongs();
  };

  const handleSubmitSong = async (submissionForm) => {
    if (!submissionForm.rhythmverse_link) {
      setError("RhythmVerse link is required");
      return false;
    }

    setActionLoading(true);
    setError(null);
    try {
      const result = await communityEventsService.submitSongToEvent(
        event.id,
        submissionForm
      );
      if (result.success) {
        await fetchActiveEvent();
        if (onRefreshSongs) onRefreshSongs();
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError("Failed to submit song");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSubmission = async (submissionForm) => {
    if (!submissionForm.rhythmverse_link) {
      setError("RhythmVerse link is required");
      return false;
    }

    setActionLoading(true);
    setError(null);
    try {
      const result = await communityEventsService.updateSongSubmission(
        event.id,
        submissionForm
      );
      if (result.success) {
        await fetchActiveEvent();
        return true;
      } else {
        setError(result.error);
        return false;
      }
    } catch (err) {
      setError("Failed to update submission");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleModalSuccess = () => {
    fetchActiveEvent();
    if (onRefreshSongs) onRefreshSongs();
  };

  // Optimistically update song progress without full refetch
  const updateSongProgress = useCallback((field, value) => {
    // If unmarking a step, exit force edit mode (allow stage transition)
    if (!value) {
      setForceEditMode(false);
    }
    
    setFullSong((prev) => {
      if (!prev) return prev;
      
      const newProgress = {
        ...(prev.progress || {}),
        [field]: value,
      };
      
      // Check if this completes all steps (for fireworks)
      if (value && authoringFields.length > 0) {
        const allComplete = authoringFields.every(f => 
          f.name === field ? value : newProgress[f.name]
        );
        if (allComplete) {
          // Trigger fireworks!
          setFireworksTrigger(t => t + 1);
          // Exit force edit mode to show completion stage
          setForceEditMode(false);
        }
      }
      
      return {
        ...prev,
        progress: newProgress,
      };
    });
  }, [authoringFields]);

  return {
    // State
    event,
    loading,
    expanded,
    setExpanded,
    actionLoading,
    error,
    setError,
    stage,
    song,
    fireworksTrigger,
    isWorkflowComplete,
    forceEditMode,
    // Actions
    handleRegister,
    handleUnregister,
    handleAddNewSong,
    handleSubmitSong,
    handleUpdateSubmission,
    handleModalSuccess,
    handleGoBackToEditing,
    fetchActiveEvent,
    updateSongProgress,
  };
};

export default useCommunityEvent;
