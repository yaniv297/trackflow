import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ui/ProtectedRoute";
import LoginForm from "../components/forms/LoginForm";
import RegistrationWizard from "../components/shared/RegistrationWizard";
import ForgotPassword from "../components/ForgotPassword";
import ResetPassword from "../components/ResetPassword";
import SongPage from "../pages/SongPage";
import WipPage from "../pages/wip/WipPage";
import NewSongForm from "../components/forms/NewSongForm";
import NewPackForm from "../components/forms/NewPackForm";
import StatsPage from "../pages/StatsPage";
import AlbumSeriesPage from "../pages/AlbumSeriesPage";
import Leaderboard from "../pages/Leaderboard";
import HomePage from "../pages/HomePage";
import ImportSpotifyPage from "../pages/ImportSpotifyPage";
import UserSettings from "../pages/UserSettings";
import WorkflowSettings from "../components/features/workflows/WorkflowSettings";
import HelpPage from "../pages/help/HelpPage";
import ContactPage from "../pages/ContactPage";
import BugReportPage from "../pages/BugReportPage";
import AdminPage from "../pages/AdminPage";
import FeatureRequestPage from "../pages/FeatureRequestPage";
import LatestReleasesPage from "../pages/LatestReleasesPage";
import AchievementsPage from "../pages/AchievementsPage";
import NotificationsPage from "../pages/NotificationsPage";
import CommunityPage from "../pages/CommunityPage";

/**
 * All application routes
 */
const AppRoutes = () => {
  return (
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
        path="/community"
        element={
          <ProtectedRoute>
            <CommunityPage />
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
  );
};

export default AppRoutes;

