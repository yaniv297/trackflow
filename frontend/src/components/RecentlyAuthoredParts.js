import React, { useEffect, useState, useCallback } from "react";
import { apiGet } from "../utils/api";

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Unknown";

  const completedDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now - completedDate;

  if (diffMs < 0) return completedDate.toLocaleString();

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
        setError(err.message || "Failed to load recently authored parts");
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
      <div style={{ padding: "0.75rem 0", color: "#666" }}>
        Loading recently authored parts...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "0.75rem 0", color: "#c0392b" }}>
        Error loading recently authored parts: {error}
        <button
          onClick={() => loadEntries(true)}
          style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: "0.75rem 0", color: "#666", fontStyle: "italic" }}>
        No recent authoring activity.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: "400px", overflowY: "auto" }}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            padding: "0.6rem 0",
            borderBottom: "1px solid #f0f2f5",
          }}
        >
          <div style={{ fontWeight: 600, color: "#172035" }}>
            {entry.song_title || `Song #${entry.song_id}`}
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
              marginTop: "0.2rem",
              alignItems: "center",
            }}
          >
            <span
              style={{
                padding: "0.1rem 0.35rem",
                borderRadius: "3px",
                background: "#eef2ff",
                color: "#4c51bf",
                fontWeight: 600,
              }}
            >
              {entry.step_name}
            </span>
            <span>by {entry.username}</span>
            <span style={{ fontStyle: "italic" }}>
              {formatTimeAgo(entry.completed_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RecentlyAuthoredParts;

