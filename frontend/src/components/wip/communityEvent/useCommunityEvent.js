import { useState, useEffect, useCallback, useMemo } from "react";
import { apiPost, apiGet } from "../../../utils/api";
import communityEventsService from "../../../services/communityEventsService";
import { isSongComplete } from "../../../utils/progressUtils";

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

  // State to track if user explicitly clicked "Continue to Submit"
  const [userClickedContinue, setUserClickedContinue] = useState(false);

  // Fetch full song data when we have a song in the event
  const fetchFullSongData = useCallback(async (songId) => {
    if (!songId) {
      setFullSong(null);
      setUserClickedContinue(false); // Reset when song changes
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
  // Use the same utility as WipSongCard for consistency
  const isWorkflowComplete = useMemo(() => {
    if (!song || authoringFields.length === 0) return false;
    return isSongComplete(song, authoringFields);
  }, [song, authoringFields]);

  // Derived stage - NEVER auto-transition to COMPLETED
  // User must explicitly click "Continue to Submit"
  const backendStage = event?.participation?.stage ?? STAGE.NOT_REGISTERED;
  const stage = useMemo(() => {
    // For NOT_REGISTERED or REGISTERED, follow backend
    if (backendStage < STAGE.IN_PROGRESS) {
      return backendStage;
    }
    
    // If user is in force edit mode (went back from any stage), show IN_PROGRESS
    if (forceEditMode) {
      return STAGE.IN_PROGRESS;
    }
    
    // If already SUBMITTED (has RhythmVerse link), show SUBMITTED
    if (backendStage === STAGE.SUBMITTED) {
      return STAGE.SUBMITTED;
    }
    
    // For IN_PROGRESS or COMPLETED from backend:
    // - If user clicked continue AND workflow is complete, show COMPLETED
    // - Otherwise stay in IN_PROGRESS (show the "Continue to Submit" button when complete)
    if (userClickedContinue && isWorkflowComplete) {
      return STAGE.COMPLETED;
    }
    
    // Default to IN_PROGRESS - user sees the button when all parts are done
    return STAGE.IN_PROGRESS;
  }, [backendStage, isWorkflowComplete, forceEditMode, userClickedContinue]);

  // Handler to go back to editing
  const handleGoBackToEditing = useCallback(() => {
    setForceEditMode(true);
    setUserClickedContinue(false); // Reset so they see the button again
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

  // Continue to submit - transitions to COMPLETED stage
  const handleContinueToSubmit = useCallback(() => {
    setForceEditMode(false);
    setUserClickedContinue(true);
  }, []);

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
    handleContinueToSubmit,
    fetchActiveEvent,
    updateSongProgress,
  };
};

export default useCommunityEvent;
