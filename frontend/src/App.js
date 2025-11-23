import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ui/ProtectedRoute";
import LoginForm from "./components/forms/LoginForm";
import RegistrationWizard from "./components/shared/RegistrationWizard";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import SongPage from "./SongPage";
import WipPage from "./WipPage";
import NewSongForm from "./NewSongForm";
import NewPackForm from "./NewPackForm";
import StatsPage from "./StatsPage";
import AlbumSeriesPage from "./AlbumSeriesPage";
import Leaderboard from "./pages/Leaderboard";
import HomePage from "./pages/HomePage";
import NotificationManager from "./components/notifications/NotificationManager";
import NotificationIcon from "./components/notifications/NotificationIcon";
import ImportSpotifyPage from "./ImportSpotifyPage";
import UserSettings from "./UserSettings";
import WorkflowSettings from "./components/features/workflows/WorkflowSettings";
import HelpPage from "./HelpPage";
import ContactPage from "./ContactPage";
import BugReportPage from "./BugReportPage";
import AdminPage from "./AdminPage";
import FeatureRequestPage from "./FeatureRequestPage";
import LatestReleasesPage from "./pages/LatestReleasesPage";
import AchievementsPage from "./AchievementsPage";
import NotificationsPage from "./NotificationsPage";
import { apiGet } from "./utils/api";
import { initializeAchievements } from "./utils/achievements";
import "./App.css";

const NEW_FEATURES_PROMO_END = new Date("2025-12-15T00:00:00Z").getTime();

