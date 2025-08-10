import React, { useState, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { apiGet, apiPut } from "./utils/api";
import "./UserSettings.css";

function UserSettings() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    preferred_contact_method: "",
    discord_username: "",
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
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (formData.preferred_contact_method === "email" && !formData.email.trim()) {
      if (window.showNotification) {
        window.showNotification("Email address is required when email is the preferred contact method", "error", 5000);
      }
      return;
    }
    
    if (formData.preferred_contact_method === "discord" && !formData.discord_username.trim()) {
      if (window.showNotification) {
        window.showNotification("Discord username is required when Discord is the preferred contact method", "error", 5000);
      }
      return;
    }
    
    setSaving(true);

    try {
      const response = await apiPut("/user-settings/me", formData);

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
        <div className="settings-section">
          <h2>Profile Information</h2>

          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="form-control form-control-small"
                required
              />
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
              <label htmlFor="discord_username">Discord Username</label>
              <input
                type="text"
                id="discord_username"
                name="discord_username"
                value={formData.discord_username}
                onChange={handleInputChange}
                className="form-control form-control-small"
                placeholder="username#1234"
              />
              <small className="form-text">
                Optional. Only used if Discord is your preferred contact method.
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
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
