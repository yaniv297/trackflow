import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../utils/api";

const UserProfilePopup = ({ username, isVisible, position, onClose, onMouseEnter, onMouseLeave }) => {
  const navigate = useNavigate();
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
      const response = await apiGet(`/profiles/${username}`);
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
        minWidth: "300px",
        maxWidth: "320px",
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
          {/* Profile Image and Basic Info */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            {userProfile.profile_image_url && (
              <img
                src={userProfile.profile_image_url}
                alt={`${username}'s profile`}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  border: "1px solid #e9ecef",
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              {userProfile.display_name && userProfile.display_name !== username && (
                <div style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#333",
                  marginBottom: "2px",
                }}>
                  {userProfile.display_name}
                </div>
              )}
              {userProfile.website_url && (
                <a
                  href={userProfile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "12px",
                    color: "#007bff",
                    textDecoration: "none",
                    display: "block",
                  }}
                >
                  🔗 Website
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              fontSize: "12px",
            }}>
              <div style={{
                padding: "6px 8px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                textAlign: "center",
              }}>
                <div style={{ fontWeight: "600", color: "#007bff" }}>
                  {userProfile.achievement_score || 0}
                </div>
                <div style={{ color: "#666" }}>Achievement Score</div>
              </div>
              <div style={{
                padding: "6px 8px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                textAlign: "center",
              }}>
                <div style={{ fontWeight: "600", color: "#28a745" }}>
                  #{userProfile.leaderboard_rank || "N/A"}
                </div>
                <div style={{ color: "#666" }}>Leaderboard Rank</div>
              </div>
              <div style={{
                padding: "6px 8px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                textAlign: "center",
              }}>
                <div style={{ fontWeight: "600", color: "#6f42c1" }}>
                  {userProfile.released_songs ? userProfile.released_songs.length : 0}
                </div>
                <div style={{ color: "#666" }}>Released Songs</div>
              </div>
              <div style={{
                padding: "6px 8px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                textAlign: "center",
              }}>
                <div style={{ fontWeight: "600", color: "#fd7e14" }}>
                  {userProfile.public_wip_songs ? userProfile.public_wip_songs.length : 0}
                </div>
                <div style={{ color: "#666" }}>Public WIPs</div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {contactInfo && (
            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "4px",
                  fontWeight: "500",
                }}
              >
                Contact
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 8px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                  fontSize: "12px",
                  cursor: contactInfo.isClickable ? "pointer" : "default",
                  transition: "background-color 0.2s",
                  border: "1px solid #e9ecef",
                }}
                onClick={() =>
                  contactInfo.isClickable && handleContactClick(contactInfo)
                }
                onMouseEnter={(e) => {
                  if (contactInfo.isClickable) {
                    e.currentTarget.style.backgroundColor = "#e9ecef";
                  }
                }}
                onMouseLeave={(e) => {
                  if (contactInfo.isClickable) {
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }
                }}
                title={
                  contactInfo.isClickable
                    ? `Click to open ${contactInfo.method}`
                    : contactInfo.method
                }
              >
                <span>{contactInfo.icon}</span>
                <span style={{
                  color: contactInfo.isClickable ? "#007bff" : "#333",
                  textDecoration: "none",
                }}>
                  {contactInfo.value}
                </span>
              </div>
            </div>
          )}

          {/* View Full Profile Button */}
          <div style={{ marginTop: "12px" }}>
            <button
              onClick={() => {
                navigate(`/profile/${username}`);
                onClose();
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#0056b3";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#007bff";
              }}
            >
              View Full Profile
            </button>
          </div>

          {/* Member Since */}
          {userProfile.created_at && (
            <div
              style={{
                fontSize: "11px",
                color: "#666",
                borderTop: "1px solid #eee",
                paddingTop: "8px",
                marginTop: "12px",
                textAlign: "center",
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
