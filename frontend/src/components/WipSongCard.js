import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiPut } from "../utils/api";
import UnifiedCollaborationModal from "./UnifiedCollaborationModal";
import { useAuth } from "../contexts/AuthContext";
import { useUserProfilePopup } from "../hooks/useUserProfilePopup";
import UserProfilePopup from "./UserProfilePopup";

export default function WipSongCard({
  song,
  onAuthoringUpdate,
  onDelete,
  onToggleOptional,
  expanded: expandedProp,
  defaultExpanded,
  readOnly = false,
  onSongUpdate,
}) {
  const [expandedInternal, setExpandedInternal] = useState(
    defaultExpanded !== undefined ? defaultExpanded : false
  );
  const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;
  const toggleExpand = () => {
    if (expandedProp !== undefined) return; // ignore toggle if controlled
    setExpandedInternal((e) => !e);
  };
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
  const [wipCollaborations, setWipCollaborations] = useState([]);
  const isOptional = song.optional;
  const { user: currentUser } = useAuth();
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  const loadWipCollaborations = useCallback(async () => {
    try {
      const response = await apiGet(`/authoring/${song.id}/wip-collaborations`);
      setWipCollaborations(response.assignments || []);
    } catch (error) {
      console.error("Error loading WIP collaborations:", error);
    }
  }, [song.id]);

  // Load WIP collaborations when component mounts
  useEffect(() => {
    loadWipCollaborations();
  }, [loadWipCollaborations]);

  const fields = [
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

  const handleDelete = () => {
    if (onDelete) {
      onDelete(song.id);
    }
  };

  const toggleAuthoringField = async (field) => {
    // Ensure `song.authoring` exists
    if (!song.authoring) {
      song.authoring = {};
    }

    const newValue = !localAuthoring[field];

    const currentValue = song.authoring[field] || false;

    // Optimistic UI update
    song.authoring[field] = !currentValue;
    setLocalAuthoring((prev) => ({ ...prev, [field]: newValue })); // trigger re-render

    // Backend update - use PUT method
    try {
      await apiPut(`/authoring/${song.id}`, { [field]: !currentValue });

      setLocalAuthoring((prev) => ({
        ...prev,
        [field]: newValue,
      }));

      if (onAuthoringUpdate) {
        onAuthoringUpdate(song.id, field, newValue);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      // Revert optimistic update on error
      song.authoring[field] = currentValue;
      setLocalAuthoring((prev) => ({ ...prev, [field]: currentValue }));
    }
  };

  const fetchSpotifyOptions = async () => {
    setLoadingSpotify(true);
    try {
      const data = await apiGet(`/spotify/${song.id}/spotify-options`);
      setSpotifyOptions(data || []);
    } catch (err) {
      console.error("Spotify fetch failed", err);
      window.showNotification("Failed to fetch Spotify options.", "error");
    } finally {
      setLoadingSpotify(false);
    }
  };

  const enhanceFromSpotify = async (trackId = null) => {
    try {
      let track_id;

      if (trackId) {
        // Use the provided track_id
        track_id = trackId;
      } else {
        // Fallback to first option (for backward compatibility)
        const options = await apiGet(`/spotify/${song.id}/spotify-options`);
        if (options.length === 0) {
          window.showNotification("Failed to fetch Spotify options.", "error");
          return;
        }
        track_id = options[0].track_id;
      }

      const enhancedSong = await apiPost(`/spotify/${song.id}/enhance`, {
        track_id: track_id,
      });

      window.showNotification("✅ Song enhanced!", "success");

      // Update the song data in the parent component
      if (onSongUpdate && enhancedSong) {
        onSongUpdate(song.id, enhancedSong);
      }

      // Also update local state
      if (enhancedSong) {
        // Update the song object with new data
        Object.assign(song, enhancedSong);

        // Update edit values
        setEditValues((prev) => ({
          ...prev,
          title: enhancedSong.title || prev.title,
          artist: enhancedSong.artist || prev.artist,
          album: enhancedSong.album || prev.album,
          year: enhancedSong.year || prev.year,
        }));
      }
    } catch (error) {
      console.error("Enhancement failed:", error);
      window.showNotification("Enhancement failed.", "error");
    }
  };

  const saveEdit = (field) => {
    const value = editValues[field];
    if (field === "year" && value && !/^\d{4}$/.test(value)) {
      window.showNotification("Please enter a valid 4-digit year.", "warning");
      return;
    }
    setEditing((prev) => ({ ...prev, [field]: false }));

    apiPatch(`/songs/${song.id}`, { [field]: value })
      .then((updated) => {
        // Update the local edit values and the song object
        setEditValues((prev) => ({
          ...prev,
          [field]: updated[field] || value,
        }));
        // Also update the song object for immediate UI reflection
        song[field] = updated[field] || value;
      })
      .catch((error) => {
        console.error("Update failed:", error);
        window.showNotification("Update failed", "error");
      });
  };

  const renderEditable = (field, style = {}) => {
    if (readOnly) {
      return (
        <span style={{ cursor: "default", color: "#666", ...style }}>
          {editValues[field]}
        </span>
      );
    }

    return editing[field] ? (
      <input
        value={editValues[field]}
        autoFocus
        onChange={(e) =>
          setEditValues((prev) => ({ ...prev, [field]: e.target.value }))
        }
        onBlur={() => saveEdit(field)}
        onKeyDown={(e) => {
          if (e.key === "Enter") saveEdit(field);
        }}
        style={{
          fontSize: "1.1rem",
          fontWeight: "600",
          padding: "2px 6px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          ...style,
        }}
      />
    ) : (
      <span
        onClick={() => setEditing((prev) => ({ ...prev, [field]: true }))}
        style={{ cursor: "pointer", ...style }}
        title="Click to edit"
      >
        {editValues[field]}
      </span>
    );
  };

  const markAllDone = async () => {
    try {
      // Only mark enabled parts as complete
      const partsToMark = fields;
      const updates = {};
      partsToMark.forEach((f) => {
        updates[f] = true;
      });

      // Use PUT method like toggleAuthoringField
      await apiPut(`/authoring/${song.id}`, updates);

      // Update UI state manually
      const updatedFields = { ...localAuthoring };
      partsToMark.forEach((f) => {
        updatedFields[f] = true;
      });
      setLocalAuthoring(updatedFields);

      if (onAuthoringUpdate) {
        partsToMark.forEach((f) => {
          onAuthoringUpdate(song.id, f, true);
        });
      }

      // Show success notification
      window.showNotification("All parts marked as complete!", "success");
    } catch (err) {
      console.error("Failed to mark all complete", err);
      window.showNotification("Failed to mark all parts complete", "error");
    }
  };

  // For progress calculation, use all fields
  const safeParts = fields;

  const filled = safeParts.filter((f) => localAuthoring?.[f]).length;
  const percent =
    safeParts.length > 0 ? Math.round((filled / safeParts.length) * 100) : 0;
  const isComplete = safeParts.length > 0 && filled === safeParts.length;

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
        position: "relative", // needed for absolute positioning
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
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
              {renderEditable("title")}
              <span
                style={{
                  fontStyle: "italic",
                  fontWeight: "400",
                  color: "#555",
                  marginLeft: 6,
                }}
              >
                – {renderEditable("artist")}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.25rem",
              }}
            >
              {/* Removed optional/core toggle from header */}
            </div>

            <div style={{ fontSize: "0.9rem", color: "#888" }}>
              {renderEditable("album")}
              {editValues.year && (
                <>
                  {" "}
                  (
                  {renderEditable("year", {
                    fontSize: "0.9rem",
                    width: "4ch",
                    textAlign: "center",
                  })}
                  )
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right", minWidth: 150 }}>
            <div
              style={{
                background: "#eee",
                borderRadius: 6,
                height: 10,
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  background: percent === 100 ? "#2ecc71" : "#3498db",
                  width: `${percent}%`,
                  height: "100%",
                }}
              />
            </div>
            <small style={{ fontSize: "0.8rem", color: "#444" }}>
              {filled} / {safeParts.length} parts
            </small>
            {!isComplete && !readOnly && (
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginLeft: "0.7rem",
                  fontSize: "0.89rem",
                  color: "#bbb",
                  cursor: "pointer",
                  fontWeight: 400,
                }}
                title={
                  isOptional ? "This song is optional" : "This song is core"
                }
              >
                <input
                  type="checkbox"
                  checked={isOptional}
                  onChange={() => onToggleOptional(song.id, isOptional)}
                  style={{
                    marginRight: "0.25em",
                    accentColor: "#b0c4de",
                    width: "0.95em",
                    height: "0.95em",
                  }}
                />
                Optional
              </label>
            )}
          </div>

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

          {!readOnly && song.user_id === currentUser?.id && (
            <button
              onClick={handleDelete}
              aria-label="Delete Song"
              style={{
                background: "none",
                border: "none",
                color: "#aaa",
                fontSize: "1rem",
                cursor: "pointer",
                marginLeft: "0.25rem",
                alignSelf: "flex-start",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#e74c3c")}
              onMouseLeave={(e) => (e.target.style.color = "#aaa")}
              title="Delete song"
            >
              ❌
            </button>
          )}
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
            {/* Spotify results (only shown if options available) */}
            {spotifyOptions.length > 0 && (
              <div style={{ marginTop: "0.5rem" }}>
                {spotifyOptions.map((opt) => (
                  <div
                    key={opt.track_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.4rem 0",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <img
                      src={opt.album_cover}
                      alt="cover"
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flexGrow: 1 }}>
                      <strong>{opt.title}</strong> – {opt.artist}
                      <br />
                      <em>{opt.album}</em>
                    </div>
                    <button
                      onClick={() => {
                        enhanceFromSpotify(opt.track_id);
                        setSpotifyOptions([]); // hide options after apply
                      }}
                      style={{
                        padding: "0.4rem 0.8rem",
                        backgroundColor: "#1DB954",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Authoring Fields */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                flexGrow: 1,
              }}
            >
              {/* Show fields grouped by collaborator if collaborations exist */}
              {wipCollaborations.length > 0 ? (
                <div>
                  {(() => {
                    // Group collaborations by collaborator
                    const collaboratorGroups = {};
                    wipCollaborations.forEach((collab) => {
                      if (!collaboratorGroups[collab.collaborator]) {
                        collaboratorGroups[collab.collaborator] = [];
                      }
                      collaboratorGroups[collab.collaborator].push(
                        collab.field
                      );
                    });

                    // Get all fields that are NOT assigned to any collaborator (these belong to the song owner)
                    const assignedFields = new Set(
                      wipCollaborations.map((collab) => collab.field)
                    );
                    const unassignedFields = fields.filter(
                      (field) => !assignedFields.has(field)
                    );

                    const result = [];

                    // Add song owner's unassigned fields
                    if (unassignedFields.length > 0) {
                      result.push(
                        <div
                          key={song.author || "song-owner"}
                          style={{ marginBottom: "0.5rem" }}
                        >
                          <div
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              marginBottom: "0.25rem",
                              color: "#666",
                              cursor: "pointer",
                            }}
                            onClick={handleUsernameClick(
                              song.author || "Song Owner"
                            )}
                            title="Click to view profile"
                          >
                            {song.author || "Song Owner"}:
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.5rem",
                            }}
                          >
                            {unassignedFields.map((field) => {
                              const filled = localAuthoring?.[field];
                              const displayName = field
                                .split("_")
                                .map((w) => w[0].toUpperCase() + w.slice(1))
                                .join(" ");

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
                                  }}
                                >
                                  {displayName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Add collaborators' explicitly assigned fields
                    Object.entries(collaboratorGroups).forEach(
                      ([collaborator, assignedFields]) => {
                        result.push(
                          <div
                            key={collaborator}
                            style={{ marginBottom: "0.5rem" }}
                          >
                            <div
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                marginBottom: "0.25rem",
                                color: "#666",
                                cursor: "pointer",
                              }}
                              onClick={handleUsernameClick(collaborator)}
                              title="Click to view profile"
                            >
                              {collaborator}:
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "0.5rem",
                              }}
                            >
                              {assignedFields.map((field) => {
                                const filled = localAuthoring?.[field];
                                const displayName = field
                                  .split("_")
                                  .map((w) => w[0].toUpperCase() + w.slice(1))
                                  .join(" ");

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
                                    }}
                                  >
                                    {displayName}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    );

                    return result;
                  })()}
                </div>
              ) : (
                /* Show regular fields if no collaborations */
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {fields.map((field) => {
                    const filled = localAuthoring?.[field];
                    const displayName = field
                      .split("_")
                      .map((w) => w[0].toUpperCase() + w.slice(1))
                      .join(" ");

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
                        }}
                      >
                        {displayName}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Action Links */}
              <div
                style={{
                  marginLeft: "0.2rem",
                  marginTop: "0.4rem",
                  fontSize: "0.91rem",
                  color: readOnly ? "#999" : "#5a8fcf",
                  fontWeight: 400,
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {readOnly ? (
                  <span
                    style={{
                      color: "#999",
                      fontStyle: "italic",
                      fontSize: "0.8rem",
                    }}
                  >
                    Read-only (owned by collaborator)
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => setShowCollaborationModal(true)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                        padding: 0,
                        textDecoration: "none",
                        textAlign: "left",
                        color: "#5a8fcf",
                        fontSize: "0.91rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.textDecoration = "none")
                      }
                    >
                      {wipCollaborations.length > 0
                        ? "Edit Collab"
                        : "Make Collab"}
                    </button>
                    <button
                      onClick={markAllDone}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                        padding: 0,
                        textDecoration: "none",
                        textAlign: "left",
                        color: "#5a8fcf",
                        fontSize: "0.91rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.textDecoration = "none")
                      }
                    >
                      Mark All Done
                    </button>
                    <button
                      onClick={fetchSpotifyOptions}
                      disabled={loadingSpotify}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                        padding: 0,
                        textDecoration: "none",
                        textAlign: "left",
                        color: "#5a8fcf",
                        fontSize: "0.91rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.textDecoration = "underline")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.textDecoration = "none")
                      }
                    >
                      {loadingSpotify
                        ? "⏳ Loading..."
                        : "Enhance from Spotify"}
                    </button>
                  </>
                )}
              </div>
            </div>
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
