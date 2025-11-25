import React, { useEffect, useState, useCallback } from "react";
import { apiGet } from "../../utils/api";

const formatTimeAgo = (timestamp) => {
  if (!timestamp) {
    return "Unknown time";
  }

  const completedDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now - completedDate;

  if (diffMs < 0) {
    return completedDate.toLocaleString();
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return completedDate.toLocaleDateString();
};

function RecentlyAuthoredParts({ limit = 15 }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEntries = useCallback(
    async (showSpinner = false) => {
      try {
        if (showSpinner) {
          setLoading(true);
        }
        setError(null);
        const data = await apiGet(
          `/admin/recently-authored-parts?limit=${limit}`
        );
        setEntries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load recently authored parts:", err);
        setError(err.message || "Failed to load authored parts");
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    loadEntries(true);
    const interval = setInterval(() => loadEntries(false), 15000);
    return () => clearInterval(interval);
  }, [loadEntries]);

  if (loading) {
    return (
      <div style={{ padding: "1rem", color: "#666" }}>
        Loading recently authored parts...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "1rem", color: "#d32f2f" }}>
        Error loading authored parts: {error}
        <button
          onClick={() => loadEntries(true)}
          style={{ marginLeft: "0.5rem" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: "1rem", color: "#666", fontStyle: "italic" }}>
        No parts have been authored recently.
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxHeight: "600px", overflowY: "auto" }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #e4e7ec",
              alignItems: "center",
            }}
          >
            {entry.album_cover ? (
              <img
                src={entry.album_cover}
                alt={`${entry.song_title || "Song"} cover`}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "6px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "6px",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                {entry.song_title
                  ? entry.song_title.slice(0, 2).toUpperCase()
                  : "SP"}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "#1f2933",
                  marginBottom: "0.2rem",
                }}
              >
                {entry.song_title || "Untitled Song"}
                {entry.song_artist && (
                  <span style={{ color: "#5a6a85", fontWeight: 500 }}>
                    {" "}
                    · {entry.song_artist}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#5a6a85",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <span style={{ padding: "0.1rem 0.4rem", background: "#eef2ff", borderRadius: "4px", color: "#4c51bf", fontWeight: 600 }}>
                  {entry.step_name}
                </span>
                <span>by {entry.username}</span>
                <span style={{ fontStyle: "italic" }}>
                  {formatTimeAgo(entry.completed_at)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentlyAuthoredParts;

