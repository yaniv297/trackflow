import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiPut } from "../utils/api";
import UnifiedCollaborationModal from "./UnifiedCollaborationModal";
import MovePackModal from "./MovePackModal";
import FileHistoryModal from "./FileHistoryModal";
import ChangeAlbumArtModal from "./ChangeAlbumArtModal";
import { useAuth } from "../contexts/AuthContext";
import { useUserProfilePopup } from "../hooks/useUserProfilePopup";
import { useWorkflowData } from "../hooks/useWorkflowData";
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
  showPackName = false,
  authoringFields: authoringFieldsProp,
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
  const [progress, setProgress] = useState({}); // song_progress map: step -> boolean

  // Update localAuthoring when song.authoring changes
  useEffect(() => {
    setLocalAuthoring(song.authoring || {});
  }, [song.authoring]);
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
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [showMovePackModal, setShowMovePackModal] = useState(false);
  const [showFileHistoryModal, setShowFileHistoryModal] = useState(false);
  const [showChangeAlbumArtModal, setShowChangeAlbumArtModal] = useState(false);
  const [fileLinksCount, setFileLinksCount] = useState(0);
  const [lastKnownFileIds, setLastKnownFileIds] = useState(new Set());
  const isOptional = song.optional;
  const { user: currentUser } = useAuth();
  const { authoringFields } = useWorkflowData(currentUser);

  // Prefer fields provided via props (owner's workflow) over current user's
  const effectiveAuthoringFields = React.useMemo(() => {
    if (authoringFieldsProp && authoringFieldsProp.length > 0)
      return authoringFieldsProp;
    return authoringFields && authoringFields.length > 0 ? authoringFields : [];
  }, [authoringFieldsProp, authoringFields]);
  const isFinished = React.useMemo(() => {
    const wfFields = effectiveAuthoringFields;
    if (wfFields.length === 0) return false;
    // Prefer song_progress if loaded; fallback to legacy authoring
    if (Object.keys(progress).length > 0) {
      return wfFields.every((f) => progress[f] === true);
    }
    if (!song.authoring) return false;
    return wfFields.every((f) => song.authoring?.[f] === true);
  }, [song.authoring, effectiveAuthoringFields, progress]);
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  const loadWipCollaborations = useCallback(async () => {
    try {
      const response = await apiGet(`/authoring/${song.id}/wip-collaborations`);
      setWipCollaborations(response.assignments || []);
    } catch (error) {
      console.error("Error loading WIP collaborations:", error);
    }
  }, [song.id]);

  // Fetch song progress from new endpoint
  const loadSongProgress = useCallback(async () => {
    try {
      const rows = await apiGet(`/workflows/songs/${song.id}/progress`);
      const map = {};
      (rows || []).forEach((r) => {
        map[r.step_name] = !!r.is_completed;
      });
      setProgress(map);
    } catch (e) {
      // Silent fallback; progress stays empty and we rely on legacy
    }
  }, [song.id]);

  useEffect(() => {
    loadWipCollaborations();
    loadSongProgress();
  }, [loadWipCollaborations, loadSongProgress]);

  // Load file links count when component mounts
  useEffect(() => {
    if (wipCollaborations.length > 0) {
      loadFileLinksCount();
    }
  }, [wipCollaborations.length]);

  // Periodically check for new files (every 30 seconds)
  useEffect(() => {
    if (wipCollaborations.length > 0 && !showFileHistoryModal) {
      const interval = setInterval(() => {
        loadFileLinksCount();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [wipCollaborations.length, showFileHistoryModal]);

  const loadFileLinksCount = async () => {
    try {
      const response = await apiGet(`/file-links/${song.id}`);
      const fileLinks = response || [];
      const newCount = fileLinks.length;

      // Get current file IDs
      const currentFileIds = new Set(fileLinks.map((link) => link.id));

      // Find truly new files (files we haven't seen before)
      const newFileIds = new Set();
      currentFileIds.forEach((id) => {
        if (!lastKnownFileIds.has(id)) {
          newFileIds.add(id);
        }
      });

      // Show notification only for genuinely new files
      if (newFileIds.size > 0 && lastKnownFileIds.size > 0) {
        const newFilesCount = newFileIds.size;
        window.showNotification(
          `${newFilesCount} new file${
            newFilesCount > 1 ? "s" : ""
          } uploaded to "${song.title}"!`,
          "info"
        );
      }

      setFileLinksCount(newCount);
      setLastKnownFileIds(currentFileIds);
    } catch (error) {
      console.error("Error loading file links count:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showActionsDropdown &&
        !event.target.closest("[data-actions-dropdown]")
      ) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActionsDropdown]);

  const fields = effectiveAuthoringFields;

  const handleDelete = () => {
    if (onDelete) {
      onDelete(song.id);
    }
  };

  const toggleAuthoringField = async (field) => {
    // Prefer new progress map; mirror legacy will be done server-side
    const currentVal = progress.hasOwnProperty(field)
      ? !!progress[field]
      : !!localAuthoring[field];
    const nextVal = !currentVal;

    // Optimistic update
    setProgress((prev) => ({ ...prev, [field]: nextVal }));
    if (!song.authoring) song.authoring = {};
    song.authoring[field] = nextVal;
    setLocalAuthoring((prev) => ({ ...prev, [field]: nextVal }));

    try {
      await apiPut(`/authoring/${song.id}`, { [field]: nextVal });
      // Re-sync from server to avoid double-click visual glitches
      await loadSongProgress();
      if (onAuthoringUpdate) onAuthoringUpdate(song.id, field, nextVal);
    } catch (error) {
      // Revert on failure
      setProgress((prev) => ({ ...prev, [field]: currentVal }));
      song.authoring[field] = currentVal;
      setLocalAuthoring((prev) => ({ ...prev, [field]: currentVal }));
      console.error(`Error updating ${field}:`, error);
    }
  };

  const loadSpotifyOptions = async () => {
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

      const enhancedSong = await apiPost(`/spotify/${song.id}/enhance/`, {
        track_id: track_id,
      });

      window.showNotification("✅ Song enhanced!", "success");

      // Update the song data in the parent component
      if (onSongUpdate && enhancedSong) {
        onSongUpdate(song.id, enhancedSong);
      }

      // Update local edit values (but don't mutate the song object directly)
      if (enhancedSong) {
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
      const partsToMark = fields;
      const updates = {};
      partsToMark.forEach((f) => {
        updates[f] = true;
      });

      // Use PUT method; backend writes song_progress and mirrors legacy
      await apiPut(`/authoring/${song.id}`, updates);

      // Update UI state
      setProgress((prev) => {
        const next = { ...prev };
        partsToMark.forEach((f) => (next[f] = true));
        return next;
      });
      setLocalAuthoring((prev) => {
        const next = { ...prev };
        partsToMark.forEach((f) => (next[f] = true));
        return next;
      });

      if (onAuthoringUpdate) {
        partsToMark.forEach((f) => {
          onAuthoringUpdate(song.id, f, true);
        });
      }

      window.showNotification("All parts marked as complete!", "success");
    } catch (err) {
      console.error("Failed to mark all complete", err);
      window.showNotification("Failed to mark all parts complete", "error");
    }
  };

  // For progress calculation, use song_progress if present, else legacy
  // SIMPLE FIX: Use the same logic as the pack view
  const availableFields = fields.filter(
    (field) => song.authoring && song.authoring.hasOwnProperty(field)
  );
  const safeParts = availableFields;
  const filled = safeParts.filter((f) =>
    progress.hasOwnProperty(f) ? progress[f] : song.authoring?.[f]
  ).length;
  const percent =
    safeParts.length > 0 ? Math.round((filled / safeParts.length) * 100) : 0;
  const isComplete = safeParts.length > 0 && filled === safeParts.length;

  // Build external links for album
  // Wikipedia prefers the canonical title: "{Album} ({Artist} album)"
  const wikipediaTitle = [
    editValues.album,
    editValues.artist ? `(${editValues.artist} album)` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const wikipediaUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
    wikipediaTitle
  )}`;

  // Apple Music search for "Artist Album"
  const appleMusicQuery = [editValues.artist, editValues.album]
    .filter(Boolean)
    .join(" ");
  const appleMusicUrl = `https://music.apple.com/search?term=${encodeURIComponent(
    appleMusicQuery
  )}&media=music`;

  // Spotify search
  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(
    [editValues.artist, editValues.album].filter(Boolean).join(" ")
  )}`;

  // Genius lyrics search (Artist Title)
  const geniusQuery = [editValues.artist, editValues.title]
    .filter(Boolean)
    .join(" ");
  const geniusUrl = `https://genius.com/search?q=${encodeURIComponent(
    geniusQuery
  )}`;

  // Google search (Artist Album)
  const googleQuery = [editValues.artist, editValues.album]
    .filter(Boolean)
    .join(" ");
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
    googleQuery
  )}`;

  // Ultimate Guitar search (Artist Title)
  const ultimateGuitarQuery = [editValues.artist, editValues.title]
    .filter(Boolean)
    .join(" ");
  const ultimateGuitarUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(
    ultimateGuitarQuery
  )}`;

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

            <div
              style={{
                fontSize: "0.9rem",
                color: "#888",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {renderEditable("album")}
              {/* External links: Wikipedia, Apple Music, Spotify */}
              {editValues.album && (
                <>
                  <a
                    href={wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on Wikipedia"
                    style={{
                      textDecoration: "none",
                      color: "#3366cc",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Wikipedia badge: circular W glyph */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "1px solid #3366cc",
                        fontFamily: 'Georgia, "Times New Roman", Times, serif',
                        fontWeight: 700,
                        fontSize: 11,
                        lineHeight: 1,
                      }}
                    >
                      W
                    </span>
                  </a>
                  <span style={{ color: "#ccc" }}>|</span>
                  <a
                    href={geniusUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Search lyrics on Genius"
                    style={{
                      textDecoration: "none",
                      color: "#ffdd00",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Genius bolt-like icon */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2l-2 7h3l-3 13 8-10h-4l6-10z" />
                    </svg>
                  </a>
                  <span style={{ color: "#ccc" }}>|</span>
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Google search"
                    style={{
                      textDecoration: "none",
                      color: "#4285F4",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Simple Google G */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#4285F4"
                        d="M21.35 11.1h-8.9v2.96h5.2c-.23 1.27-1.57 3.73-5.2 3.73-3.13 0-5.68-2.59-5.68-5.78s2.55-5.78 5.68-5.78c1.78 0 2.96.75 3.64 1.39l2.48-2.39C17.19 3.8 15.2 3 13.05 3 7.99 3 3.88 7.03 3.88 12s4.11 9 9.17 9c5.3 0 8.8-3.72 8.8-8.97 0-.6-.06-1.06-.15-1.93z"
                      />
                    </svg>
                  </a>
                  <span style={{ color: "#ccc" }}>|</span>
                  <a
                    href={appleMusicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on Apple Music"
                    style={{
                      textDecoration: "none",
                      color: "#000", // neutral black like Apple's glyph
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Apple logo SVG to avoid missing glyphs in some fonts */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M16.365 1.43c0 1.14-.41 2.19-1.22 3.06-.98 1.09-2.15 1.74-3.45 1.64-.1-1.27.47-2.48 1.31-3.34.98-1.02 2.65-1.77 3.36-1.36-.03.13-.05.26-.05.4zM20.015 17.34c-.63 1.41-1.38 2.79-2.49 2.82-1.06.04-1.4-.67-2.61-.67-1.21 0-1.59.64-2.59.7-1.04.06-1.83-1.28-2.5-2.67-1.36-2.8-2.4-7.93.07-10.18.85-.83 1.97-1.3 3.11-1.32 1.22-.02 2.36.74 2.61.74.25 0 1.8-.92 3.03-.79 1.5.15 2.45.76 3.12 1.67-2.74 1.5-2.3 5.37.25 6.3-.24.66-.52 1.32-.9 1.8z" />
                    </svg>
                  </a>
                  <span style={{ color: "#ccc" }}>|</span>
                  <a
                    href={spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on Spotify"
                    style={{
                      textDecoration: "none",
                      color: "#1DB954",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Simple Spotify circle with waves */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path
                        fill="#fff"
                        d="M7 14c3-.8 7-.6 9.5.6.4.2.9 0 1.1-.4.2-.4 0-.9-.4-1.1C14.6 12.8 10.7 12.6 7.4 13.5c-.5.1-.8.6-.7 1 .1.4.6.7 1 .5zM7 11.3c3.5-1 8-0.8 11 .7.4.2.9 0 1.1-.4.2-.4 0-.9-.4-1.1-3.3-1.7-8.3-1.9-12.1-.8-.4.1-.7.6-.6 1 .1.4.6.7 1 .6z"
                      />
                    </svg>
                  </a>
                  <span style={{ color: "#ccc" }}>|</span>
                  <a
                    href={ultimateGuitarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Search on Ultimate Guitar"
                    style={{
                      textDecoration: "none",
                      color: "#FF6B35",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Guitar icon */}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M19.59 3.59c-.38-.38-.89-.59-1.42-.59H5.83c-.53 0-1.04.21-1.42.59L2.59 5.41c-.38.38-.59.89-.59 1.42v10.34c0 .53.21 1.04.59 1.42l1.82 1.82c.38.38.89.59 1.42.59h12.34c.53 0 1.04-.21 1.42-.59l1.82-1.82c.38-.38.59-.89.59-1.42V6.83c0-.53-.21-1.04-.59-1.42L19.59 3.59zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                    </svg>
                  </a>
                </>
              )}
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

            {showPackName && song.pack_name && (
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#999",
                  marginTop: "0.2rem",
                }}
              >
                Pack: {song.pack_name}
              </div>
            )}
          </div>

          {/* File History Button placed before the progress bar for alignment */}
          {!readOnly && (wipCollaborations.length > 0 || isFinished) && (
            <div style={{ position: "relative", marginRight: "0.5rem" }}>
              <button
                onClick={() => setShowFileHistoryModal(true)}
                style={{
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#218838";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#28a745";
                }}
                title={`File History (${fileLinksCount} files)`}
              >
                📁
              </button>

              {/* File count badge */}
              {fileLinksCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "-6px",
                    right: "-6px",
                    background: "#dc3545",
                    color: "white",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    border: "2px solid white",
                  }}
                >
                  {fileLinksCount > 9 ? "9+" : fileLinksCount}
                </div>
              )}
            </div>
          )}

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

          {/* File History Button moved left of progress bar */}

          {!readOnly && song.user_id === currentUser?.id && (
            <div style={{ position: "relative" }} data-actions-dropdown>
              <button
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                style={{
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#0056b3";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#007bff";
                }}
                title="Song actions"
              >
                ⚙️
              </button>

              {showActionsDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    minWidth: "160px",
                    padding: "0.5rem 0",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowCollaborationModal(true);
                      setShowActionsDropdown(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: "#5a8fcf",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    {wipCollaborations.length > 0
                      ? "Edit Collab"
                      : "Make Collab"}
                  </button>

                  <button
                    onClick={() => {
                      markAllDone();
                      setShowActionsDropdown(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: "#5a8fcf",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    Mark All Done
                  </button>

                  <button
                    onClick={() => {
                      loadSpotifyOptions();
                      setShowActionsDropdown(false);
                    }}
                    disabled={loadingSpotify}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: loadingSpotify ? "not-allowed" : "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: loadingSpotify ? "#999" : "#5a8fcf",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      if (!loadingSpotify) {
                        e.target.style.backgroundColor = "#f8f9fa";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    {loadingSpotify ? "⏳ Loading..." : "Enhance from Spotify"}
                  </button>

                  <button
                    onClick={() => {
                      setShowMovePackModal(true);
                      setShowActionsDropdown(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: "#5a8fcf",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    Move to Pack
                  </button>

                  <button
                    onClick={() => {
                      setShowChangeAlbumArtModal(true);
                      setShowActionsDropdown(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: "#5a8fcf",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    Change Album Art
                  </button>

                  <div
                    style={{
                      borderTop: "1px solid #eee",
                      margin: "0.25rem 0",
                    }}
                  />

                  <button
                    onClick={() => {
                      handleDelete();
                      setShowActionsDropdown(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: "#e74c3c",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#fdf2f2";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    Delete Song
                  </button>
                </div>
              )}
            </div>
          )}

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
                              const filled = progress.hasOwnProperty(field)
                                ? progress[field]
                                : localAuthoring?.[field];
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
                    const filled = progress.hasOwnProperty(field)
                      ? progress[field]
                      : localAuthoring?.[field];
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

              {/* Read-only notice for collaborator songs */}
              {readOnly && (
                <div
                  style={{
                    marginLeft: "0.2rem",
                    marginTop: "0.4rem",
                    fontSize: "0.91rem",
                    color: "#999",
                    fontWeight: 400,
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      color: "#999",
                      fontStyle: "italic",
                      fontSize: "0.8rem",
                    }}
                  >
                    Read-only (owned by collaborator)
                  </span>
                </div>
              )}
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
        onFileLinkAdded={(newLink) => {
          // Update the file count and track the new file ID
          setFileLinksCount((prev) => prev + 1);
          setLastKnownFileIds((prev) => new Set([...prev, newLink.id]));
        }}
        onFileLinkDeleted={(deletedLinkId) => {
          // Update the file count and remove the deleted file ID
          setFileLinksCount((prev) => Math.max(0, prev - 1));
          setLastKnownFileIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(deletedLinkId);
            return newSet;
          });
        }}
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
