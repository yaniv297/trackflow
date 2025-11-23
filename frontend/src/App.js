import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginForm from "./components/LoginForm";
import RegistrationWizard from "./components/RegistrationWizard";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import SongPage from "./SongPage";
import WipPage from "./WipPage";
import NewSongForm from "./NewSongForm";
import NewPackForm from "./NewPackForm";
import StatsPage from "./StatsPage";
import AlbumSeriesPage from "./AlbumSeriesPage";
import NotificationManager from "./components/NotificationManager";
import ImportSpotifyPage from "./ImportSpotifyPage";
import UserSettings from "./UserSettings";
import WorkflowSettings from "./components/WorkflowSettings";
import HelpPage from "./HelpPage";
import ContactPage from "./ContactPage";
import BugReportPage from "./BugReportPage";
import AdminPage from "./AdminPage";
import FeatureRequestPage from "./FeatureRequestPage";
import { apiGet } from "./utils/api";
import "./App.css";

const NEW_FEATURES_PROMO_END = new Date("2025-12-15T00:00:00Z").getTime();

function AppContent() {
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUsername, setImpersonatedUsername] = useState("");
  const [onlineUserCount, setOnlineUserCount] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlineTooltip, setShowOnlineTooltip] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated, loading, updateAuth } = useAuth();

  // Check if we're impersonating
  useEffect(() => {
    const impersonating = localStorage.getItem("impersonating");
    if (impersonating) {
      setIsImpersonating(true);
      setImpersonatedUsername(impersonating);
    } else {
      setIsImpersonating(false);
      setImpersonatedUsername("");
    }
  }, [user]);

  // Fetch online user count for admins
  useEffect(() => {
    if (!isAuthenticated || !user?.is_admin) {
      setOnlineUserCount(null);
      setOnlineUsers([]);
      return;
    }

    const fetchOnlineCount = async () => {
      try {
        const data = await apiGet("/admin/online-users");
        setOnlineUserCount(data.online_count);
        setOnlineUsers(data.online_users || []);
      } catch (error) {
        // Silently fail - don't show errors for this feature
        console.error("Failed to fetch online user count:", error);
      }
    };

    // Fetch immediately
    fetchOnlineCount();

    // Then poll every 30 seconds
    const interval = setInterval(fetchOnlineCount, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.is_admin]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNewDropdown && !event.target.closest(".dropdown-container")) {
        setShowNewDropdown(false);
      }
      if (
        showUserDropdown &&
        !event.target.closest(".user-dropdown-container")
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNewDropdown, showUserDropdown]);

  // After route changes, check if we should open the edit album series modal
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tf_open_edit_series");
      if (raw) {
        const detail = JSON.parse(raw);
        if (
          detail &&
          detail.packId &&
          detail.series &&
          detail.series.length > 0
        ) {
          const evt = new CustomEvent("open-edit-album-series", { detail });
          window.dispatchEvent(evt);
        }
        localStorage.removeItem("tf_open_edit_series");
      }
    } catch (_e) {}
  }, [location.pathname]);

  // Global event listeners for album series modals
  useEffect(() => {
    // console.log("Setting up global event listeners in App.js");

    const createHandler = (e) => {
      console.log(
        "Received open-create-album-series event in App.js",
        e.detail
      );
      console.log("Current pathname:", window.location.pathname);
      const { artistName, albumName, status, skipNavigation } = e.detail || {};

      // Check if we should skip navigation (when called from NewPackForm)
      if (skipNavigation) {
        console.log("Skipping navigation, opening modal immediately");
        const modalEvent = new CustomEvent("open-create-album-series-modal", {
          detail: { artistName, albumName, status },
        });
        window.dispatchEvent(modalEvent);
        return;
      }

      // Only navigate to WIP page if we're not already there
      if (window.location.pathname !== "/wip") {
        console.log("Navigating to WIP page");
        navigate("/wip");
        // Use setTimeout to ensure navigation completes before opening modal
        setTimeout(() => {
          const modalEvent = new CustomEvent("open-create-album-series-modal", {
            detail: { artistName, albumName, status },
          });
          window.dispatchEvent(modalEvent);
        }, 100);
      } else {
        console.log("Already on WIP page, opening modal immediately");
        // If already on WIP page, open modal immediately
        const modalEvent = new CustomEvent("open-create-album-series-modal", {
          detail: { artistName, albumName, status },
        });
        window.dispatchEvent(modalEvent);
      }
    };

    window.addEventListener("open-create-album-series", createHandler);
    // console.log("Global event listener registered in App.js");

    return () => {
      window.removeEventListener("open-create-album-series", createHandler);
      // console.log("Global event listener removed from App.js");
    };
  }, [navigate]);

  // One-time popup to announce new features
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const now = Date.now();
    if (now > NEW_FEATURES_PROMO_END) {
      return;
    }
    const key = `tf_new_features_popup_shown_${user.id || user.username}`;
    if (!localStorage.getItem(key)) {
      if (
        typeof window !== "undefined" &&
        typeof window.showNotification === "function"
      ) {
        window.showNotification(
          <span>
            🎉 <strong>New Features:</strong> Added song notes, column selection, forgot password, and various bug fixes!
          </span>,
          "success"
        );
      }
      localStorage.setItem(key, "true");
    }
  }, [isAuthenticated, user]);

  const handleDropdownClick = (path) => {
    setShowNewDropdown(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleExitImpersonation = async () => {
    const adminToken = localStorage.getItem("admin_token");
    if (adminToken) {
      // Restore admin token
      localStorage.setItem("token", adminToken);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("impersonating");

      // Update auth context and reload
      await updateAuth(adminToken, null);
      window.location.href = "/admin";
    }
  };

  return (
    <NotificationManager>
      <div className="app-container">
        {isImpersonating && (
          <div
            style={{
              background: "#ffc107",
              color: "#000",
              padding: "10px 20px",
              textAlign: "center",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "15px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <span>👤 Impersonating: {impersonatedUsername}</span>
            <button
              onClick={handleExitImpersonation}
              style={{
                background: "#333",
                color: "white",
                border: "none",
                padding: "6px 15px",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
              }}
            >
              Exit Impersonation
            </button>
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h1>🎶 TrackFlow</h1>
          {isAuthenticated && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <span style={{ color: "#666", fontSize: "0.9rem" }}>
                  Welcome, {user?.username}!
                </span>
                {user?.is_admin && onlineUserCount !== null && (
                  <div
                    style={{ position: "relative", display: "inline-block" }}
                    onMouseEnter={() => setShowOnlineTooltip(true)}
                    onMouseLeave={() => setShowOnlineTooltip(false)}
                  >
                    <span
                      style={{
                        color: "#888",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted",
                      }}
                    >
                      {onlineUserCount}{" "}
                      {onlineUserCount === 1 ? "user" : "users"} online
                    </span>
                    {showOnlineTooltip && onlineUsers.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          marginTop: "0.25rem",
                          background: "white",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          padding: "0.5rem 0.75rem",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          zIndex: 10000,
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
                        <div style={{ fontSize: "0.7rem", color: "#666" }}>
                          {onlineUsers.map((username, idx) => (
                            <div key={idx}>{username}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div
                className="user-dropdown-container"
                style={{ position: "relative", display: "inline-block" }}
              >
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  style={{
                    background: showUserDropdown ? "#007bff" : "#f8f9fa",
                    color: showUserDropdown ? "white" : "#333",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    padding: "0.5rem 1rem",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  ⚙️
                  <span style={{ fontSize: "0.8rem" }}>▼</span>
                </button>

                {showUserDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: "0",
                      background: "white",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      zIndex: 1000,
                      marginTop: "0.5rem",
                      overflow: "hidden",
                      minWidth: "150px",
                    }}
                  >
                    <div
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate("/settings");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        color: "#333",
                        textDecoration: "none",
                        borderBottom: "1px solid #eee",
                        transition: "background 0.2s",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      User Settings
                    </div>
                    <div
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate("/settings/workflow");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        color: "#333",
                        textDecoration: "none",
                        borderBottom: "1px solid #eee",
                        transition: "background 0.2s",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      Workflow Settings
                    </div>
                    <div
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate("/feature-requests");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        color: "#333",
                        textDecoration: "none",
                        borderBottom: "1px solid #eee",
                        transition: "background 0.2s",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      Feature Requests
                    </div>
                    <div
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate("/bug-report");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        color: "#333",
                        textDecoration: "none",
                        borderBottom: "1px solid #eee",
                        transition: "background 0.2s",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      Report a Bug
                    </div>
                    <div
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigate("/contact");
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        color: "#333",
                        textDecoration: "none",
                        borderBottom: "1px solid #eee",
                        transition: "background 0.2s",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#f8f9fa")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      Contact
                    </div>
                    <div
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.75rem 1rem",
                        color: "#dc3545",
                        textDecoration: "none",
                        transition: "background 0.2s",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.background = "#fff5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.background = "transparent")
                      }
                    >
                      Logout
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {isAuthenticated && !loading && (
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
                    onMouseEnter={(e) =>
                      (e.target.style.background = "#f8f9fa")
                    }
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
                    onMouseEnter={(e) =>
                      (e.target.style.background = "#f8f9fa")
                    }
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
                    onMouseEnter={(e) =>
                      (e.target.style.background = "#f8f9fa")
                    }
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
            <NavLink to="/help" activeclassname="active">
              Help
            </NavLink>
            {user?.is_admin && (
              <NavLink to="/admin" activeclassname="active">
                👑 Admin
              </NavLink>
            )}
          </nav>
        )}

        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegistrationWizard />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <WipPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/future"
            element={
              <ProtectedRoute>
                <SongPage status="Future Plans" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wip"
            element={
              <ProtectedRoute>
                <WipPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/released"
            element={
              <ProtectedRoute>
                <SongPage status="Released" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/new"
            element={
              <ProtectedRoute>
                <NewSongForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pack"
            element={
              <ProtectedRoute>
                <NewPackForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import-spotify"
            element={
              <ProtectedRoute>
                <ImportSpotifyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/album-series"
            element={
              <ProtectedRoute>
                <AlbumSeriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <UserSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/workflow"
            element={
              <ProtectedRoute>
                <WorkflowSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <HelpPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <ContactPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bug-report"
            element={
              <ProtectedRoute>
                <BugReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feature-requests"
            element={
              <ProtectedRoute>
                <FeatureRequestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <WipPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </NotificationManager>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