function AppContent() {
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAnalyticsDropdown, setShowAnalyticsDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const newDropdownRef = useRef(null);
  const analyticsDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const adminDropdownRef = useRef(null);
  const [newDropdownPos, setNewDropdownPos] = useState({ top: 0, left: 0 });
  const [analyticsDropdownPos, setAnalyticsDropdownPos] = useState({ top: 0, left: 0 });
  const [userDropdownPos, setUserDropdownPos] = useState({ top: 0, right: 0 });
  const [adminDropdownPos, setAdminDropdownPos] = useState({ top: 0, left: 0 });
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUsername, setImpersonatedUsername] = useState("");
  const [onlineUserCount, setOnlineUserCount] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showOnlineTooltip, setShowOnlineTooltip] = useState(false);
  const onlineTooltipRef = useRef(null);
  const [onlineTooltipPos, setOnlineTooltipPos] = useState({ top: 0, right: 0 });
  const [achievementPoints, setAchievementPoints] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated, loading, updateAuth } = useAuth();

  // Initialize achievement tracking when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeAchievements();
      fetchAchievementPoints();
    }
  }, [isAuthenticated, user]);

  // Fetch user's achievement points
  const fetchAchievementPoints = async () => {
    try {
      const achievements = await apiGet("/achievements/me");
      const totalPoints = achievements.reduce(
        (sum, ua) => sum + (ua.achievement?.points || 0),
        0
      );
      setAchievementPoints(totalPoints);
    } catch (error) {
      console.error("Failed to fetch achievement points:", error);
    }
  };

  // Update points when achievements are earned
  useEffect(() => {
    const handleAchievementUpdate = () => {
      if (isAuthenticated && user) {
        fetchAchievementPoints();
      }
    };

    window.addEventListener('achievement-earned', handleAchievementUpdate);
    window.addEventListener('achievements-updated', handleAchievementUpdate);
    
    return () => {
      window.removeEventListener('achievement-earned', handleAchievementUpdate);
      window.removeEventListener('achievements-updated', handleAchievementUpdate);
    };
  }, [isAuthenticated, user]);

  // Check if we're impersonating
  useEffect(() => {
    const checkImpersonation = () => {
      const impersonating = localStorage.getItem("impersonating");
      if (impersonating) {
        setIsImpersonating(true);
        setImpersonatedUsername(impersonating);
      } else {
        setIsImpersonating(false);
        setImpersonatedUsername("");
      }
    };
    
    checkImpersonation();
    
    // Check again after a short delay to ensure localStorage is updated
    const timeout = setTimeout(checkImpersonation, 100);
    
    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === "impersonating" || e.key === null) {
        checkImpersonation();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, isAuthenticated]);

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
      if (showAnalyticsDropdown && !event.target.closest(".dropdown-container")) {
        setShowAnalyticsDropdown(false);
      }
      if (showAdminDropdown && !event.target.closest(".dropdown-container")) {
        setShowAdminDropdown(false);
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
  }, [showNewDropdown, showAnalyticsDropdown, showAdminDropdown, showUserDropdown]);

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

    const createHandler = (e) => {
      const { artistName, albumName, status, skipNavigation } = e.detail || {};

      // Check if we should skip navigation (when called from NewPackForm)
      if (skipNavigation) {
        const modalEvent = new CustomEvent("open-create-album-series-modal", {
          detail: { artistName, albumName, status },
        });
        window.dispatchEvent(modalEvent);
        return;
      }

      // Only navigate to WIP page if we're not already there
      if (window.location.pathname !== "/wip") {
        navigate("/wip");
        // Use setTimeout to ensure navigation completes before opening modal
        setTimeout(() => {
          const modalEvent = new CustomEvent("open-create-album-series-modal", {
            detail: { artistName, albumName, status },
          });
          window.dispatchEvent(modalEvent);
        }, 100);
      } else {
        // If already on WIP page, open modal immediately
        const modalEvent = new CustomEvent("open-create-album-series-modal", {
          detail: { artistName, albumName, status },
        });
        window.dispatchEvent(modalEvent);
      }
    };

    window.addEventListener("open-create-album-series", createHandler);

    return () => {
      window.removeEventListener("open-create-album-series", createHandler);
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

  // Calculate dropdown positions when they open
  useEffect(() => {
    if (showNewDropdown && newDropdownRef.current) {
      const rect = newDropdownRef.current.getBoundingClientRect();
      setNewDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showNewDropdown]);

  useEffect(() => {
    if (showAnalyticsDropdown && analyticsDropdownRef.current) {
      const rect = analyticsDropdownRef.current.getBoundingClientRect();
      setAnalyticsDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showAnalyticsDropdown]);

  useEffect(() => {
    if (showAdminDropdown && adminDropdownRef.current) {
      const rect = adminDropdownRef.current.getBoundingClientRect();
      setAdminDropdownPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [showAdminDropdown]);

  useEffect(() => {
    if (showOnlineTooltip && onlineTooltipRef.current) {
      const rect = onlineTooltipRef.current.getBoundingClientRect();
      setOnlineTooltipPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [showOnlineTooltip]);

  useEffect(() => {
    if (showUserDropdown && userDropdownRef.current) {
      const rect = userDropdownRef.current.getBoundingClientRect();
      setUserDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [showUserDropdown]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleExitImpersonation = async () => {
    const adminToken = localStorage.getItem("admin_token");
    if (adminToken) {
      // Restore admin token
      localStorage.setItem("token", adminToken);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("impersonating");

      // Update auth context and navigate
      await updateAuth(adminToken, null);
      navigate("/admin");
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
            <span>Impersonating: {impersonatedUsername}</span>
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
        {isAuthenticated && !loading && (
          <nav className="unified-nav">
            {/* Left side - Brand and Navigation */}
            <div className="nav-left">
              <div 
                className="nav-brand" 
                onClick={() => navigate('/wip')}
                style={{ cursor: 'pointer' }}
              >
                TrackFlow
              </div>
              <div className="nav-links">
                <NavLink to="/" activeclassname="active">
                  Home
                </NavLink>
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
                    ref={newDropdownRef}
                    onClick={() => {
                      setShowNewDropdown(!showNewDropdown);
                      setShowAnalyticsDropdown(false);
                      setShowAdminDropdown(false);
                    }}
                    className="nav-dropdown-btn"
                    style={{
                      background: showNewDropdown ? "rgba(255,255,255,0.2)" : "transparent",
                      color: "white",
                      border: showNewDropdown ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
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

                  {showNewDropdown && (
                    <div
                      style={{
                        position: "fixed",
                        top: `${newDropdownPos.top}px`,
                        left: `${newDropdownPos.left}px`,
                        background: "white",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        zIndex: 10001,
                        overflow: "hidden",
                        minWidth: "180px",
                        whiteSpace: "nowrap"
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

                {/* Analytics Dropdown */}
                <div
                  className="dropdown-container"
                  style={{ position: "relative", display: "inline-block" }}
                >
                  <button
                    ref={analyticsDropdownRef}
                    onClick={() => {
                      setShowAnalyticsDropdown(!showAnalyticsDropdown);
                      setShowNewDropdown(false);
                      setShowAdminDropdown(false);
                    }}
                    className="nav-dropdown-btn"
                    style={{
                      background: showAnalyticsDropdown ? "rgba(255,255,255,0.2)" : "transparent",
                      color: "white",
                      border: showAnalyticsDropdown ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
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
                    Stats
                    <span style={{ fontSize: "0.7rem" }}>▼</span>
                  </button>

                  {showAnalyticsDropdown && (
                    <div
                      style={{
                        position: "fixed",
                        top: `${analyticsDropdownPos.top}px`,
                        left: `${analyticsDropdownPos.left}px`,
                        background: "white",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        zIndex: 10001,
                        overflow: "hidden",
                        minWidth: "150px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <div
                        onClick={() => {
                          setShowAnalyticsDropdown(false);
                          navigate("/achievements");
                        }}
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
                        onMouseEnter={(e) =>
                          (e.target.style.background = "#f8f9fa")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "transparent")
                        }
                      >
                        Achievements
                      </div>
                      <div
                        onClick={() => {
                          setShowAnalyticsDropdown(false);
                          navigate("/stats");
                        }}
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
                        onMouseEnter={(e) =>
                          (e.target.style.background = "#f8f9fa")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "transparent")
                        }
                      >
                        Stats
                      </div>
                      <div
                        onClick={() => {
                          setShowAnalyticsDropdown(false);
                          navigate("/album-series");
                        }}
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
                        onMouseEnter={(e) =>
                          (e.target.style.background = "#f8f9fa")
                        }
                        onMouseLeave={(e) =>
                          (e.target.style.background = "transparent")
                        }
                      >
                        Album Series
                      </div>
                      <div
                        onClick={() => {
                          setShowAnalyticsDropdown(false);
                          navigate("/leaderboard");
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "0.75rem 1rem",
                          color: "#333",
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
                        Leaderboard
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Dropdown - Only show for admins */}
                {user?.is_admin && (
                  <div
                    className="dropdown-container"
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <button
                      ref={adminDropdownRef}
                      onClick={() => {
                        setShowAdminDropdown(!showAdminDropdown);
                        setShowNewDropdown(false);
                        setShowAnalyticsDropdown(false);
                      }}
                      className="nav-dropdown-btn"
                      style={{
                        background: showAdminDropdown ? "rgba(255,255,255,0.2)" : "transparent",
                        color: "white",
                        border: showAdminDropdown ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
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
                      Admin
                      <span style={{ fontSize: "0.7rem" }}>▼</span>
                    </button>

                    {showAdminDropdown && (
                      <div
                        style={{
                          position: "fixed",
                          top: `${adminDropdownPos.top}px`,
                          left: `${adminDropdownPos.left}px`,
                          background: "white",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          zIndex: 10001,
                          overflow: "hidden",
                          minWidth: "180px",
                          whiteSpace: "nowrap"
                        }}
                      >
                        <div
                          onClick={() => {
                            setShowAdminDropdown(false);
                            navigate("/admin/dashboard");
                          }}
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
                          onMouseEnter={(e) =>
                            (e.target.style.background = "#f8f9fa")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.background = "transparent")
                          }
                        >
                          Dashboard
                        </div>
                        <div
                          onClick={() => {
                            setShowAdminDropdown(false);
                            navigate("/admin/users");
                          }}
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
                          onMouseEnter={(e) =>
                            (e.target.style.background = "#f8f9fa")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.background = "transparent")
                          }
                        >
                          Users
                        </div>
                        <div
                          onClick={() => {
                            setShowAdminDropdown(false);
                            navigate("/admin/release-posts");
                          }}
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
                          onMouseEnter={(e) =>
                            (e.target.style.background = "#f8f9fa")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.background = "transparent")
                          }
                        >
                          Release Posts
                        </div>
                        <div
                          onClick={() => {
                            setShowAdminDropdown(false);
                            navigate("/admin/notifications");
                          }}
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
                          onMouseEnter={(e) =>
                            (e.target.style.background = "#f8f9fa")
                          }
                          onMouseLeave={(e) =>
                            (e.target.style.background = "transparent")
                          }
                        >
                          Notifications
                        </div>
                        <div
                          onClick={() => {
                            setShowAdminDropdown(false);
                            navigate("/admin/tools");
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "0.75rem 1rem",
                            color: "#333",
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
                          Tools
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - User info and controls */}
            <div className="nav-right">
              {/* User info */}
              <div className="nav-user-info">
                <span className="nav-username">
                  {user?.username}
                </span>
                {user?.is_admin && (
                  <span
                    ref={onlineTooltipRef}
                    className="nav-online-users"
                    style={{
                      position: "relative",
                      fontSize: "0.75rem",
                      color: "rgba(255, 255, 255, 0.7)",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textDecorationStyle: "dotted",
                    }}
                    onMouseEnter={() => setShowOnlineTooltip(true)}
                    onMouseLeave={() => setShowOnlineTooltip(false)}
                  >
                    {onlineUserCount !== null ? `${onlineUserCount} ${onlineUserCount === 1 ? "user" : "users"} online` : "Loading..."}
                    {showOnlineTooltip && onlineUsers.length > 0 && (
                      <div
                        style={{
                          position: "fixed",
                          top: `${onlineTooltipPos.top}px`,
                          right: `${onlineTooltipPos.right}px`,
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
                            <div key={idx}>{username}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </span>
                )}
                <div 
                  className="nav-points" 
                  onClick={() => navigate('/achievements')}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                  title="View achievements"
                >
                  <span style={{ fontSize: "0.8rem" }}>⭐</span>
                  <span className="points-value">
                    {achievementPoints.toLocaleString()}
                  </span>
                  <span className="points-label">pts</span>
                </div>
              </div>


              {/* Notification Icon */}
              <NotificationIcon />

              {/* User Dropdown */}
              <div
                className="user-dropdown-container"
                style={{ position: "relative", display: "inline-block" }}
              >
                <button
                  ref={userDropdownRef}
                  onClick={() => {
                    setShowUserDropdown(!showUserDropdown);
                    setShowNewDropdown(false);
                    setShowAnalyticsDropdown(false);
                    setShowAdminDropdown(false);
                  }}
                  className="nav-settings-btn"
                  style={{
                    background: showUserDropdown ? "rgba(255,255,255,0.2)" : "transparent",
                    color: "white",
                    border: showUserDropdown ? "1px solid rgba(255,255,255,0.3)" : "1px solid transparent",
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

                {showUserDropdown && (
                  <div
                    style={{
                      position: "fixed",
                      top: `${userDropdownPos.top}px`,
                      right: `${userDropdownPos.right}px`,
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
                        navigate("/help");
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
                      Help
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
          </nav>
        )}

        <div className="main-content">
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegistrationWizard />} />
          <Route path="/releases" element={<LatestReleasesPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/wip"
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
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
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
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
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
            path="/admin/dashboard"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/release-posts"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tools"
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
