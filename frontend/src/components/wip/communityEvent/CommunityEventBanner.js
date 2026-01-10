import React, { useState, useCallback } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useWorkflowData } from "../../../hooks/workflows/useWorkflowData";
import { apiPut } from "../../../utils/api";
import { useCommunityEvent } from "./useCommunityEvent";
import EventBannerHeader from "./EventBannerHeader";
import EventBannerContent from "./EventBannerContent";
import MoveSongToEvent from "../MoveSongToEvent";
import SwapEventSong from "../SwapEventSong";
import RemoveEventSong from "../RemoveEventSong";
import Fireworks from "../../../components/ui/Fireworks";
import "../CommunityEventBanner.css";

/**
 * Community Event Banner - Shows active events on the WIP page
 * Embeds the full WIP song card for working on event songs
 */
const CommunityEventBanner = ({ onRefreshSongs }) => {
  const { user } = useAuth();
  const { authoringFields } = useWorkflowData(user);
  
  // Modal states
  const [showMoveSongModal, setShowMoveSongModal] = useState(false);
  const [showSwapSongModal, setShowSwapSongModal] = useState(false);
  const [showRemoveSongModal, setShowRemoveSongModal] = useState(false);

  // Use custom hook for event state management (pass authoringFields for completion detection)
  const {
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
    handleRegister,
    handleUnregister,
    handleAddNewSong,
    handleSubmitSong,
    handleUpdateSubmission,
    handleModalSuccess,
    handleGoBackToEditing,
    fetchActiveEvent,
    updateSongProgress,
  } = useCommunityEvent(onRefreshSongs, authoringFields);

  // Handler for authoring field updates (checkboxes)
  // Uses PUT /authoring/{songId} endpoint (same as main WIP page)
  // Updates state optimistically without full refetch
  const handleAuthoringUpdate = useCallback(async (songId, field, value) => {
    // Optimistic update - update UI immediately
    updateSongProgress(field, value);
    
    try {
      // Persist to backend
      await apiPut(`/authoring/${songId}`, { [field]: value });
    } catch (err) {
      // Revert on error
      updateSongProgress(field, !value);
      console.error("Failed to update authoring field:", err);
      setError("Failed to update progress");
    }
  }, [updateSongProgress, setError]);

  // Handler for song updates (title, artist, etc.)
  const handleSongUpdate = useCallback(async (updatedSong) => {
    // Refresh event data to reflect changes
    await fetchActiveEvent();
    if (onRefreshSongs) onRefreshSongs();
  }, [fetchActiveEvent, onRefreshSongs]);

  // Don't render if no active event
  if (loading || !event) {
    return null;
  }

  const handleToggleExpand = () => setExpanded(!expanded);

  const handleMoveExistingSong = () => setShowMoveSongModal(true);
  
  const handleSwapSong = () => setShowSwapSongModal(true);
  
  const handleRemoveSong = () => {
    // Show the remove modal directly (no confirmation popup)
    setShowRemoveSongModal(true);
  };

  const onModalSuccess = () => {
    setShowMoveSongModal(false);
    setShowSwapSongModal(false);
    setShowRemoveSongModal(false);
    handleModalSuccess();
  };

  return (
    <div className={`community-event-banner ${expanded ? "expanded" : ""}`}>
      <EventBannerHeader
        event={event}
        expanded={expanded}
        onToggle={handleToggleExpand}
      />

      {expanded && (
        <EventBannerContent
          event={event}
          stage={stage}
          song={song}
          error={error}
          actionLoading={actionLoading}
          onRegister={handleRegister}
          onUnregister={handleUnregister}
          onAddNewSong={handleAddNewSong}
          onMoveExistingSong={handleMoveExistingSong}
          onSwapSong={handleSwapSong}
          onRemoveSong={handleRemoveSong}
          onSubmitSong={handleSubmitSong}
          onUpdateSubmission={handleUpdateSubmission}
          onGoBackToEditing={handleGoBackToEditing}
          setError={setError}
          // WIP song card props
          onSongUpdate={handleSongUpdate}
          onAuthoringUpdate={handleAuthoringUpdate}
          authoringFields={authoringFields}
        />
      )}

      {/* Move Song Modal */}
      {showMoveSongModal && (
        <MoveSongToEvent
          eventId={event.id}
          onClose={() => setShowMoveSongModal(false)}
          onSuccess={onModalSuccess}
        />
      )}

      {/* Swap Song Modal */}
      {showSwapSongModal && (
        <SwapEventSong
          eventId={event.id}
          currentSong={song}
          onClose={() => setShowSwapSongModal(false)}
          onSuccess={onModalSuccess}
        />
      )}

      {/* Remove Song Modal */}
      {showRemoveSongModal && (
        <RemoveEventSong
          eventId={event.id}
          currentSong={song}
          onClose={() => setShowRemoveSongModal(false)}
          onSuccess={onModalSuccess}
        />
      )}

      {/* Fireworks celebration */}
      <Fireworks trigger={fireworksTrigger} />
    </div>
  );
};

export default CommunityEventBanner;
