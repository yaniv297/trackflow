import React from "react";
import { useNavigate } from "react-router-dom";

const NotificationDropdown = ({
  notifications,
  loading,
  unreadCount,
  totalCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClose,
  position = { top: 0, right: 0 },
}) => {
  const navigate = useNavigate();

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    // Navigate based on notification type (notifications are already marked as read when dropdown opens)
    if (notification.type === "achievement_earned") {
      navigate("/achievements");
    } else if (
      notification.type === "comment_reply" ||
      notification.type === "feature_request_update"
    ) {
      if (notification.related_feature_request_id) {
        navigate("/feature-requests");
      }
    } else if (notification.type === "pack_release") {
      navigate("/releases");
    } else if (
      notification.type === "collab_song_progress" ||
      notification.type === "collab_song_status" ||
      notification.type === "collab_wip_assignments"
    ) {
      // Collaboration song notifications should deep-link to the WIP page for that song when possible
      if (notification.related_song_id) {
        navigate(`/wip?song=${notification.related_song_id}`);
      } else {
        navigate("/wip");
      }
    } else if (notification.type === "collaboration_request") {
      navigate("/collaboration-requests");
    } else if (notification.type === "collaboration_response") {
      navigate("/collaboration-requests");
    }

    onClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "achievement_earned":
        return "🏆";
      case "comment_reply":
        return "💬";
      case "feature_request_update":
        return "📋";
      case "pack_release":
        return "🎵";
      case "collab_song_progress":
        return "🎚️";
      case "collab_song_status":
        return "🎼";
      case "collab_wip_assignments":
        return "🤝";
      case "collaboration_request":
        return "🤝";
      case "collaboration_response":
        return "🤝";
      default:
        return "🔔";
    }
  };

  return (
    <div
      className="notification-dropdown"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        right: `${position.right}px`,
        width: "380px",
        maxWidth: "90vw",
        background: "white",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10001,
        maxHeight: "500px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f8f9fa",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>
          Notifications
          {totalCount > 0 && (
            <span
              style={{
                marginLeft: "0.5rem",
                color: "#666",
                fontSize: "0.9rem",
              }}
            >
              ({totalCount})
            </span>
          )}
        </h3>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
          Loading notifications...
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
          <span
            style={{
              fontSize: "2rem",
              display: "block",
              marginBottom: "0.5rem",
            }}
          >
            🔔
          </span>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>No notifications yet</p>
        </div>
      )}

      {/* Notifications list */}
      {!loading && notifications.length > 0 && (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            maxHeight: "400px",
          }}
        >
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
                backgroundColor: notification.is_read ? "white" : "#f8f9ff",
                transition: "background-color 0.2s",
                position: "relative",
                borderLeft: notification.is_read ? "none" : "3px solid #007bff",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f0f4ff";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = notification.is_read
                  ? "white"
                  : "#f8f9ff";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>
                  {getNotificationIcon(notification.type)}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: "normal",
                      fontSize: "0.9rem",
                      color: "#333",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {notification.title}
                  </div>

                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#666",
                      marginBottom: "0.5rem",
                      lineHeight: "1.3",
                    }}
                  >
                    {notification.message}
                  </div>

                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#999",
                    }}
                  >
                    <span>{formatTimeAgo(notification.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!loading && totalCount > 0 && (
        <div
          style={{
            padding: "0.75rem",
            borderTop: "1px solid #eee",
            background: "#f8f9fa",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {unreadCount > 0 && (
            <button
              onClick={() => {
                onMarkAllAsRead();
              }}
              style={{
                background: "none",
                border: "none",
                color: "#6c757d",
                cursor: "pointer",
                fontSize: "0.8rem",
                textDecoration: "underline",
              }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => {
              navigate("/notifications"); // Go to the full notifications page
              onClose();
            }}
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              fontSize: "0.9rem",
              textDecoration: "underline",
              marginLeft: "auto",
            }}
          >
            View all ({totalCount})
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
