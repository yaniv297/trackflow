import React, { useState, useEffect } from "react";
import API_BASE_URL from "../config";
import WipCollaborationModal from "./WipCollaborationModal";

export default function WipSongCard({
  song,
  onAuthoringUpdate,
  onDelete,
  onToggleOptional,
  expanded: expandedProp,
  defaultExpanded,
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

  // Load WIP collaborations when component mounts
  useEffect(() => {
    loadWipCollaborations();
  }, [song.id, loadWipCollaborations]);

  const loadWipCollaborations = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/authoring/${song.id}/wip-collaborations`
      );
      if (response.ok) {
        const data = await response.json();
        setWipCollaborations(data.assignments || []);
      }
    } catch (error) {
      console.error("Error loading WIP collaborations:", error);
    }
  };

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

    // Backend update
    await fetch(`${API_BASE_URL}/authoring/${song.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !currentValue }),
    });

    setLocalAuthoring((prev) => ({
      ...prev,
      [field]: newValue,
    }));

    if (onAuthoringUpdate) {
      onAuthoringUpdate(song.id, field, newValue);
    }
  };

  const fetchSpotifyOptions = async () => {
    setLoadingSpotify(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/spotify/${song.id}/spotify-options`
      );
      const data = await res.json();
      setSpotifyOptions(data || []);
    } catch (err) {
      console.error("Spotify fetch failed", err);
      window.showNotification("Failed to fetch Spotify options.", "error");
    } finally {
      setLoadingSpotify(false);
    }
  };

  const enhanceFromSpotify = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/spotify/${song.id}/spotify-options`
      );
      const options = await response.json();
      if (options.length === 0) {
        window.showNotification("Failed to fetch Spotify options.", "error");
        return;
      }

      const firstOption = options[0];
      await fetch(`${API_BASE_URL}/spotify/${song.id}/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track_id: firstOption.track_id }),
      });

      window.showNotification("✅ Song enhanced!", "success");
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
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

    fetch(`${API_BASE_URL}/songs/${song.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
      .then((res) => res.json())
      .then((updated) => {
        setEditValues((prev) => ({ ...prev, [field]: updated[field] }));
      })
      .catch(() => window.showNotification("Update failed", "error"));
  };

  const renderEditable = (field, style = {}) => {
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

      await fetch(`${API_BASE_URL}/authoring/${song.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

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
    } catch (err) {
      console.error("Failed to mark all complete", err);
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
            {!isComplete && (
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
                  onChange={onToggleOptional}
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
                        enhanceFromSpotify();
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

                    // Get all fields that are NOT assigned to any collaborator (these belong to yaniv297)
                    const assignedFields = new Set(
                      wipCollaborations.map((collab) => collab.field)
                    );
                    const unassignedFields = fields.filter(
                      (field) => !assignedFields.has(field)
                    );

                    const result = [];

                    // Add yaniv297's unassigned fields first
                    if (unassignedFields.length > 0) {
                      result.push(
                        <div key="yaniv297" style={{ marginBottom: "0.5rem" }}>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              marginBottom: "0.25rem",
                              color: "#666",
                            }}
                          >
                            yaniv297:
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
                                  onClick={() => toggleAuthoringField(field)}
                                  style={{
                                    padding: "0.25rem 0.6rem",
                                    borderRadius: "12px",
                                    fontSize: "0.85rem",
                                    backgroundColor: bg,
                                    color,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    lineHeight: "1",
                                    cursor: "pointer",
                                    userSelect: "none",
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

                    // Add other collaborators' fields
                    Object.entries(collaboratorGroups).forEach(
                      ([collaborator, assignedFields]) => {
                        if (collaborator !== "yaniv297") {
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
                                }}
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
                                        toggleAuthoringField(field)
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
                                        cursor: "pointer",
                                        userSelect: "none",
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
                        onClick={() => toggleAuthoringField(field)}
                        style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: "12px",
                          fontSize: "0.85rem",
                          backgroundColor: bg,
                          color,
                          display: "inline-flex",
                          alignItems: "center",
                          lineHeight: "1",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        {displayName}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Links */}
            <div
              style={{
                marginLeft: "0.2rem",
                marginTop: "0.4rem",
                fontSize: "0.91rem",
                color: "#5a8fcf",
                fontWeight: 400,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
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
                }}
                onMouseEnter={(e) =>
                  (e.target.style.textDecoration = "underline")
                }
                onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
              >
                {wipCollaborations.length > 0 ? "Edit Collab" : "Make Collab"}
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
                }}
                onMouseEnter={(e) =>
                  (e.target.style.textDecoration = "underline")
                }
                onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
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
                }}
                onMouseEnter={(e) =>
                  (e.target.style.textDecoration = "underline")
                }
                onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
              >
                {loadingSpotify ? "⏳ Loading..." : "Enhance from Spotify"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WIP Collaboration Modal */}
      <WipCollaborationModal
        song={song}
        isOpen={showCollaborationModal}
        onClose={() => setShowCollaborationModal(false)}
        onSave={() => {
          loadWipCollaborations();
          if (onAuthoringUpdate) {
            onAuthoringUpdate(
              song.id,
              "demucs",
              localAuthoring.demucs || false
            );
          }
        }}
      />
    </div>
  );
}
