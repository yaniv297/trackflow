import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiPut } from "../../utils/api";
import UnifiedCollaborationModal from "../modals/UnifiedCollaborationModal";
import MovePackModal from "../modals/MovePackModal";
import FileHistoryModal from "../modals/FileHistoryModal";
import ChangeAlbumArtModal from "../modals/ChangeAlbumArtModal";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfilePopup } from "../../hooks/ui/useUserProfilePopup";
import UserProfilePopup from "../shared/UserProfilePopup";
import { useWorkflowData } from "../../hooks/workflows/useWorkflowData";

export default function DynamicWipSongCard({
  song,
  onAuthoringUpdate,
  onDelete,
  onToggleOptional,
  expanded: expandedProp,
  defaultExpanded,
  readOnly = false,
  onSongUpdate,
}) {
  const { user } = useAuth();
  const [expandedInternal, setExpandedInternal] = useState(
    defaultExpanded !== undefined ? defaultExpanded : false
  );
  const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;
  const toggleExpand = () => {
    if (expandedProp !== undefined) return; // ignore toggle if controlled
    setExpandedInternal((e) => !e);
  };

  // Dynamic workflow data
  const {
    authoringFields,
    getStepDisplayInfo,
    isSongComplete,
    getSongCompletionPercentage,
    getStepsByCategory,
    isUsingFallback,
  } = useWorkflowData(user);

  const [localAuthoring, setLocalAuthoring] = useState(song.authoring || {});
  const [spotifyOptions, setSpotifyOptions] = useState([]);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [editing, setEditing] = useState({});
  const [editValues, setEditValues] = useState({
    title: song.title,
    artist: song.artist,
    album: song.album,
    year: song.year || "",
  });
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [wipCollaborations, setWipCollaborations] = useState(
    song.wipCollaborations || []
  );
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showMovePackModal, setShowMovePackModal] = useState(false);
  const [showFileHistoryModal, setShowFileHistoryModal] = useState(false);
  const [showChangeAlbumArtModal, setShowChangeAlbumArtModal] = useState(false);
  const [fileLinksCount, setFileLinksCount] = useState(0);
  const [lastKnownFileIds, setLastKnownFileIds] = useState(new Set());

  const { popupState, showPopup, hidePopup } = useUserProfilePopup();

  // Check if song is complete using dynamic workflow
  const isFinished = isSongComplete(song);
  const completionPercentage = getSongCompletionPercentage(song);

  // Load WIP collaborations
  const loadWipCollaborations = useCallback(async () => {
    try {
      const response = await apiGet(`/authoring/${song.id}/wip-collaborations`);
      setWipCollaborations(response.assignments || []);
    } catch (error) {
      console.error("Failed to load WIP collaborations:", error);
    }
  }, [song.id]);

  // Load file links count
  const loadFileLinksCount = useCallback(async () => {
    try {
      const response = await apiGet(`/file-links/song/${song.id}`);
      const fileIds = new Set(response.map((link) => link.id));
      setFileLinksCount(response.length);
      setLastKnownFileIds(fileIds);
    } catch (error) {
      console.error("Failed to load file links:", error);
      setFileLinksCount(0);
    }
  }, [song.id]);

  useEffect(() => {
    setLocalAuthoring(song.authoring || {});
    setEditValues({
      title: song.title,
      artist: song.artist,
      album: song.album,
      year: song.year || "",
    });
    // Update WIP collaborations from song object (loaded in bulk on page load)
    if (song.wipCollaborations) {
      setWipCollaborations(song.wipCollaborations);
    }
  }, [song]);

  useEffect(() => {
    if (expanded) {
      // Only reload if we don't have data yet (fallback for edge cases)
      if (!song.wipCollaborations || song.wipCollaborations.length === 0) {
        loadWipCollaborations();
      }
      loadFileLinksCount();
    }
  }, [expanded, loadWipCollaborations, song.wipCollaborations]);

  const toggleAuthoringField = async (field) => {
    if (readOnly) return;

    const newValue = !localAuthoring[field];
    setLocalAuthoring((prev) => ({ ...prev, [field]: newValue }));

    try {
      await apiPut(`/authoring/${song.id}`, { [field]: newValue });
      if (onAuthoringUpdate) {
        onAuthoringUpdate(song.id, field, newValue);
      }
    } catch (error) {
      console.error("Failed to update authoring field:", error);
      setLocalAuthoring((prev) => ({ ...prev, [field]: !newValue }));
    }
  };

  const saveEdit = async (songId, field) => {
    const key = `${songId}_${field}`;
    const newValue = editValues[key];

    if (newValue === undefined || newValue === song[field]) {
      setEditing((prev) => ({ ...prev, [key]: false }));
      return;
    }

    try {
      const updatedSong = await apiPatch(`/songs/${songId}`, {
        [field]: field === "year" ? parseInt(newValue) || null : newValue,
      });

      if (onSongUpdate) {
        onSongUpdate(songId, updatedSong);
      }

      setEditing((prev) => ({ ...prev, [key]: false }));
    } catch (error) {
      console.error("Failed to update song:", error);
      setEditValues((prev) => ({ ...prev, [key]: song[field] }));
      setEditing((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSpotifySearch = async () => {
    if (loadingSpotify) return;

    setLoadingSpotify(true);
    try {
      const response = await apiPost("/spotify/search", {
        query: `${song.artist} ${song.title}`,
      });
      setSpotifyOptions(response.tracks?.items || []);
    } catch (error) {
      console.error("Spotify search failed:", error);
      setSpotifyOptions([]);
    } finally {
      setLoadingSpotify(false);
    }
  };

  const applySpotifyMetadata = async (track) => {
    try {
      const updatedSong = await apiPatch(`/songs/${song.id}`, {
        album: track.album.name,
        year: new Date(track.album.release_date).getFullYear(),
        album_cover: track.album.images[0]?.url || null,
      });

      if (onSongUpdate) {
        onSongUpdate(song.id, updatedSong);
      }

      setSpotifyOptions([]);
    } catch (error) {
      console.error("Failed to apply Spotify metadata:", error);
    }
  };

  // Create grouped fields by category for better organization
  const stepsByCategory = getStepsByCategory;

  // Get assigned collaborations grouped by collaborator
  const collaboratorGroups = {};
  wipCollaborations.forEach((collab) => {
    if (!collaboratorGroups[collab.collaborator]) {
      collaboratorGroups[collab.collaborator] = [];
    }
    collaboratorGroups[collab.collaborator].push(
      collab.field.toLowerCase().replace(/\s+/g, "_")
    );
  });

  // Get fields that are not assigned to any collaborator
  const assignedFields = new Set(
    wipCollaborations.map((collab) =>
      collab.field.toLowerCase().replace(/\s+/g, "_")
    )
  );
  const unassignedFields = authoringFields.filter(
    (field) => !assignedFields.has(field)
  );

  // Render authoring steps organized by category
  const renderAuthoringSteps = () => {
    if (isUsingFallback) {
      // Render original static layout when workflow system is not available
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {unassignedFields.map((field) => {
            const filled = localAuthoring?.[field];
            const stepInfo = getStepDisplayInfo(field);
            const bg = filled ? "#4caf50" : "#ddd";
            const color = filled ? "white" : "black";

            return (
              <span
                key={field}
                onClick={() => !readOnly && toggleAuthoringField(field)}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  backgroundColor: bg,
                  color,
                  display: "inline-flex",
                  alignItems: "center",
                  lineHeight: "1",
                  cursor: readOnly ? "default" : "pointer",
                  userSelect: "none",
                  opacity: readOnly ? 0.7 : 1,
                  border: stepInfo.isRequired
                    ? "2px solid transparent"
                    : "2px dashed #999",
                }}
                title={
                  stepInfo.description ||
                  `${stepInfo.isRequired ? "Required" : "Optional"} step`
                }
              >
                {stepInfo.displayName}
                {stepInfo.isRequired && (
                  <span style={{ marginLeft: "4px", fontSize: "0.7rem" }}>
                    *
                  </span>
                )}
              </span>
            );
          })}
        </div>
      );
    }

    // Render categorized layout when workflow system is available
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {Object.entries(stepsByCategory).map(([category, categoryFields]) => {
          if (categoryFields.length === 0) return null;

          const categoryUnassignedFields = categoryFields.filter(
            (field) => !assignedFields.has(field)
          );
          if (categoryUnassignedFields.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: "0.5rem" }}>
              {category && category !== "" && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    color: "#666",
                    marginBottom: "0.5rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {category}
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {categoryUnassignedFields.map((field) => {
                  const filled = localAuthoring?.[field];
                  const stepInfo = getStepDisplayInfo(field);
                  const bg = filled ? "#4caf50" : "#ddd";
                  const color = filled ? "white" : "black";

                  return (
                    <span
                      key={field}
                      onClick={() => !readOnly && toggleAuthoringField(field)}
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "12px",
                        fontSize: "0.85rem",
                        backgroundColor: bg,
                        color,
                        display: "inline-flex",
                        alignItems: "center",
                        lineHeight: "1",
                        cursor: readOnly ? "default" : "pointer",
                        userSelect: "none",
                        opacity: readOnly ? 0.7 : 1,
                        border: stepInfo.isRequired
                          ? "2px solid transparent"
                          : "2px dashed #999",
                      }}
                      title={
                        stepInfo.description ||
                        `${stepInfo.isRequired ? "Required" : "Optional"} step`
                      }
                    >
                      {stepInfo.displayName}
                      {stepInfo.isRequired && (
                        <span style={{ marginLeft: "4px", fontSize: "0.7rem" }}>
                          *
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        border: `2px solid ${isFinished ? "#4caf50" : "#ddd"}`,
        borderRadius: "8px",
        margin: "0.5rem 0",
        backgroundColor: "white",
        boxShadow: isFinished
          ? "0 4px 12px rgba(76, 175, 80, 0.2)"
          : "0 2px 8px rgba(0,0,0,0.1)",
        transition: "all 0.3s ease",
      }}
    >
      {/* Song Header */}
      <div
        style={{
          padding: "1rem",
          borderBottom: expanded ? "1px solid #eee" : "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onClick={toggleExpand}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.25rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>
              {song.title}
            </h3>
            {song.optional && (
              <span
                style={{
                  backgroundColor: "#f59e0b",
                  color: "white",
                  padding: "0.125rem 0.375rem",
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  fontWeight: "500",
                }}
              >
                OPTIONAL
              </span>
            )}
            {isFinished && (
              <span
                style={{
                  backgroundColor: "#4caf50",
                  color: "white",
                  padding: "0.125rem 0.375rem",
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  fontWeight: "500",
                }}
              >
                COMPLETE
              </span>
            )}
          </div>
          <div style={{ color: "#666", fontSize: "0.9rem" }}>
            by {song.artist} • {song.album} ({song.year})
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <div
              style={{
                backgroundColor: "#f3f4f6",
                borderRadius: "6px",
                height: "6px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  backgroundColor: isFinished ? "#4caf50" : "#3b82f6",
                  height: "100%",
                  width: `${completionPercentage}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#666",
                marginTop: "0.25rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{completionPercentage}% complete</span>
              {isUsingFallback && (
                <span style={{ color: "#f59e0b", fontWeight: "500" }}>
                  Using default workflow
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {fileLinksCount > 0 && (
            <span
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "0.25rem 0.5rem",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "500",
              }}
            >
              📎 {fileLinksCount}
            </span>
          )}

          <span style={{ fontSize: "1.2rem", color: "#666" }}>
            {expanded ? "−" : "+"}
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ padding: "1rem" }}>
          {/* Authoring Progress */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>
                Authoring Progress
              </h4>
              {!readOnly && (
                <button
                  onClick={() => setShowCollaborationModal(true)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  👥 Assign
                </button>
              )}
            </div>

            {/* Song Owner's unassigned steps */}
            {unassignedFields.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  {song.author || "Song Owner"}:
                </div>
                {renderAuthoringSteps()}
              </div>
            )}

            {/* Collaborator assignments */}
            {Object.entries(collaboratorGroups).map(
              ([collaborator, fields]) => (
                <div key={collaborator} style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: "500",
                      color: "#374151",
                      marginBottom: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      onMouseEnter={(e) => showPopup(collaborator, e)}
                      onMouseLeave={hidePopup}
                      style={{ cursor: "pointer" }}
                    >
                      {collaborator}:
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                  >
                    {fields.map((field) => {
                      const filled = localAuthoring?.[field];
                      const stepInfo = getStepDisplayInfo(field);
                      const bg = filled ? "#4caf50" : "#ddd";
                      const color = filled ? "white" : "black";

                      return (
                        <span
                          key={field}
                          onClick={() =>
                            !readOnly && toggleAuthoringField(field)
                          }
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "12px",
                            fontSize: "0.85rem",
                            backgroundColor: bg,
                            color,
                            display: "inline-flex",
                            alignItems: "center",
                            lineHeight: "1",
                            cursor: readOnly ? "default" : "pointer",
                            userSelect: "none",
                            opacity: readOnly ? 0.7 : 1,
                            border: stepInfo.isRequired
                              ? "2px solid transparent"
                              : "2px dashed #999",
                          }}
                          title={
                            stepInfo.description ||
                            `${
                              stepInfo.isRequired ? "Required" : "Optional"
                            } step`
                          }
                        >
                          {stepInfo.displayName}
                          {stepInfo.isRequired && (
                            <span
                              style={{ marginLeft: "4px", fontSize: "0.7rem" }}
                            >
                              *
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button
              onClick={() => setShowFileHistoryModal(true)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              📁 Files ({fileLinksCount})
            </button>

            <button
              onClick={() => setShowChangeAlbumArtModal(true)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#8b5cf6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              🎨 Album Art
            </button>

            {!readOnly && (
              <>
                <button
                  onClick={() => setShowMovePackModal(true)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  📦 Move
                </button>

                <button
                  onClick={() => onToggleOptional(song.id, song.optional)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: song.optional ? "#10b981" : "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  {song.optional ? "Make Required" : "Make Optional"}
                </button>

                <button
                  onClick={() => onDelete(song.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <UnifiedCollaborationModal
        songId={song.id}
        songTitle={song.title}
        songOwnerId={song.user_id} // Pass song owner ID to avoid extra API call
        songCollaborations={song.collaborations} // Pass preloaded collaborations
        songWipCollaborations={song.wipCollaborations} // Pass preloaded WIP collaborations
        collaborationType="song"
        isOpen={showCollaborationModal}
        onClose={() => setShowCollaborationModal(false)}
        onCollaborationSaved={() => {
          loadWipCollaborations();
          setShowCollaborationModal(false);
        }}
      />

      <MovePackModal
        isOpen={showMovePackModal}
        onClose={() => setShowMovePackModal(false)}
        song={song}
        onSuccess={(updatedSong) => {
          if (onSongUpdate) onSongUpdate(song.id, updatedSong);
          setShowMovePackModal(false);
        }}
      />

      <FileHistoryModal
        isOpen={showFileHistoryModal}
        onClose={() => setShowFileHistoryModal(false)}
        song={song}
        mode={isFinished ? "con" : "normal"}
        onFileLinkAdded={(newLink) => {
          setFileLinksCount((prev) => prev + 1);
          setLastKnownFileIds((prev) => new Set([...prev, newLink.id]));
        }}
        onFileLinkDeleted={(deletedLinkId) => {
          setFileLinksCount((prev) => Math.max(0, prev - 1));
          setLastKnownFileIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(deletedLinkId);
            return newSet;
          });
        }}
      />

      <ChangeAlbumArtModal
        isOpen={showChangeAlbumArtModal}
        onClose={() => setShowChangeAlbumArtModal(false)}
        song={song}
        onSuccess={(updatedSongData) => {
          if (onSongUpdate) {
            onSongUpdate(song.id, updatedSongData);
          }
        }}
      />

      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />
    </div>
  );
}
