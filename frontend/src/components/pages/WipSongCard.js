import React, { useState, useMemo } from "react";
import UnifiedCollaborationModal from "../modals/UnifiedCollaborationModal";
import MovePackModal from "../modals/MovePackModal";
import FileHistoryModal from "../modals/FileHistoryModal";
import ChangeAlbumArtModal from "../modals/ChangeAlbumArtModal";
import UserProfilePopup from "../shared/UserProfilePopup";

import SongMetadata from "./WipSongCard/SongMetadata";
import SongProgress from "./WipSongCard/SongProgress";
import FileManager from "./WipSongCard/FileManager";
import SongActions from "./WipSongCard/SongActions";
import SpotifyEnhancement from "./WipSongCard/SpotifyEnhancement";
import AuthoringFields from "./WipSongCard/AuthoringFields";

import { useAuth } from "../../contexts/AuthContext";
import { useUserProfilePopup } from "../../hooks/ui/useUserProfilePopup";
import { useWorkflowData } from "../../hooks/workflows/useWorkflowData";
import { useSongEditing } from "../../hooks/ui/useSongEditing";
import { useFileLinks } from "../../hooks/ui/useFileLinks";
import { useSpotifyEnhancement } from "../../hooks/ui/useSpotifyEnhancement";
import { useWipCollaborations } from "../../hooks/wip/useWipCollaborations";
import { useSongProgress } from "../../hooks/workflows/useSongProgress";

import { getSongProgressData } from "../../utils/progressUtils";
import { apiPatch } from "../../utils/api";
import { checkAndShowNewAchievements } from "../../utils/achievements";

