import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import SmartDropdown from "./SmartDropdown";
import { apiPost, apiGet } from "../utils/api";
import DLCWarning from "./DLCWarning";

const AddSongToPack = ({ isOpen, onClose, packId, packName, onSongAdded }) => {
  const [loading, setLoading] = useState(false);
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const [packStatus, setPackStatus] = useState(null);
  const [isLoadingPackStatus, setIsLoadingPackStatus] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    collaborations: "",
  });
  const [multipleSongs, setMultipleSongs] = useState("");

  // Fetch pack status when packId changes
  useEffect(() => {
    if (packId && isOpen) {
      fetchPackStatus();
    }
  }, [packId, isOpen]);

  const fetchPackStatus = async () => {
    setIsLoadingPackStatus(true);
    try {
      const response = await apiGet(`/songs/?pack_id=${packId}`);
      if (response && response.length > 0) {
        // Count status occurrences
        const statusCounts = {};
        response.forEach((song) => {
          statusCounts[song.status] = (statusCounts[song.status] || 0) + 1;
        });

        // Get the most common status
        const mostCommonStatus = Object.entries(statusCounts).sort(
          ([, a], [, b]) => b - a
        )[0][0];

        setPackStatus(mostCommonStatus);
      } else {
        setPackStatus("Future Plans");
      }
    } catch (error) {
      console.error("Failed to fetch pack status:", error);
      setPackStatus("Future Plans");
    } finally {
      setIsLoadingPackStatus(false);
    }
  };

  const parseMultipleSongs = (text) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const songs = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        // Try to parse "Artist - Title" or "Artist – Title" format
        const dashIndex = trimmed.indexOf(" - ");
        const enDashIndex = trimmed.indexOf(" – ");

        // Use whichever dash appears first, or the regular dash if both are present
        let separatorIndex = -1;
        if (dashIndex !== -1 && enDashIndex !== -1) {
          separatorIndex = Math.min(dashIndex, enDashIndex);
        } else if (dashIndex !== -1) {
          separatorIndex = dashIndex;
        } else if (enDashIndex !== -1) {
          separatorIndex = enDashIndex;
        }

        if (separatorIndex > 0) {
          const artist = trimmed.substring(0, separatorIndex).trim();
          const title = trimmed.substring(separatorIndex + 3).trim(); // +3 for " - " or " – "
          if (artist && title) {
            songs.push({ artist, title });
          }
        } else {
          // If no dash, skip this line (invalid format)
          console.warn(
            `Skipping invalid format: "${trimmed}". Use "Artist - Title" or "Artist – Title" format.`
          );
        }
      }
    }

    return songs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isMultipleMode) {
        // Handle multiple songs
        const songs = parseMultipleSongs(multipleSongs);
        if (songs.length === 0) {
          window.showNotification?.(
            "Please enter at least one song in 'Artist - Title' or 'Artist – Title' format",
            "error"
          );
          return;
        }

        // Prepare songs data
        const songsData = songs.map((song) => ({
          title: song.title.trim(),
          artist: song.artist.trim(),
          pack_id: packId,
          status: packStatus || "Future Plans",
          collaborations: formData.collaborations.trim()
            ? formData.collaborations
                .split(",")
                .map((name) => ({ author: name.trim() }))
                .filter((c) => c.author)
            : [],
        }));

        // Create songs in batch
        const createdSongs = await apiPost("/songs/batch", songsData);

        window.showNotification?.(
          `Added ${createdSongs.length} song(s) to ${packName}`,
          "success"
        );
      } else {
        // Handle single song
        if (!formData.title.trim() || !formData.artist.trim()) {
          window.showNotification?.(
            "Please fill in song title and artist",
            "error"
          );
          return;
        }

        // Create the song data
        const collaborations = formData.collaborations.trim()
          ? formData.collaborations
              .split(",")
              .map((name) => ({ author: name.trim() }))
              .filter((c) => c.author)
          : [];

        const songData = {
          title: formData.title.trim(),
          artist: formData.artist.trim(),
          album: "", // Will be filled by Spotify enhancement
          pack_id: packId,
          status: packStatus || "Future Plans",
          year: null,
          collaborations: collaborations,
        };

        // Create the song (auto-enhancement and auto-cleaning happen automatically)
        await apiPost("/songs/", songData);

        window.showNotification?.(
          `Added "${formData.title}" to ${packName}`,
          "success"
        );
      }

      // Reset form
      setFormData({
        title: "",
        artist: "",
        collaborations: "",
      });
      setMultipleSongs("");

      // Close modal and notify parent
      onClose();
      onSongAdded?.();
    } catch (error) {
      console.error("Error adding song(s):", error);
      window.showNotification?.("Failed to add song(s)", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: "",
      artist: "",
      collaborations: "",
    });
    setMultipleSongs("");
    onClose();
  };

  if (!isOpen) return null;

  // Render modal via portal so it's not nested inside table elements (tbody/tr)
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "2rem",
          minWidth: "450px",
          maxWidth: "550px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            margin: "0 0 1.5rem 0",
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "#333",
          }}
        >
          ➕ Add Song{isMultipleMode ? "s" : ""} to "{packName}"
        </h3>

        {/* Pack Status Display */}
        {isLoadingPackStatus ? (
          <div
            style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#666" }}
          >
            Loading pack status...
          </div>
        ) : (
          packStatus && (
            <div
              style={{
                marginBottom: "1rem",
                fontSize: "0.9rem",
                color: "#28a745",
              }}
            >
              Pack status: {packStatus}
            </div>
          )
        )}

        {/* Mode Toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1.5rem",
            gap: "0.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => setIsMultipleMode(false)}
            style={{
              padding: "0.4rem 0.8rem",
              border: "2px solid #e1e5e9",
              borderRadius: "6px",
              background: !isMultipleMode ? "#007bff" : "#fff",
              color: !isMultipleMode ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "500",
            }}
          >
            Single Song
          </button>
          <button
            type="button"
            onClick={() => setIsMultipleMode(true)}
            style={{
              padding: "0.4rem 0.8rem",
              border: "2px solid #e1e5e9",
              borderRadius: "6px",
              background: isMultipleMode ? "#007bff" : "#fff",
              color: isMultipleMode ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "500",
            }}
          >
            Multiple Songs
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isMultipleMode ? (
            // Single song mode
            <>
              {/* Song Title */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                    color: "#555",
                  }}
                >
                  Song Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter song title"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                  autoFocus
                  disabled={loading}
                />
              </div>

              {/* Artist */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                    color: "#555",
                  }}
                >
                  Artist *
                </label>
                <SmartDropdown
                  type="artist"
                  value={formData.artist}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, artist: value }))
                  }
                  placeholder="Select or add artist name"
                />
              </div>
            </>
          ) : (
            // Multiple songs mode
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#555",
                }}
              >
                Songs (Artist - Title or Artist – Title format) *
              </label>
              <textarea
                value={multipleSongs}
                onChange={(e) => setMultipleSongs(e.target.value)}
                placeholder={`Enter songs in "Artist - Title" or "Artist – Title" format, one per line:

The Beatles - Hey Jude
The Beatles – Let It Be
Pink Floyd - Comfortably Numb
Queen – Bohemian Rhapsody`}
                required
                rows={8}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
                disabled={loading}
              />
            </div>
          )}

          {/* Collaborations */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#555",
              }}
            >
              Collaborations (optional)
            </label>
            <SmartDropdown
              type="collaborations"
              value={formData.collaborations}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, collaborations: value }))
              }
              placeholder="Select collaborators (comma-separated)"
            />
          </div>

          {/* DLC Warning - only show in single song mode */}
          {!isMultipleMode && (
            <DLCWarning title={formData.title} artist={formData.artist} />
          )}

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                backgroundColor: "white",
                color: "#666",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                (isMultipleMode
                  ? !multipleSongs.trim()
                  : !formData.title.trim() || !formData.artist.trim())
              }
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                borderRadius: "6px",
                backgroundColor:
                  loading ||
                  (isMultipleMode
                    ? !multipleSongs.trim()
                    : !formData.title.trim() || !formData.artist.trim())
                    ? "#ccc"
                    : "#28a745",
                color: "white",
                cursor:
                  loading ||
                  (isMultipleMode
                    ? !multipleSongs.trim()
                    : !formData.title.trim() || !formData.artist.trim())
                    ? "not-allowed"
                    : "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
            >
              {loading
                ? "Adding..."
                : isMultipleMode
                ? "Add Songs"
                : "Add Song"}
            </button>
          </div>
        </form>

        {/* Info text */}
        <p
          style={{
            margin: "1rem 0 0 0",
            fontSize: "0.875rem",
            color: "#666",
            fontStyle: "italic",
          }}
        >
          Song{isMultipleMode ? "s will" : " will"} be auto-enhanced with
          Spotify data and cleaned for remaster tags.
        </p>
      </div>
    </div>,
    document.body
  );
};

export default AddSongToPack;
