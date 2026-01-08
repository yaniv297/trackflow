import React from "react";
import { useAuth } from "../../../contexts/AuthContext";

/**
 * User dropdown component (Profile, Settings, Help, Logout, etc.)
 */
const UserDropdown = ({
  show,
  onToggle,
  buttonRef,
  position,
  onNavigate,
  onLogout,
  isImpersonating,
  onExitImpersonation,
}) => {
  const { user } = useAuth();

  const handleClick = (path) => {
    if (path === "logout") {
      onLogout();
    } else if (path === "stop-impersonation") {
      onExitImpersonation();
    } else {
      onNavigate(path);
    }
  };

  const dropdownItemStyle = {
    display: "block",
    width: "100%",
    padding: "0.75rem 1rem",
    color: "#333",
    textDecoration: "none",
    transition: "background 0.2s",
    cursor: "pointer",
    fontSize: "0.9rem",
  };

  return (
    <div
      className="user-dropdown-container"
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        ref={buttonRef}
        onClick={onToggle}
        className="nav-settings-btn"
        style={{
          background: show ? "rgba(255,255,255,0.2)" : "transparent",
          color: "white",
          border: show ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
          borderRadius: "6px",
          padding: "0.4rem 0.8rem",
          cursor: "pointer",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          transition: "all 0.2s",
        }}
      >
        ⚙️
        <span style={{ fontSize: "0.7rem" }}>▼</span>
      </button>

      {show && (
        <div
          style={{
            position: "fixed",
            top: `${position.top}px`,
            right: `${position.right}px`,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10001,
            overflow: "hidden",
            minWidth: "150px",
          }}
        >
          <div
            onClick={() => handleClick(`/profile/${user?.username}`)}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Profile
          </div>
          <div
            onClick={() => handleClick("/settings")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Settings
          </div>
          <div
            onClick={() => handleClick("/settings/workflow")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Workflow Settings
          </div>
          <div
            onClick={() => handleClick("/contact")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Contact
          </div>
          <div
            onClick={() => handleClick(isImpersonating ? "stop-impersonation" : "logout")}
            style={{
              ...dropdownItemStyle,
              color: isImpersonating ? "#ff6b35" : "#dc3545",
            }}
            onMouseEnter={(e) => (e.target.style.background = isImpersonating ? "#fff0ed" : "#fff5f5")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            {isImpersonating ? "Stop Impersonating" : "Logout"}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
