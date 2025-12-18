import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Welcome Modal Component
 * 
 * One-time welcome popup that appears when users first enter Trackflow v2.0.
 * Features highlights of the new version and encourages users to enable
 * public WIP sharing for collaboration.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {Function} onClose - Callback when modal is dismissed
 */
const WelcomeModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleMakePublic = () => {
    onClose();
    navigate("/future");
  };

  const handleMaybeLater = () => {
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.18)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "2rem 1rem",
        overflowY: "auto",
        paddingTop: "2rem",
        paddingBottom: "2rem",
        boxSizing: "border-box",
      }}
      onClick={handleMaybeLater}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: window.innerWidth > 600 ? "2rem 2.5rem" : "1.5rem 1rem",
          width: "100%",
          minWidth: "320px",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          position: "relative",
          margin: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleMaybeLater}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "#666",
            padding: "0.5rem",
            borderRadius: "50%",
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <h2 style={{ 
            margin: "0 0 0.5rem 0", 
            color: "#333", 
            fontSize: "1.8rem",
            fontWeight: "bold" 
          }}>
            Welcome to Trackflow v2.0!
          </h2>
          <p style={{ 
            margin: "0", 
            color: "#666", 
            fontSize: "1rem",
            lineHeight: "1.4" 
          }}>
            Thank you for using Trackflow! Welcome to the new version of the website.
          </p>
        </div>

        {/* Feature highlights */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "1.2rem" 
        }}>
          {/* Public WIP Songs - Most Important */}
          <div style={{ 
            padding: "1rem", 
            background: "#f0f8ff", 
            borderRadius: "8px",
            border: "1px solid #b3d9ff"
          }}>
            <h3 style={{ 
              margin: "0 0 0.5rem 0", 
              color: "#1a5490", 
              fontSize: "1.1rem",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              Public WIP Songs
            </h3>
            <p style={{ 
              margin: "0 0 0.8rem 0", 
              color: "#2c5aa0", 
              fontSize: "0.9rem",
              lineHeight: "1.4"
            }}>
              As requested, you can now share your future plans and works-in-progress and discover what the community is working on. Browse the "Public WIP" page (under community menu) to find musical matches, explore others' WIP songs, and send collaboration requests to suggest yourself for projects!
            </p>
            <div style={{
              padding: "0.8rem",
              background: "#fff",
              borderRadius: "6px",
              border: "1px solid #d1ecf1"
            }}>
              <strong style={{ color: "#0c5460", fontSize: "0.9rem" }}>
                If you wish, we encourage you to make your Future Plans public to let others know what you're planning to work on. Non-released songs will still be private by default unless you make them public. 
              </strong>
            </div>
          </div>

          {/* Other Features */}
          <div style={{
            padding: "1rem",
            background: "#f9f9f9",
            borderRadius: "8px",
            border: "1px solid #e0e0e0"
          }}>
            <ul style={{
              margin: 0,
              paddingLeft: "1.2rem",
              color: "#666",
              fontSize: "0.9rem",
              lineHeight: "1.6"
            }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>New Homepage:</strong> We now have a community front page! Including: "Pick up where you left off" dashboard, collaboration invites, and quick access to features
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                <strong>Achievements & Leaderboards:</strong> You will now be rewarded for your work! Earn achievements, collect points and see how you rank in the community leaderboard.
              </li>
              <li style={{ marginBottom: "0" }}>
                <strong>New Notifications:</strong> Stay updated with collaboration requests, community activity, and important updates
              </li>
              <li style={{ marginBottom: "0" }}>
                And more new features waiting to be discovered!
              </li>
            </ul>
          </div>
        </div>

        {/* Footer message */}
        <div style={{ 
          textAlign: "left"
        }}>
          <p style={{ 
            margin: "0", 
            color: "#666", 
            fontSize: "0.9rem",
            lineHeight: "1.4"
          }}>
            Note: this is a major new design. I did my best to test it, but please be understanding if you encounter any issues. If you do, please report under the "help" menu. You're also very welcome to suggest new features you'd like to see under the "feature requests" page.
          </p>
        </div>

        {/* Action buttons */}
        <div style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          marginTop: "0.5rem",
        }}>
          <button
            onClick={handleMaybeLater}
            style={{
              padding: "0.8rem 1.5rem",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#f8f9fa",
              cursor: "pointer",
              fontSize: "0.95rem",
              color: "#666",
            }}
          >
            Maybe later
          </button>
          <button
            onClick={handleMakePublic}
            style={{
              padding: "0.8rem 1.5rem",
              border: "none",
              borderRadius: "8px",
              background: "#007bff",
              color: "white",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontWeight: "600",
            }}
          >
            Make my WIP public
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;