import React, { useState } from "react";
import { apiPatch } from "../utils/api";

const ChangeAlbumArtModal = ({ isOpen, onClose, song, onSuccess }) => {
  const [imageUrl, setImageUrl] = useState(song?.album_cover || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiPatch(`/songs/${song.id}`, {
        album_cover: imageUrl.trim() || null,
      });

      if (onSuccess) {
        // Pass the updated song data to the callback
        onSuccess(response);
      }
      onClose();
      window.showNotification("Album art updated successfully!", "success");
    } catch (err) {
      console.error("Failed to update album art:", err);
      setError(err.message || "Failed to update album art");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImageUrl(song?.album_cover || "");
    setError("");
    setLoading(false);
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
      onClick={handleClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "2rem",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "1rem", color: "#333" }}>
          Change Album Art
        </h2>

        <p
          style={{ marginBottom: "1.5rem", color: "#666", fontSize: "0.9rem" }}
        >
          Update the album art for "{song?.title}" by {song?.artist}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#555",
              }}
            >
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
              disabled={loading}
            />
            <p
              style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#666" }}
            >
              Leave empty to remove the current album art
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: "0.75rem",
                marginBottom: "1rem",
                backgroundColor: "#f8d7da",
                color: "#721c24",
                borderRadius: "4px",
                border: "1px solid #f5c6cb",
              }}
            >
              {error}
            </div>
          )}

          {imageUrl && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#555",
                }}
              >
                Preview:
              </label>
              <div
                style={{
                  width: "100%",
                  height: "200px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f8f9fa",
                }}
              >
                <img
                  src={imageUrl}
                  alt="Album art preview"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "block";
                  }}
                />
                <div
                  style={{
                    display: "none",
                    color: "#666",
                    fontSize: "0.9rem",
                  }}
                >
                  Image not found or invalid URL
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                background: "white",
                color: "#666",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "1rem",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                borderRadius: "6px",
                background: loading ? "#ccc" : "#007bff",
                color: "white",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "1rem",
              }}
            >
              {loading ? "Updating..." : "Update Album Art"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangeAlbumArtModal;
