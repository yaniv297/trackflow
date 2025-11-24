import React from "react";

/**
 * New dropdown component (Song, Pack, Import from Spotify)
 */
const NewDropdown = ({ show, onToggle, buttonRef, position, onNavigate }) => {
  const handleClick = (path) => {
    onNavigate(path);
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
        New
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
            onClick={() => handleClick("/new")}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              color: "#333",
              borderBottom: "1px solid #eee",
              transition: "background 0.2s",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Song
          </div>
          <div
            onClick={() => handleClick("/pack")}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              color: "#333",
              borderBottom: "1px solid #eee",
              transition: "background 0.2s",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Pack
          </div>
          <div
            onClick={() => handleClick("/import-spotify")}
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              color: "#333",
              transition: "background 0.2s",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
            onMouseLeave={(e) => (e.target.style.background = "transparent")}
          >
            Import from Spotify
          </div>
        </div>
      )}
    </div>
  );
};

export default NewDropdown;

