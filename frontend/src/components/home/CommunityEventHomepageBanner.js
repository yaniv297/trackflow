import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import communityEventsService from "../../services/communityEventsService";
import "./CommunityEventHomepageBanner.css";

const CommunityEventHomepageBanner = () => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveEvent = async () => {
      try {
        const result = await communityEventsService.getActiveEvents();
        if (result.success && result.data.length > 0) {
          setEvent(result.data[0]);
        }
      } catch (err) {
        console.error("Error fetching active event:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveEvent();
  }, []);

  // Don't render if loading or no active event
  if (loading || !event) {
    return null;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getParticipationText = () => {
    const stage = event.participation?.stage ?? 0;
    switch (stage) {
      case 0:
        return "Join now!";
      case 1:
        return "Add your song";
      case 2:
        return "Continue working";
      case 3:
        return "Submit your song";
      case 4:
        return "View your submission";
      default:
        return "Participate";
    }
  };

  return (
    <div className="community-event-homepage-banner">
      <div className="event-homepage-info">
        <span className="event-homepage-icon">🎪</span>
        <div className="event-homepage-text">
          <h3>Community Event: {event.event_theme}</h3>
          <p>
            {event.event_description?.slice(0, 100)}
            {event.event_description?.length > 100 ? "..." : ""}
          </p>
          {event.event_end_date && (
            <div className="event-homepage-deadline">
              ⏰ Deadline: {formatDate(event.event_end_date)}
            </div>
          )}
        </div>
      </div>

      <div className="event-homepage-stats">
        <div className="event-homepage-stat">
          <span className="event-homepage-stat-value">
            {event.participants_count || 0}
          </span>
          <span className="event-homepage-stat-label">Participants</span>
        </div>
        <div className="event-homepage-stat">
          <span className="event-homepage-stat-value">
            {event.in_progress_count || 0}
          </span>
          <span className="event-homepage-stat-label">In Progress</span>
        </div>
        <div className="event-homepage-stat">
          <span className="event-homepage-stat-value">
            {event.done_count || 0}
          </span>
          <span className="event-homepage-stat-label">Done</span>
        </div>
        <div className="event-homepage-stat">
          <span className="event-homepage-stat-value">
            {event.submitted_count || 0}
          </span>
          <span className="event-homepage-stat-label">Submitted</span>
        </div>
      </div>

      <Link to="/wip" className="event-homepage-cta">
        🎵 {getParticipationText()}
      </Link>
    </div>
  );
};

export default CommunityEventHomepageBanner;

