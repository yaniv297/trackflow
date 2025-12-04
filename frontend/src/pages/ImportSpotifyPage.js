import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../utils/api";
import { checkAndShowNewAchievements } from "../utils/achievements";

const statuses = [
  { label: "Future Plans", value: "Future Plans" },
  { label: "In Progress", value: "In Progress" },
  { label: "Released", value: "Released" },
];

function ImportSpotifyPage() {
  const [status, setStatus] = useState("Future Plans");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [pack, setPack] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ phase: "", current: 0, total: 0 });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!playlistUrl.trim()) {
      window.showNotification("Please enter a Spotify playlist URL", "error");
      return;
    }

    setIsSubmitting(true);
    setProgress({ phase: "Connecting to Spotify...", current: 0, total: 3 });

    try {
      // Small delay to show initial progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgress({ phase: "Reading playlist tracks...", current: 1, total: 3 });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setProgress({ phase: "Creating songs in database...", current: 2, total: 3 });
      
      // Call the backend API
      const result = await apiPost(`/spotify/import-playlist`, {
        playlist_url: playlistUrl,
        status: status,
        pack: pack.trim() || null,
      });
      
      setProgress({ phase: "Import completed successfully", current: 3, total: 3 });

      // Show success notification with details
      let message = `✅ Successfully imported ${result.imported_count} songs from playlist!`;
      
      if (result.skipped_songs && result.skipped_songs.length > 0) {
        message += `\n⏭️ Skipped ${result.skipped_songs.length} duplicate songs:`;
        result.skipped_songs.slice(0, 3).forEach(song => {
          message += `\n• ${song}`;
        });
        if (result.skipped_songs.length > 3) {
          message += `\n• ...and ${result.skipped_songs.length - 3} more`;
        }
      }
      
      if (result.failed_songs && result.failed_songs.length > 0) {
        message += `\n❌ Failed to import ${result.failed_songs.length} songs:`;
        result.failed_songs.slice(0, 2).forEach(song => {
          message += `\n• ${song}`;
        });
        if (result.failed_songs.length > 2) {
          message += `\n• ...and ${result.failed_songs.length - 2} more`;
        }
      }
      
      window.showNotification(message, "success");

      // Check for new achievements
      await checkAndShowNewAchievements();

      // Reset form
      setPlaylistUrl("");
      setPack("");
      setIsSubmitting(false);
      setProgress({ phase: "", current: 0, total: 0 });

      // Redirect based on status
      setTimeout(() => {
        if (status === "Future Plans") {
          navigate("/future");
        } else if (status === "In Progress") {
          navigate("/wip");
        } else {
          navigate("/released");
        }
      }, 1500);
    } catch (error) {
      console.error("Import error:", error);
      window.showNotification(
        error.message ||
          "Failed to import playlist. Please check the URL and try again.",
        "error"
      );
      setIsSubmitting(false);
      setProgress({ phase: "", current: 0, total: 0 });
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "2rem" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2.5rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0",
        }}
      >
        <h2
          style={{
            margin: "0 0 2rem 0",
            fontSize: "2rem",
            fontWeight: "600",
            color: "#333",
            textAlign: "center",
          }}
        >
          Import from Spotify
        </h2>

        <div
          style={{
            background: "#f8f9fa",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            border: "1px solid #e9ecef",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem 0",
              fontWeight: "500",
              color: "#495057",
            }}
          >
            📋 How to use:
          </p>
          <ul
            style={{
              margin: "0",
              paddingLeft: "1.5rem",
              color: "#6c757d",
              fontSize: "0.9rem",
            }}
          >
            <li>
              Copy a Spotify playlist URL (e.g.,
              https://open.spotify.com/playlist/...)
            </li>
            <li>Choose the status for imported songs</li>
            <li>
              Enter a pack name to group the songs (will create new pack if it
              doesn't exist), or leave empty for no pack
            </li>
            <li>Songs will be automatically cleaned of remaster tags</li>
          </ul>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div>
            <label
              style={{
                fontWeight: 500,
                color: "#555",
                marginBottom: 6,
                display: "block",
              }}
            >
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "1rem",
                backgroundColor: "#fff",
                transition: "border-color 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontWeight: 500,
                color: "#555",
                marginBottom: 6,
                display: "block",
              }}
            >
              Spotify Playlist URL
            </label>
            <input
              type="text"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/..."
              required
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "1rem",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                fontWeight: 500,
                color: "#555",
                marginBottom: 6,
                display: "block",
              }}
            >
              Pack Name
            </label>
            <input
              type="text"
              value={pack}
              onChange={(e) => setPack(e.target.value)}
              placeholder="e.g., My Spotify Pack"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "1rem",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting
                ? "#ccc"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              fontWeight: "600",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              marginTop: "1rem",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 25px rgba(102,126,234,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            {isSubmitting ? "Importing..." : "Import Playlist"}
          </button>
          {isSubmitting && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ fontWeight: "500", color: "#495057" }}>
                  {progress.phase}
                </span>
                <span style={{ fontSize: "0.9rem", color: "#6c757d" }}>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "#e9ecef",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${
                      progress.total > 0
                        ? (progress.current / progress.total) * 100
                        : 0
                    }%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #007bff, #0056b3)",
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default ImportSpotifyPage;
