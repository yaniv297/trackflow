import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiGet, apiPut } from "../utils/api";
import "./UserSettings.css";

function UserSettings() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    auto_spotify_fetch_enabled: true,
    default_public_sharing: false,
    show_instrument_difficulties: true,
    show_content_rating: false,
  });

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await apiGet("/user-settings/me");
      setFormData({
        // Explicitly convert to boolean - handle false, 0, null, undefined
        auto_spotify_fetch_enabled:
          response.auto_spotify_fetch_enabled === true ||
          response.auto_spotify_fetch_enabled === 1,
        default_public_sharing:
          response.default_public_sharing === true ||
          response.default_public_sharing === 1,
        // Default to true if not explicitly set to false
        show_instrument_difficulties:
          response.show_instrument_difficulties !== false &&
          response.show_instrument_difficulties !== 0,
        // Default to false (opt-in feature)
        show_content_rating:
          response.show_content_rating === true ||
          response.show_content_rating === 1,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      if (window.showNotification) {
        window.showNotification("Failed to load settings", "error", 5000);
      }
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        auto_spotify_fetch_enabled: formData.auto_spotify_fetch_enabled !== undefined 
          ? formData.auto_spotify_fetch_enabled 
          : true,
        default_public_sharing: formData.default_public_sharing !== undefined 
          ? formData.default_public_sharing 
          : false,
        show_instrument_difficulties: formData.show_instrument_difficulties !== undefined 
          ? formData.show_instrument_difficulties 
          : true,
        show_content_rating: formData.show_content_rating !== undefined 
          ? formData.show_content_rating 
          : false,
      };
      
      const response = await apiPut("/user-settings/me", payload);

      // Update the user context with new data
      if (updateUser && user) {
        updateUser({ ...user, ...response });
      } else if (updateUser) {
        updateUser(response);
      }

      if (window.showNotification) {
        window.showNotification("Settings saved successfully!", "success", 3000);
      }

      setSaving(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      if (window.showNotification) {
        window.showNotification(error.message || "Failed to save settings", "error", 5000);
      }
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-wrapper">
          <div className="settings-loading">
            <div className="settings-loading-spinner"></div>
            <span>Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-wrapper">
        <div className="settings-header">
          <h1>Settings</h1>
          <p>Configure how TrackFlow works for you</p>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-card">
            <div className="settings-card-header">
              <span className="settings-card-icon">🎵</span>
              <div>
                <h2>Song Defaults</h2>
                <p>Control how new songs are created and enhanced</p>
              </div>
            </div>

            <div className="settings-card-content">
              <label className="settings-toggle">
                <div className="toggle-content">
                  <span className="toggle-title">Auto-fetch Spotify metadata</span>
                  <span className="toggle-description">
                    Automatically enhance new songs with album art, release year, and other metadata from Spotify
                  </span>
                </div>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    name="auto_spotify_fetch_enabled"
                    checked={formData.auto_spotify_fetch_enabled}
                    onChange={handleInputChange}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>

              <label className="settings-toggle">
                <div className="toggle-content">
                  <span className="toggle-title">Make new songs public by default</span>
                  <span className="toggle-description">
                    New songs will be visible in Community WIP. You can still change individual songs to private.
                  </span>
                </div>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    name="default_public_sharing"
                    checked={formData.default_public_sharing}
                    onChange={handleInputChange}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <span className="settings-card-icon">🎸</span>
              <div>
                <h2>WIP Display Options</h2>
                <p>Customize what information you see on your Work In Progress songs</p>
              </div>
            </div>

            <div className="settings-card-content">
              <label className="settings-toggle">
                <div className="toggle-content">
                  <span className="toggle-title">Show instrument difficulties</span>
                  <span className="toggle-description">
                    Track difficulty ratings (0-5 dots + devil tier) for each instrument on WIP songs
                  </span>
                </div>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    name="show_instrument_difficulties"
                    checked={formData.show_instrument_difficulties}
                    onChange={handleInputChange}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>

              <label className="settings-toggle">
                <div className="toggle-content">
                  <span className="toggle-title">Show content rating</span>
                  <span className="toggle-description">
                    Set content ratings (Family Friendly, Supervision Recommended, or Mature) for each song
                  </span>
                </div>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    name="show_content_rating"
                    checked={formData.show_content_rating}
                    onChange={handleInputChange}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
            </div>
          </div>

          <div className="settings-actions">
            <button type="submit" disabled={saving} className="settings-save-btn">
              {saving ? (
                <>
                  <span className="btn-spinner"></span>
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserSettings;
