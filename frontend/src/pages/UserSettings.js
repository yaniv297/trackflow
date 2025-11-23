import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiGet, apiPut } from "../utils/api";
import "./UserSettings.css";

function UserSettings() {
  const { updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const [formData, setFormData] = useState({
    email: "",
    preferred_contact_method: "",
    discord_username: "",
    auto_spotify_fetch_enabled: true,
  });

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await apiGet("/user-settings/me");
      setFormData({
        email: response.email || "",
        preferred_contact_method: response.preferred_contact_method || "",
        discord_username: response.discord_username || "",
        // Explicitly convert to boolean - handle false, 0, null, undefined
        auto_spotify_fetch_enabled: response.auto_spotify_fetch_enabled === true || response.auto_spotify_fetch_enabled === 1,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      // Show error notification using the global notification system
      if (window.showNotification) {
        window.showNotification("Failed to load user settings", "error", 5000);
      }
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (
      formData.preferred_contact_method === "email" &&
      !formData.email.trim()
    ) {
      if (window.showNotification) {
        window.showNotification(
          "Email address is required when email is the preferred contact method",
          "error",
          5000
        );
      }
      return;
    }

    if (
      formData.preferred_contact_method === "discord" &&
      !formData.discord_username.trim()
    ) {
      if (window.showNotification) {
        window.showNotification(
          "Discord username is required when Discord is the preferred contact method",
          "error",
          5000
        );
      }
      return;
    }

    setSaving(true);

    try {
      // Ensure auto_spotify_fetch_enabled is always included (even if false)
      const payload = {
        ...formData,
        auto_spotify_fetch_enabled: formData.auto_spotify_fetch_enabled !== undefined 
          ? formData.auto_spotify_fetch_enabled 
          : true
      };
      const response = await apiPut("/user-settings/me", payload);

      // Update the user context with new data
      if (updateUser) {
        updateUser(response);
      }

      // Show success notification using the global notification system
      if (window.showNotification) {
        window.showNotification(
          "Settings saved successfully!",
          "success",
          3000
        );
      }
    } catch (error) {
      console.error("Error saving user settings:", error);
      // Show error notification using the global notification system
      if (window.showNotification) {
        window.showNotification(
          error.message || "Failed to save settings",
          "error",
          5000
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="user-settings-container">
        <div className="loading">Loading user settings...</div>
      </div>
    );
  }

  return (
    <div className="user-settings-container">
      <div className="user-settings-header">
        <h1>User Settings</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <div className="user-settings-content">
        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>
          <button
            className={`settings-tab ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-section">
          <form onSubmit={handleSubmit} className="settings-form">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <>
                <h2>Profile Information</h2>
                <div className="form-group">
                  <label htmlFor="email">
                    Email Address
                    {formData.preferred_contact_method === "email" && (
                      <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>
                    )}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-control form-control-small"
                    required={formData.preferred_contact_method === "email"}
                    placeholder={
                      formData.preferred_contact_method === "email"
                        ? "Required when email is preferred"
                        : "Optional"
                    }
                  />
                  {formData.preferred_contact_method !== "email" && (
                    <small className="form-text">
                      Optional. Only required if email is your preferred contact
                      method.
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="preferred_contact_method">
                    Preferred Contact Method
                  </label>
                  <select
                    id="preferred_contact_method"
                    name="preferred_contact_method"
                    value={formData.preferred_contact_method}
                    onChange={handleInputChange}
                    className="form-control form-control-small"
                  >
                    <option value="">None</option>
                    <option value="email">Email</option>
                    <option value="discord">Discord</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="discord_username">
                    Discord Username
                    {formData.preferred_contact_method === "discord" && (
                      <span style={{ color: "#dc3545", marginLeft: "4px" }}>*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="discord_username"
                    name="discord_username"
                    value={formData.discord_username}
                    onChange={handleInputChange}
                    className="form-control form-control-small"
                    required={formData.preferred_contact_method === "discord"}
                    placeholder={
                      formData.preferred_contact_method === "discord"
                        ? "Required when Discord is preferred"
                        : "username#1234 (optional)"
                    }
                  />
                  {formData.preferred_contact_method !== "discord" && (
                    <small className="form-text">
                      Optional. Only required if Discord is your preferred contact
                      method.
                    </small>
                  )}
                </div>
              </>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <>
                <h2>Feature Settings</h2>
                <div className="form-group">
                  <label
                    htmlFor="auto_spotify_fetch_enabled"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="auto_spotify_fetch_enabled"
                      name="auto_spotify_fetch_enabled"
                      checked={formData.auto_spotify_fetch_enabled}
                      onChange={handleInputChange}
                      style={{ cursor: "pointer" }}
                    />
                    <span>Enable automatic Spotify metadata fetching</span>
                  </label>
                  <small className="form-text">
                    When enabled, new songs will automatically be enhanced with
                    Spotify metadata, album art, and release year. You can still
                    manually enhance songs even if this is disabled.
                  </small>
                </div>
                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {/* Show save button for all tabs */}
            <div className="form-actions">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
