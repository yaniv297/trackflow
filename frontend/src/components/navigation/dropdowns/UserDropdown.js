import React from "react";

/**
 * User dropdown component (Settings, Help, Logout, etc.)
 */
const UserDropdown = ({
  show,
  onToggle,
  buttonRef,
  position,
  onNavigate,
  onLogout,
}) => {
  const handleClick = (path) => {
    if (path === "logout") {
      onLogout();
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
            onClick={() => handleClick("/settings")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            User Settings
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
            onClick={() => handleClick("/feature-requests")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Feature Requests
          </div>
          <div
            onClick={() => handleClick("/bug-report")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Report a Bug
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
            onClick={() => handleClick("/help")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Help
          </div>
          <div
            onClick={() => handleClick("logout")}
            style={{
              ...dropdownItemStyle,
              color: "#dc3545",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#fff5f5")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Logout
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;

