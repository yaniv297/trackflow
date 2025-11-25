import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import NotificationManager from "./components/notifications/NotificationManager";
import AppNavigation from "./components/navigation/AppNavigation";
import ImpersonationBanner from "./components/navigation/ImpersonationBanner";
import AppRoutes from "./routes/AppRoutes";
import { useAppDropdowns } from "./hooks/app/useAppDropdowns";
import { useAppAchievements } from "./hooks/app/useAppAchievements";
import { useAppImpersonation } from "./hooks/app/useAppImpersonation";
import { useAppOnlineUsers } from "./hooks/app/useAppOnlineUsers";
import { useAppEffects } from "./hooks/app/useAppEffects";
import "./App.css";

function AppContent() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading, updateAuth } = useAuth();

  // Dropdown management
  const dropdowns = useAppDropdowns();

  // Achievement points
  const { achievementPoints } = useAppAchievements(isAuthenticated, user);

  // Impersonation
  const { isImpersonating, impersonatedUsername } = useAppImpersonation(
    user,
    isAuthenticated
  );

  // Online users (admin only)
  const onlineUsers = useAppOnlineUsers(isAuthenticated, user);

  // Various app-level effects
  useAppEffects(isAuthenticated, user);

  const handleLogout = () => {
    // Clear auth state first
    logout();
    // Use window.location for a hard navigation that bypasses React Router protected routes
    window.location.href = "/";
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
          <ImpersonationBanner
            impersonatedUsername={impersonatedUsername}
            onExit={handleExitImpersonation}
          />
        )}

        {isAuthenticated && !loading && (
          <AppNavigation
            dropdowns={dropdowns}
            achievementPoints={achievementPoints}
            onlineUsers={onlineUsers}
            onLogout={handleLogout}
          />
        )}

        <div className="main-content">
          <AppRoutes />
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
