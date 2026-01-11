import React from "react";
import {
  StageNotRegistered,
  StageRegistered,
  StageInProgress,
  StageCompleted,
  StageSubmitted,
} from "./stages";
import { STAGE } from "./useCommunityEvent";
import OtherSubmissions from "./OtherSubmissions";

const EventBannerContent = ({
  event,
  stage,
  song,
  error,
  actionLoading,
  onRegister,
  onUnregister,
  onAddNewSong,
  onMoveExistingSong,
  onSwapSong,
  onRemoveSong,
  onSubmitSong,
  onUpdateSubmission,
  onGoBackToEditing,
  onContinueToSubmit,
  isWorkflowComplete,
  setError,
  // WIP song card props
  onSongUpdate,
  onAuthoringUpdate,
  authoringFields,
}) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderStageContent = () => {
    switch (stage) {
      case STAGE.NOT_REGISTERED:
        return (
          <StageNotRegistered
            onRegister={onRegister}
            loading={actionLoading}
          />
        );

      case STAGE.REGISTERED:
        return (
          <StageRegistered
            onAddNewSong={onAddNewSong}
            onMoveExistingSong={onMoveExistingSong}
            onUnregister={onUnregister}
            loading={actionLoading}
            setError={setError}
          />
        );

      case STAGE.IN_PROGRESS:
        return (
          <StageInProgress
            song={song}
            onSwapSong={onSwapSong}
            onRemoveSong={onRemoveSong}
            onSongUpdate={onSongUpdate}
            onAuthoringUpdate={onAuthoringUpdate}
            authoringFields={authoringFields}
            isWorkflowComplete={isWorkflowComplete}
            onContinueToSubmit={onContinueToSubmit}
          />
        );

      case STAGE.COMPLETED:
        return (
          <StageCompleted
            song={song}
            onSubmit={onSubmitSong}
            loading={actionLoading}
            onGoBackToEditing={onGoBackToEditing}
            onSwapSong={onSwapSong}
            onRemoveSong={onRemoveSong}
            rvReleaseTime={event.rv_release_time}
          />
        );

      case STAGE.SUBMITTED:
        return (
          <StageSubmitted
            song={song}
            onUpdateSubmission={onUpdateSubmission}
            loading={actionLoading}
            onBackToEditing={onGoBackToEditing}
            onSwapSong={onSwapSong}
            onRemoveSong={onRemoveSong}
            rvReleaseTime={event.rv_release_time}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="event-banner-content">
      {event.event_banner_url && (
        <img
          src={event.event_banner_url}
          alt={event.event_theme}
          className="event-banner-image"
        />
      )}

      {event.event_description && (
        <p className="event-description">{event.event_description}</p>
      )}

      {event.rv_release_time && (
        <div className="event-deadline">
          ⏰ RV Release (CET): {formatDate(event.rv_release_time)}
        </div>
      )}

      {error && (
        <div className="event-error-message">
          {error}
        </div>
      )}

      <div className="event-stage-content">{renderStageContent()}</div>

      {/* Other submissions - collapsed by default */}
      <OtherSubmissions
        eventId={event.id}
        isRevealed={event.is_revealed}
      />
    </div>
  );
};

export default EventBannerContent;

