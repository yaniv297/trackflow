import React, { useState, useEffect } from "react";
import { apiGet } from "../utils/api";

const UserProfilePopup = ({ username, isVisible, position, onClose }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isVisible && username) {
      fetchUserProfile();
    }
  }, [isVisible, username]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet(`/user-settings/users/${username}/profile`);
      setUserProfile(response);
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  const getContactInfo = () => {
    if (!userProfile) return null;

    const { preferred_contact_method, discord_username, email } = userProfile;

    if (preferred_contact_method === "discord" && discord_username) {
      return {
        method: "Discord",
        value: discord_username,
        icon: "🎮",
        isClickable: true,
        url: `https://discord.com/users/@me`,
      };
    } else if (preferred_contact_method === "email" && email) {
      return {
        method: "Email",
        value: email,
        icon: "📧",
        isClickable: true,
        url: `mailto:${email}`,
      };
    }

    return null;
  };

  const contactInfo = getContactInfo();

  const handleContactClick = (contactInfo) => {
    if (contactInfo.method === "Discord") {
      // For Discord, we'll try to open the Discord app directly
      // Discord has URL schemes that can open the app
      try {
        // Copy username to clipboard
        navigator.clipboard.writeText(contactInfo.value).then(() => {
          // Open Discord in browser at the direct messages page
          window.open("https://discord.com/channels/@me", "_blank");

          // Show notification
          const notification = document.createElement("div");
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #7289da;
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 300px;
          `;
          notification.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 4px;">Discord Username Copied!</div>
            <div style="font-size: 12px; opacity: 0.9;">
              Username "${contactInfo.value}" copied to clipboard.<br>
              Opening Discord in browser...
            </div>
          `;
          document.body.appendChild(notification);

          // Remove notification after 4 seconds
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 4000);
        });
      } catch (err) {
        // Fallback if clipboard API is not available
        window.open("https://discord.com", "_blank");
        alert(
          `Discord username: ${contactInfo.value}\n\nCopy this username and add them as a friend on Discord.`
        );
      }
    } else if (contactInfo.method === "Email") {
      window.open(contactInfo.url, "_blank");
    }
  };

  return (
    <div
      data-popup="user-profile"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 1000,
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        padding: "16px",
        minWidth: "250px",
        maxWidth: "300px",
        fontSize: "14px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "12px" }}>
        <h3
          style={{
            margin: "0 0 4px 0",
            fontSize: "16px",
            fontWeight: "600",
            color: "#333",
          }}
        >
          {username}
        </h3>
        <div
          style={{
            fontSize: "12px",
            color: "#666",
            marginBottom: "8px",
          }}
        >
          User Profile
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          Loading...
        </div>
      )}

      {error && (
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            color: "#dc3545",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {userProfile && !loading && (
        <div>
          {/* Contact Information */}
          {contactInfo ? (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "4px",
                  fontWeight: "500",
                }}
              >
                Preferred Contact Method
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px",
                  backgroundColor: contactInfo.isClickable
                    ? "#f8f9fa"
                    : "#f8f9fa",
                  borderRadius: "4px",
                  fontSize: "13px",
                  cursor: contactInfo.isClickable ? "pointer" : "default",
                  transition: contactInfo.isClickable
                    ? "background-color 0.2s"
                    : "none",
                  border: contactInfo.isClickable
                    ? "1px solid #e9ecef"
                    : "1px solid transparent",
                }}
                onClick={() =>
                  contactInfo.isClickable && handleContactClick(contactInfo)
                }
                onMouseEnter={(e) => {
                  if (contactInfo.isClickable) {
                    e.target.style.backgroundColor = "#e9ecef";
                  }
                }}
                onMouseLeave={(e) => {
                  if (contactInfo.isClickable) {
                    e.target.style.backgroundColor = "#f8f9fa";
                  }
                }}
                title={
                  contactInfo.isClickable
                    ? `Click to open ${contactInfo.method}`
                    : undefined
                }
              >
                <span>{contactInfo.icon}</span>
                <span style={{ fontWeight: "500" }}>{contactInfo.method}:</span>
                <span
                  style={{
                    color: contactInfo.isClickable ? "#007bff" : "#007bff",
                    textDecoration: contactInfo.isClickable
                      ? "underline"
                      : "none",
                  }}
                >
                  {contactInfo.value}
                </span>
                {contactInfo.isClickable && (
                  <span style={{ fontSize: "10px", color: "#666" }}>
                    (click to open)
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "8px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                fontSize: "13px",
                color: "#666",
                textAlign: "center",
              }}
            >
              {userProfile.preferred_contact_method
                ? "No contact information available"
                : "No preferred contact method set"}
            </div>
          )}

          {/* Member Since */}
          {userProfile.created_at && (
            <div
              style={{
                fontSize: "12px",
                color: "#666",
                borderTop: "1px solid #eee",
                paddingTop: "8px",
              }}
            >
              Member since{" "}
              {new Date(userProfile.created_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "none",
          border: "none",
          fontSize: "18px",
          cursor: "pointer",
          color: "#999",
          padding: "0",
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title="Close"
      >
        ×
      </button>
    </div>
  );
};

export default UserProfilePopup;
