import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import SongPage from "./SongPage";
import WipPage from "./WipPage";
import NewSongForm from "./NewSongForm";
import NewPackForm from "./NewPackForm";
import StatsPage from "./StatsPage";
import AlbumSeriesPage from "./AlbumSeriesPage";
import NotificationManager from "./components/NotificationManager";
import ImportSpotifyPage from "./ImportSpotifyPage";
import "./App.css";

function App() {
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNewDropdown && !event.target.closest(".dropdown-container")) {
        setShowNewDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewDropdown]);

  const handleDropdownClick = (path) => {
    setShowNewDropdown(false);
    navigate(path);
  };

  return (
    <NotificationManager>
      <div className="app-container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h1>🎶 TrackFlow</h1>
        </div>
        <nav className="nav">
          <NavLink to="/future" activeclassname="active">
            Future
          </NavLink>
          <NavLink to="/wip" activeclassname="active">
            WIP
          </NavLink>
          <NavLink to="/released" activeclassname="active">
            Released
          </NavLink>

          {/* New Dropdown */}
          <div
            className="dropdown-container"
            style={{ position: "relative", display: "inline-block" }}
          >
            <button
              onClick={() => setShowNewDropdown(!showNewDropdown)}
              style={{
                background: showNewDropdown ? "#007bff" : "#f3f3f3",
                color: showNewDropdown ? "white" : "#333",
                border: "none",
                borderRadius: "6px",
                padding: "0.5rem 1.2rem",
                fontWeight: "bold",
                fontSize: "1.05rem",
                cursor: "pointer",
                transition: "background 0.2s, color 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              ➕ New
              <span style={{ fontSize: "0.8rem" }}>▼</span>
            </button>

            {showNewDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "0",
                  right: "0",
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  marginTop: "0.5rem",
                  overflow: "hidden",
                }}
              >
                <div
                  onClick={() => handleDropdownClick("/new")}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.75rem 1rem",
                    color: "#333",
                    borderBottom: "1px solid #eee",
                    transition: "background 0.2s",
                    cursor: "pointer",
                    fontSize: "inherit",
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
                  onMouseLeave={(e) =>
                    (e.target.style.background = "transparent")
                  }
                >
                  Song
                </div>
                <div
                  onClick={() => handleDropdownClick("/pack")}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.75rem 1rem",
                    color: "#333",
                    transition: "background 0.2s",
                    cursor: "pointer",
                    fontSize: "inherit",
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
                  onMouseLeave={(e) =>
                    (e.target.style.background = "transparent")
                  }
                >
                  Pack
                </div>
                <div
                  onClick={() => handleDropdownClick("/import-spotify")}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.75rem 1rem",
                    color: "#333",
                    transition: "background 0.2s",
                    cursor: "pointer",
                    fontSize: "inherit",
                  }}
                  onMouseEnter={(e) => (e.target.style.background = "#f8f9fa")}
                  onMouseLeave={(e) =>
                    (e.target.style.background = "transparent")
                  }
                >
                  Import from Spotify
                </div>
              </div>
            )}
          </div>

          <NavLink to="/album-series" activeclassname="active">
            Album Series
          </NavLink>
          <NavLink to="/stats" activeclassname="active">
            Stats
          </NavLink>
        </nav>

        <Routes>
          <Route path="/" element={<WipPage />} />
          <Route path="/future" element={<SongPage status="Future Plans" />} />
          <Route path="/wip" element={<WipPage />} />
          <Route path="/released" element={<SongPage status="Released" />} />
          <Route path="/new" element={<NewSongForm />} />
          <Route path="/pack" element={<NewPackForm />} />
          <Route path="/import-spotify" element={<ImportSpotifyPage />} />
          <Route path="/album-series" element={<AlbumSeriesPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="*" element={<WipPage />} />
        </Routes>
      </div>
    </NotificationManager>
  );
}

export default App;
