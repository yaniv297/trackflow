import React, { useState, useEffect } from "react";
import { apiGet } from "../../utils/api";

function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const ITEMS_PER_PAGE = 50;

  const loadActivities = async (offset = 0, append = false) => {
    try {
      setError(null);
      const data = await apiGet(`/admin/activity-feed?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      
      if (append) {
        setActivities(prev => [...prev, ...data]);
      } else {
        setActivities(data);
      }
      
      // If we got a full page, there might be more
      setHasMore(data.length === ITEMS_PER_PAGE);
      setCurrentOffset(offset);
    } catch (err) {
      console.error("Failed to load activities:", err);
      setError(err.message || "Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    loadActivities(currentOffset + ITEMS_PER_PAGE, true);
  };

  useEffect(() => {
    loadActivities(0, false);
    // Auto-refresh every 10 seconds (only refresh first page)
    const interval = setInterval(() => loadActivities(0, false), 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return <div style={{ padding: "1rem", color: "#666" }}>Loading activity feed...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "1rem", color: "#d32f2f" }}>
        Error loading activity feed: {error}
        <button onClick={loadActivities} style={{ marginLeft: "0.5rem" }}>
          Retry
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div style={{ padding: "1rem", color: "#666", fontStyle: "italic" }}>
        No activity yet.
      </div>
    );
  }

  return (
    <div>
      <div style={{ maxHeight: "600px", overflowY: "auto" }}>
        {activities.map((activity) => (
          <div
            key={activity.id}
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid #e4e7ec",
              fontSize: "0.95rem",
              lineHeight: "1.5",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 1, color: "#1f2933" }}>
                <span style={{ color: "#5a6a85", fontSize: "0.85rem" }}>
                  {formatTimestamp(activity.created_at)}:{" "}
                </span>
                {activity.description}
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div style={{ padding: "1rem", textAlign: "center" }}>
          <button
            onClick={loadMore}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#0d6efd",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Load More
          </button>
        </div>
      )}
      {activities.length > 0 && (
        <div style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", color: "#666", fontStyle: "italic" }}>
          Showing activities from the last 48 hours
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;

