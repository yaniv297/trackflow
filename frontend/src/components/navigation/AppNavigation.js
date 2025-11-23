import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import NotificationIcon from "../notifications/NotificationIcon";
import NewDropdown from "./dropdowns/NewDropdown";
import StatsDropdown from "./dropdowns/StatsDropdown";
import AdminDropdown from "./dropdowns/AdminDropdown";
import UserDropdown from "./dropdowns/UserDropdown";
import OnlineUsersTooltip from "./OnlineUsersTooltip";

/**
 * Main navigation bar component
 */
const AppNavigation = ({
  dropdowns,
  achievementPoints,
  onlineUsers,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <nav className="unified-nav">
      {/* Left side - Brand and Navigation */}
      <div className="nav-left">
        <div
          className="nav-brand"
          onClick={() => navigate("/wip")}
          style={{ cursor: "pointer" }}
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
          <NewDropdown
            show={dropdowns.showNewDropdown}
            onToggle={() => {
              dropdowns.setShowNewDropdown(!dropdowns.showNewDropdown);
              dropdowns.setShowAnalyticsDropdown(false);
              dropdowns.setShowAdminDropdown(false);
            }}
            buttonRef={dropdowns.newDropdownRef}
            position={dropdowns.newDropdownPos}
            onNavigate={navigate}
          />

          {/* Analytics Dropdown */}
          <StatsDropdown
            show={dropdowns.showAnalyticsDropdown}
            onToggle={() => {
              dropdowns.setShowAnalyticsDropdown(!dropdowns.showAnalyticsDropdown);
              dropdowns.setShowNewDropdown(false);
              dropdowns.setShowAdminDropdown(false);
            }}
            buttonRef={dropdowns.analyticsDropdownRef}
            position={dropdowns.analyticsDropdownPos}
            onNavigate={navigate}
          />

          {/* Admin Dropdown - Only show for admins */}
          {user?.is_admin && (
            <AdminDropdown
              show={dropdowns.showAdminDropdown}
              onToggle={() => {
                dropdowns.setShowAdminDropdown(!dropdowns.showAdminDropdown);
                dropdowns.setShowNewDropdown(false);
                dropdowns.setShowAnalyticsDropdown(false);
              }}
              buttonRef={dropdowns.adminDropdownRef}
              position={dropdowns.adminDropdownPos}
              onNavigate={navigate}
            />
          )}
        </div>
      </div>

      {/* Right side - User info and controls */}
      <div className="nav-right">
        {/* User info */}
        <div className="nav-user-info">
          <span className="nav-username">{user?.username}</span>
          
          {user?.is_admin && (
            <OnlineUsersTooltip
              onlineUserCount={onlineUsers.onlineUserCount}
              onlineUsers={onlineUsers.onlineUsers}
              showTooltip={onlineUsers.showOnlineTooltip}
              onShowTooltip={onlineUsers.setShowOnlineTooltip}
              tooltipRef={onlineUsers.onlineTooltipRef}
              tooltipPos={onlineUsers.onlineTooltipPos}
            />
          )}
          
          <div
            className="nav-points"
            onClick={() => navigate("/achievements")}
            style={{
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
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
        <UserDropdown
          show={dropdowns.showUserDropdown}
          onToggle={() => {
            dropdowns.setShowUserDropdown(!dropdowns.showUserDropdown);
            dropdowns.setShowNewDropdown(false);
            dropdowns.setShowAnalyticsDropdown(false);
            dropdowns.setShowAdminDropdown(false);
          }}
          buttonRef={dropdowns.userDropdownRef}
          position={dropdowns.userDropdownPos}
          onNavigate={navigate}
          onLogout={onLogout}
        />
      </div>
    </nav>
  );
};

export default AppNavigation;