export default function WipSongCard({
  song,
  onAuthoringUpdate,
  onDelete,
  onToggleOptional,
  expanded: expandedProp,
  defaultExpanded,
  readOnly = false,
  onSongUpdate,
  showPackName = false,
  authoringFields: authoringFieldsProp,
  onReleaseSong, // New prop for releasing individual songs
}) {
  const [expandedInternal, setExpandedInternal] = useState(
    defaultExpanded !== undefined ? defaultExpanded : false
  );
  const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;
  const toggleExpand = () => {
    if (expandedProp !== undefined) return; // ignore toggle if controlled
    setExpandedInternal((e) => !e);
  };

  // Modal states
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [showMovePackModal, setShowMovePackModal] = useState(false);
  const [showFileHistoryModal, setShowFileHistoryModal] = useState(false);
  const [showChangeAlbumArtModal, setShowChangeAlbumArtModal] = useState(false);

  const { user: currentUser } = useAuth();
  const { authoringFields } = useWorkflowData(currentUser);

  // Prefer fields provided via props (owner's workflow) over current user's
  const effectiveAuthoringFields = useMemo(() => {
    if (authoringFieldsProp && authoringFieldsProp.length > 0)
      return authoringFieldsProp;
    return authoringFields && authoringFields.length > 0 ? authoringFields : [];
  }, [authoringFieldsProp, authoringFields]);

  // Custom hooks
  const { editing, editValues, saveEdit, startEdit, updateEditValue, updateEditValues } = 
    useSongEditing(song, onSongUpdate);
  
  const { wipCollaborations, loadWipCollaborations } = 
    useWipCollaborations(song.id);
  
  const { toggleAuthoringField, markAllDone } = 
    useSongProgress(song, effectiveAuthoringFields, onAuthoringUpdate);

  const { fileLinksCount, handleFileLinkAdded, handleFileLinkDeleted } = 
    useFileLinks(song.id, song.title, wipCollaborations, showFileHistoryModal);

  const { 
    spotifyOptions, 
    loadingSpotify, 
    loadSpotifyOptions, 
    enhanceFromSpotify, 
    clearSpotifyOptions 
  } = useSpotifyEnhancement(song.id, onSongUpdate, updateEditValues);

  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  // Progress calculation
  const progressData = useMemo(() => {
    return getSongProgressData(song, effectiveAuthoringFields);
  }, [song, effectiveAuthoringFields]);

  const isOptional = song.optional;
  const isFinished = progressData.isComplete;

  const handleDelete = () => {
    if (onDelete) {
      onDelete(song.id);
    }
  };

  const saveNotes = async (songId, notes) => {
    try {
      const updated = await apiPatch(`/songs/${songId}`, { notes });
      
      // Update the song object for immediate UI reflection
      if (onSongUpdate) {
        onSongUpdate(songId, { ...song, notes: updated.notes || notes });
      }
      
      // Check for achievements after successful update
      await checkAndShowNewAchievements();
      
      window.showNotification("Notes saved successfully", "success");
    } catch (error) {
      console.error("Failed to save notes:", error);
      window.showNotification("Failed to save notes", "error");
      throw error; // Re-throw so the component knows it failed
    }
  };

  return (
    <div
      className="WipSongCard"
      style={{
        background: "#fdfdfd",
        borderRadius: "12px",
        padding: "1rem",
        marginBottom: "1.5rem",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.2s ease-in-out",
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "1.2rem",
      }}
    >
      {/* Album Art Always Visible */}
      {song.album_cover && (
        <img
          src={song.album_cover}
          alt="Album Cover"
          style={{
            width: 64,
            height: 64,
            objectFit: "cover",
            borderRadius: 8,
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            flexShrink: 0,
          }}
        />
      )}

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <SongMetadata
            song={song}
            editValues={editValues}
            editing={editing}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onEditValueChange={updateEditValue}
            onSaveNotes={saveNotes}
            readOnly={readOnly}
            showPackName={showPackName}
          />

          {/* File History Button */}
          <FileManager
            fileLinksCount={fileLinksCount}
            onShowFileHistory={() => setShowFileHistoryModal(true)}
            wipCollaborations={wipCollaborations}
            isFinished={isFinished}
            readOnly={readOnly}
          />

          {/* Progress Bar */}
          <SongProgress
            progressData={progressData}
            fields={effectiveAuthoringFields}
            isOptional={isOptional}
            onToggleOptional={onToggleOptional}
            songId={song.id}
            readOnly={readOnly}
          />

          {/* Actions Dropdown */}
          <SongActions
            song={song}
            isFinished={isFinished}
            wipCollaborations={wipCollaborations}
            currentUser={currentUser}
            loadingSpotify={loadingSpotify}
            onReleaseSong={onReleaseSong}
            onShowCollaborationModal={() => setShowCollaborationModal(true)}
            onMarkAllDone={markAllDone}
            onLoadSpotifyOptions={loadSpotifyOptions}
            onShowMovePackModal={() => setShowMovePackModal(true)}
            onShowChangeAlbumArtModal={() => setShowChangeAlbumArtModal(true)}
            onDelete={handleDelete}
            readOnly={readOnly}
          />

          {/* Expand Button */}
          <button
            onClick={toggleExpand}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              padding: "0 0.5rem",
              color: "#666",
            }}
            aria-label="Expand song details"
          >
            {expanded ? "▼" : "▶"}
          </button>
        </div>

        {/* Expanded Section */}
        {expanded && (
          <div
            style={{
              marginTop: "1.2rem",
              display: "flex",
              gap: "1.5rem",
              background: "#fafafa",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #eee",
              alignItems: "flex-start",
            }}
          >
            {/* Spotify Enhancement */}
            <SpotifyEnhancement
              spotifyOptions={spotifyOptions}
              onEnhanceFromSpotify={enhanceFromSpotify}
              onClearOptions={clearSpotifyOptions}
            />

            {/* Authoring Fields */}
            <AuthoringFields
              song={song}
              fields={effectiveAuthoringFields}
              wipCollaborations={wipCollaborations}
              onToggleAuthoringField={toggleAuthoringField}
              onUsernameClick={handleUsernameClick}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {/* Enhanced Collaboration Modal */}
      {showCollaborationModal && (
        <UnifiedCollaborationModal
          isOpen={showCollaborationModal}
          onClose={() => setShowCollaborationModal(false)}
          songId={song.id}
          songTitle={song.title}
          collaborationType="song"
          currentUser={currentUser}
          onCollaborationSaved={() => {
            loadWipCollaborations();
            if (onAuthoringUpdate) {
              onAuthoringUpdate(song.id, "collaboration", true);
            }
          }}
        />
      )}

      {/* Move Pack Modal */}
      <MovePackModal
        isOpen={showMovePackModal}
        onClose={() => setShowMovePackModal(false)}
        song={song}
        onSongUpdate={onSongUpdate}
        onSuccess={() => setShowMovePackModal(false)}
      />

      {/* File History Modal */}
      <FileHistoryModal
        isOpen={showFileHistoryModal}
        onClose={() => setShowFileHistoryModal(false)}
        song={song}
        mode={isFinished ? "con" : "normal"}
        onFileLinkAdded={handleFileLinkAdded}
        onFileLinkDeleted={handleFileLinkDeleted}
      />

      {/* Change Album Art Modal */}
      <ChangeAlbumArtModal
        isOpen={showChangeAlbumArtModal}
        onClose={() => setShowChangeAlbumArtModal(false)}
        song={song}
        onSuccess={(updatedSongData) => {
          if (onSongUpdate) {
            // Pass the updated song data to update the local state
            onSongUpdate(song.id, updatedSongData);
          }
        }}
      />

      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />
    </div>
  );
}