import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import communityEventsService from "../services/communityEventsService";
import "./CommunityEventsPage.css";

const CommunityEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState({});
  const [eventSongs, setEventSongs] = useState({});

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const result = await communityEventsService.getEvents(true);
        if (result.success) {
          setEvents(result.data.events || []);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError("Failed to load community events");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const toggleEventExpansion = async (eventId) => {
    const isExpanded = expandedEvents[eventId];

    if (!isExpanded && !eventSongs[eventId]) {
      // Fetch songs for this event
      try {
        const result = await communityEventsService.getEventSongs(eventId);
        if (result.success) {
          setEventSongs((prev) => ({
            ...prev,
            [eventId]: result.data,
          }));
        }
      } catch (err) {
        console.error("Error fetching event songs:", err);
      }
    }

    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !isExpanded,
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEventStatus = (event) => {
    if (event.is_revealed) {
      return { label: "Revealed", className: "revealed" };
    }
    if (event.status === "active") {
      return { label: "Active", className: "active" };
    }
    return { label: "Ended", className: "ended" };
  };

  // Split events into active and past
  const activeEvents = events.filter((e) => e.status === "active");
  const pastEvents = events.filter((e) => e.status === "ended");

  if (loading) {
    return (
      <div className="community-events-page">
        <div className="events-loading">Loading community events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="community-events-page">
        <div className="events-empty">
          <div className="events-empty-icon">⚠️</div>
          <h3>Error Loading Events</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="community-events-page">
      <div className="community-events-header">
        <h1>Community Events</h1>
        <p>
          Special themed events where the community comes together to create
          amazing content.
        </p>
      </div>

      {/* Active Event Alert */}
      {activeEvents.length > 0 && (
        <div className="active-event-alert">
          <div className="active-event-alert-content">
            <span className="active-event-alert-icon">🔥</span>
            <div className="active-event-alert-text">
              <h3>Active Event: {activeEvents[0].event_theme}</h3>
              <p>Join now and contribute your song!</p>
            </div>
          </div>
          <Link to="/wip" className="active-event-alert-cta">
            🎵 Participate Now
          </Link>
        </div>
      )}

      {events.length === 0 ? (
        <div className="events-empty">
          <div className="events-empty-icon">📅</div>
          <h3>No Events Yet</h3>
          <p>Check back later for exciting community events!</p>
        </div>
      ) : (
        <div className="events-list">
          {activeEvents.length > 0 && (
            <div className="events-section">
              <h2>🟢 Active Events</h2>
              {activeEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  status={getEventStatus(event)}
                  isExpanded={expandedEvents[event.id]}
                  songs={eventSongs[event.id]}
                  onToggle={() => toggleEventExpansion(event.id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="events-section">
              <h2>📜 Past Events</h2>
              {pastEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  status={getEventStatus(event)}
                  isExpanded={expandedEvents[event.id]}
                  songs={eventSongs[event.id]}
                  onToggle={() => toggleEventExpansion(event.id)}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EventCard = ({ event, status, isExpanded, songs, onToggle, formatDate }) => {
  const getSongStatusClass = (song) => {
    if (song.is_event_submitted) return "uploaded";
    if (song.status === "Done") return "done";
    return "in-progress";
  };

  const getSongStatusLabel = (song) => {
    if (song.is_event_submitted) return "Uploaded";
    if (song.status === "Done") return "Done";
    return "In Progress";
  };

  return (
    <div className="event-card">
      {event.event_banner_url && (
        <img
          src={event.event_banner_url}
          alt={event.event_theme}
          className="event-card-banner"
        />
      )}

      <div className="event-card-content">
        <div className="event-card-header">
          <div className="event-card-title">
            <h3>{event.name}</h3>
            <span className="event-card-theme">{event.event_theme}</span>
          </div>
          <span className={`event-card-status ${status.className}`}>
            {status.label}
          </span>
        </div>

        {event.event_description && (
          <p className="event-card-description">{event.event_description}</p>
        )}

        <div className="event-card-meta">
          {event.event_end_date && (
            <div className="event-card-meta-item">
              <span>📅</span>
              <span className="event-card-meta-value">
                {event.status === "ended" ? "Ended" : "Deadline"}:{" "}
                {formatDate(event.event_end_date)}
              </span>
            </div>
          )}
          <div className="event-card-meta-item">
            <span>👥</span>
            <span className="event-card-meta-value">
              {event.registered_count + event.songs_count} participants
            </span>
          </div>
          <div className="event-card-meta-item">
            <span>🎵</span>
            <span className="event-card-meta-value">
              {event.songs_count} songs
            </span>
          </div>
          <div className="event-card-meta-item">
            <span>✅</span>
            <span className="event-card-meta-value">
              {event.submitted_count} submitted
            </span>
          </div>
          {event.organizer && (
            <div className="event-card-meta-item">
              <span>👤</span>
              <span className="event-card-meta-value">
                Organized by {event.organizer.display_name || event.organizer.username}
              </span>
            </div>
          )}
        </div>

        <div className="event-participants-section">
          <button
            className="event-participants-toggle"
            onClick={onToggle}
          >
            <span>
              {isExpanded ? "Hide" : "Show"} Submissions ({event.songs_count})
            </span>
            <span>{isExpanded ? "▲" : "▼"}</span>
          </button>

          {isExpanded && (
            <div className="event-participants-content">
              {songs && songs.length > 0 ? (
                <div className="event-songs-list">
                  {songs.map((song) => (
                    <div key={song.id} className="event-song-item">
                      {song.album_cover ? (
                        <img
                          src={song.album_cover}
                          alt={song.title}
                          className="event-song-cover"
                        />
                      ) : (
                        <div className="event-song-cover" />
                      )}

                      <div className="event-song-info">
                        <h4>{song.title}</h4>
                        <p>{song.artist}</p>
                        <span className="event-song-author">
                          by {song.display_name || song.username}
                        </span>
                      </div>

                      <span
                        className={`event-song-status ${getSongStatusClass(song)}`}
                      >
                        {getSongStatusLabel(song)}
                      </span>

                      {/* Show links if event is revealed and song is submitted */}
                      {event.is_revealed && song.is_event_submitted && (
                        <div className="event-song-links">
                          {song.rhythmverse_link && (
                            <a
                              href={song.rhythmverse_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="event-song-link"
                            >
                              🎮 Download
                            </a>
                          )}
                          {song.visualizer_link && (
                            <a
                              href={song.visualizer_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="event-song-link"
                            >
                              🎬 Visualizer
                            </a>
                          )}
                          {song.preview_link && (
                            <a
                              href={song.preview_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="event-song-link"
                            >
                              ▶️ Preview
                            </a>
                          )}
                        </div>
                      )}

                      {/* Show "Coming Soon" if not revealed */}
                      {!event.is_revealed && song.is_event_submitted && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "#718096",
                            fontStyle: "italic",
                          }}
                        >
                          Links revealed on {formatDate(event.event_end_date) || "reveal"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#718096", textAlign: "center" }}>
                  {songs === undefined ? "Loading..." : "No songs submitted yet"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityEventsPage;

