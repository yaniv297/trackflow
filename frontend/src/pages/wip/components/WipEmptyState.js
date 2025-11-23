import React from "react";
import { Link } from "react-router-dom";

/**
 * Empty state component for WIP page when there are no songs
 */
const WipEmptyState = () => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "4rem 2rem",
        color: "#666",
      }}
    >
      <div
        style={{
          fontSize: "3rem",
          marginBottom: "1rem",
          opacity: 0.5,
        }}
      >
        🎬
      </div>
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          marginBottom: "0.5rem",
          color: "#333",
        }}
      >
        No songs in progress yet
      </h2>
      <p
        style={{
          fontSize: "1rem",
          marginBottom: "2rem",
          color: "#666",
        }}
      >
        Start working on a song to see it here!
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link
          to="/new"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#007bff",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: 500,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#0056b3")}
          onMouseLeave={(e) => (e.target.style.background = "#007bff")}
        >
          ➕ Add Song
        </Link>
        <Link
          to="/pack"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#28a745",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: 500,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#218838")}
          onMouseLeave={(e) => (e.target.style.background = "#28a745")}
        >
          📦 Create Pack
        </Link>
        <Link
          to="/import-spotify"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            background: "#6f42c1",
            color: "#fff",
            textDecoration: "none",
            borderRadius: "6px",
            fontWeight: 500,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#5a32a3")}
          onMouseLeave={(e) => (e.target.style.background = "#6f42c1")}
        >
          🎧 Import from Spotify
        </Link>
      </div>
    </div>
  );
};

export default WipEmptyState;

