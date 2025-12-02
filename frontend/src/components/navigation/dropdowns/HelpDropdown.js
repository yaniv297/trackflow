import React from "react";

/**
 * Help dropdown component
 */
const HelpDropdown = ({ show, onToggle, buttonRef, position, onNavigate }) => {
  const handleClick = (path) => {
    onNavigate(path);
  };

  const dropdownItemStyle = {
    display: "block",
    width: "100%",
    padding: "0.75rem 1rem",
    color: "#333",
    transition: "background 0.2s",
    cursor: "pointer",
    fontSize: "0.9rem",
  };

  return (
    <div
      className="dropdown-container"
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        ref={buttonRef}
        onClick={onToggle}
        className="nav-dropdown-btn"
        style={{
          background: show ? "rgba(255,255,255,0.2)" : "transparent",
          color: "white",
          border: show ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
          borderRadius: "6px",
          padding: "0.4rem 0.8rem",
          fontWeight: "600",
          fontSize: "0.9rem",
          cursor: "pointer",
          transition: "all 0.2s",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
        }}
      >
        Help
        <span style={{ fontSize: "0.7rem" }}>▼</span>
      </button>

      {show && (
        <div
          style={{
            position: "fixed",
            top: `${position.top}px`,
            left: `${position.left}px`,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10001,
            overflow: "hidden",
            minWidth: "180px",
            whiteSpace: "nowrap",
          }}
        >
          <div
            onClick={() => handleClick("/help")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            TrackFlow Help
          </div>
          <div
            onClick={() => handleClick("/resources")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Authoring Resources
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
            style={dropdownItemStyle}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Report a Bug
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpDropdown;