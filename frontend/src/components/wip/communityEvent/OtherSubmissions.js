import React, { useState, useEffect } from "react";
import communityEventsService from "../../../services/communityEventsService";
import { useAuth } from "../../../contexts/AuthContext";

const OtherSubmissions = ({ eventId, isRevealed }) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [songs, setSongs] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch songs and registrations only when expanded for the first time
  useEffect(() => {
    if (isExpanded && !hasFetched && eventId) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch both songs and registrations in parallel
          const [songsResult, registrationsResult] = await Promise.all([
            communityEventsService.getEventSongs(eventId),
            communityEventsService.getEventRegistrations(eventId),
          ]);

          if (songsResult.success) {
            // Include ALL songs (including current user's)
            setSongs(songsResult.data || []);
          } else {
            setError(songsResult.error);
          }

          if (registrationsResult.success) {
            // These are users who registered but don't have a song yet
            setRegisteredUsers(registrationsResult.data || []);
          }
        } catch (err) {
          setError("Failed to load participants");
        } finally {
          setLoading(false);
          setHasFetched(true);
        }
      };
      fetchData();
    }
  }, [isExpanded, hasFetched, eventId]);

  const getStatusBadge = (song) => {
    if (song.is_event_submitted) {
      return <span className="submission-status-badge ready">Ready</span>;
    }
    if (song.status === "Done") {
      return <span className="submission-status-badge done">Done</span>;
    }
    return <span className="submission-status-badge wip">In Progress</span>;
  };

  const totalParticipants = songs.length + registeredUsers.length;

  // Sort songs: current user first, then alphabetically
  const sortedSongs = [...songs].sort((a, b) => {
    if (a.user_id === user?.id) return -1;
    if (b.user_id === user?.id) return 1;
    return (a.username || "").localeCompare(b.username || "");
  });

  return (
    <div className="other-submissions-section">
      <button
        className="other-submissions-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="toggle-icon">{isExpanded ? "▼" : "▶"}</span>
        <span className="toggle-text">
          View All Participants{" "}
          {hasFetched && totalParticipants > 0 && `(${totalParticipants})`}
        </span>
      </button>

      {isExpanded && (
        <div className="other-submissions-content">
          {loading && (
            <div className="submissions-loading">Loading participants...</div>
          )}

          {error && <div className="submissions-error">{error}</div>}

          {!loading && !error && totalParticipants === 0 && (
            <div className="submissions-empty">
              No participants yet. Be the first to contribute!
            </div>
          )}

          {!loading && !error && totalParticipants > 0 && (
            <div className="submissions-list">
              {/* Songs - users who have added a song */}
              {sortedSongs.map((song) => (
                <div
                  key={`song-${song.id}`}
                  className={`submission-item ${song.user_id === user?.id ? "current-user" : ""}`}
                >
                  {song.album_cover ? (
                    <img
                      src={song.album_cover}
                      alt={song.title}
                      className="submission-album-cover"
                    />
                  ) : (
                    <div className="submission-album-cover placeholder">🎵</div>
                  )}
                  <div className="submission-info">
                    <span className="submission-title">{song.title}</span>
                    <span className="submission-artist">by {song.artist}</span>
                    <span className="submission-user">
                      — {song.user_id === user?.id ? "You" : song.username || "Unknown"}
                    </span>
                  </div>
                  <div className="submission-status">{getStatusBadge(song)}</div>
                  {isRevealed && song.rhythmverse_link && (
                    <a
                      href={song.rhythmverse_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="submission-link"
                    >
                      🎵 RhythmVerse
                    </a>
                  )}
                </div>
              ))}

              {/* Registered users - users who signed up but haven't added a song */}
              {registeredUsers.map((reg) => (
                <div
                  key={`reg-${reg.id}`}
                  className={`submission-item registered-only ${reg.user_id === user?.id ? "current-user" : ""}`}
                >
                  <div className="submission-info">
                    <span className="submission-title no-song">No song yet</span>
                    <span className="submission-user">
                      — {reg.user_id === user?.id ? "You" : reg.username || "Unknown"}
                    </span>
                  </div>
                  <div className="submission-status">
                    <span className="submission-status-badge planning">Planning</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OtherSubmissions;
