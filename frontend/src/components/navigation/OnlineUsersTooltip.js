import React from "react";
import { useUserProfilePopup } from "../../hooks/ui/useUserProfilePopup";
import UserProfilePopup from "../shared/UserProfilePopup";

/**
 * Component for displaying online users tooltip (admin only)
 */
const OnlineUsersTooltip = ({
  onlineUserCount,
  onlineUsers,
  showTooltip,
  onShowTooltip,
  tooltipRef,
  tooltipPos,
}) => {
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();
  return (
    <span
      ref={tooltipRef}
      className="nav-online-users"
      style={{
        position: "relative",
        fontSize: "0.75rem",
        color: "rgba(255, 255, 255, 0.7)",
        cursor: "pointer",
        textDecoration: "underline",
        textDecorationStyle: "dotted",
      }}
      onMouseEnter={() => onShowTooltip(true)}
      onMouseLeave={() => onShowTooltip(false)}
    >
      {onlineUserCount !== null
        ? `${onlineUserCount} ${onlineUserCount === 1 ? "user" : "users"} online`
        : "Loading..."}
      {showTooltip && onlineUsers.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: `${tooltipPos.top}px`,
            right: `${tooltipPos.right}px`,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "6px",
            padding: "0.5rem 0.75rem",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 10001,
            minWidth: "150px",
            maxWidth: "250px",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "bold",
              marginBottom: "0.25rem",
              color: "#333",
            }}
          >
            Online Users:
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "#666",
            }}
          >
            {onlineUsers.map((username, idx) => (
              <div 
                key={idx}
                onClick={handleUsernameClick(username)}
                style={{ 
                  cursor: 'pointer',
                  padding: '2px 0',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#667eea'}
                onMouseLeave={(e) => e.target.style.color = '#666'}
                title="Click to view profile"
              >
                {username}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />
    </span>
  );
};

export default OnlineUsersTooltip;

