import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiGet } from "../../utils/api";
import "./UserDashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    suggestions: [],
    loading: true,
    error: null,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    generateWorkSuggestions();
  }, []);

  const generateWorkSuggestions = async () => {
    try {
      setDashboardData((prev) => ({ ...prev, loading: true }));
      const suggestions = await apiGet("/dashboard/suggestions?limit=6");
      setDashboardData({
        suggestions: suggestions || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setDashboardData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to load dashboard",
      }));
    }
  };

  if (dashboardData.loading) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your work...</p>
        </div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-error">
          <p>Unable to load your latest work</p>
          <button onClick={generateWorkSuggestions} className="retry-btn">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { suggestions } = dashboardData;

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>Pick up where you left off</h2>
          <div className="header-actions">
            <button
              className="refresh-btn"
              onClick={generateWorkSuggestions}
              title="Refresh to see different suggestions"
              disabled={dashboardData.loading}
              aria-label="Refresh suggestions"
            >
              <span className="refresh-icon">🔄</span>
            </button>
            <button
              className="collapse-toggle"
              onClick={() => setIsCollapsed(!isCollapsed)}
              aria-label={
                isCollapsed ? "Expand suggestions" : "Collapse suggestions"
              }
            >
              {isCollapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="suggestions-container">
          {suggestions.length > 0 ? (
            <div className="suggestions-list">
              {suggestions.slice(0, 6).map((suggestion) => {
                const title =
                  suggestion.title ||
                  suggestion.display_name ||
                  suggestion.name;
                const tags = suggestion.tags || [];
                const message = suggestion.message;
                const completion = suggestion.completion;
                const subtitle =
                  suggestion.type === "song"
                    ? suggestion.artist
                    : suggestion.type === "pack" &&
                      suggestion.completed_songs !== undefined &&
                      suggestion.total_songs !== undefined
                    ? `${suggestion.completed_songs}/${suggestion.total_songs} songs done`
                    : null;

                const handleClick = () => {
                  if (suggestion.type === "song" && suggestion.song_id) {
                    navigate(`/wip?song=${suggestion.song_id}`);
                  } else if (suggestion.type === "pack" && suggestion.pack_id) {
                    navigate(`/wip?pack=${suggestion.pack_id}`);
                  }
                };

                return (
                  <div
                    key={suggestion.id}
                    className="suggestion-item"
                    onClick={handleClick}
                  >
                    {suggestion.album_cover && (
                      <img
                        src={suggestion.album_cover}
                        alt={`${title} cover`}
                        className="suggestion-album-art"
                      />
                    )}
                    <div className="suggestion-content">
                      <div className="suggestion-main">
                        <h3 className="suggestion-title" title={title}>
                          {title}
                        </h3>
                        {subtitle && (
                          <p
                            className={
                              suggestion.type === "song"
                                ? "suggestion-artist"
                                : "suggestion-stats"
                            }
                          >
                            {subtitle}
                          </p>
                        )}
                        <div className="suggestion-tags">
                          {tags.map((tag, index) => (
                            <span key={index} className="suggestion-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {message && (
                          <p className="suggestion-parts">{message}</p>
                        )}
                      </div>
                    </div>
                    {typeof completion === "number" && (
                      <div className="suggestion-progress">
                        <div className="progress-circle-small">
                          <span>{Math.round(completion)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>No work suggestions available</p>
              <button onClick={() => navigate("/wip")} className="cta-btn">
                Start working
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
