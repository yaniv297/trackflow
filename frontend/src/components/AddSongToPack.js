import React, { useState } from "react";
import SmartDropdown from "./SmartDropdown";
import { apiPost } from "../utils/api";

const AddSongToPack = ({ isOpen, onClose, packId, packName, onSongAdded }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    collaborations: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.artist.trim()) {
      window.showNotification?.(
        "Please fill in song title and artist",
        "error"
      );
      return;
    }

    setLoading(true);
    try {
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
        status: "Future Plans",
        year: null,
        collaborations: collaborations,
      };

      // Create the song (auto-enhancement and auto-cleaning happen automatically)
      const response = await apiPost("/songs/", songData);
      const newSong = response;

      window.showNotification?.(
        `Added "${formData.title}" to ${packName}`,
        "success"
      );

      // Reset form
      setFormData({
        title: "",
        artist: "",
        collaborations: "",
      });

      // Close modal and notify parent
      onClose();
      onSongAdded?.();
    } catch (error) {
      console.error("Error adding song:", error);
      window.showNotification?.("Failed to add song", "error");
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
    onClose();
  };

  if (!isOpen) return null;

  return (
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
          minWidth: "400px",
          maxWidth: "500px",
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
          ➕ Add Song to "{packName}"
        </h3>

        <form onSubmit={handleSubmit}>
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
                loading || !formData.title.trim() || !formData.artist.trim()
              }
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                borderRadius: "6px",
                backgroundColor:
                  loading || !formData.title.trim() || !formData.artist.trim()
                    ? "#ccc"
                    : "#28a745",
                color: "white",
                cursor:
                  loading || !formData.title.trim() || !formData.artist.trim()
                    ? "not-allowed"
                    : "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
            >
              {loading ? "Adding..." : "Add Song"}
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
          Song will be auto-enhanced with Spotify data and cleaned for remaster
          tags.
        </p>
      </div>
    </div>
  );
};

export default AddSongToPack;
