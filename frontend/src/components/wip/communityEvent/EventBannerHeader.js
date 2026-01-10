import React from "react";

const EventBannerHeader = ({ event, expanded, onToggle }) => {
  return (
    <div className="event-banner-header" onClick={onToggle}>
      <div className="event-banner-title-section">
        <span className="event-icon">🎪</span>
        <h2 className="event-theme">{event.event_theme}</h2>
        <span
          className={`event-status-badge ${
            event.status === "active" ? "active" : "ended"
          }`}
        >
          {event.status === "active" ? "🟢 Active" : "🟡 Ended"}
        </span>
      </div>

      <div className="event-banner-stats">
        <div className="event-stat">
          <span className="event-stat-value">{event.participants_count || 0}</span>
          <span className="event-stat-label">participants</span>
        </div>
        <div className="event-stat">
          <span className="event-stat-value">{event.in_progress_count || 0}</span>
          <span className="event-stat-label">in progress</span>
        </div>
        <div className="event-stat">
          <span className="event-stat-value">{event.done_count || 0}</span>
          <span className="event-stat-label">done</span>
        </div>
        <div className="event-stat">
          <span className="event-stat-value">{event.submitted_count || 0}</span>
          <span className="event-stat-label">submitted</span>
        </div>
        <button
          className={`expand-toggle ${expanded ? "expanded" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {expanded ? "Collapse" : "Expand"}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default EventBannerHeader;

