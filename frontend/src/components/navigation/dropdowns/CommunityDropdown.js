import React from "react";

/**
 * Community dropdown component
 */
const CommunityDropdown = ({ show, onToggle, buttonRef, position, onNavigate }) => {
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
        Community
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
            minWidth: "160px",
            whiteSpace: "nowrap",
          }}
        >
          <div
            onClick={() => handleClick("/collaboration-requests")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Collaboration Requests
          </div>
          <div
            onClick={() => handleClick("/releases")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Latest Releases
          </div>
          <div
            onClick={() => handleClick("/album-series")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Album Series
          </div>
          <div
            onClick={() => handleClick("/community/events")}
            style={{ ...dropdownItemStyle, borderBottom: "1px solid #eee" }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Community Events
          </div>
          <div
            onClick={() => handleClick("/leaderboard")}
            style={dropdownItemStyle}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Leaderboard
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityDropdown;