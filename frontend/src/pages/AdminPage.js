import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiPatch, apiDelete, apiPost } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import ActivityFeed from "../components/shared/ActivityFeed";
import RecentlyAuthoredParts from "../components/shared/RecentlyAuthoredParts";
import "./AdminPage.css";

function AdminPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchingImages, setFetchingImages] = useState(false);
  const [fetchLogs, setFetchLogs] = useState([]);
  const [fixingSongLinks, setFixingSongLinks] = useState(false);
  const [songLinkLogs, setSongLinkLogs] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: "last_login_at",
    direction: "desc",
  });
  const [showTools, setShowTools] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { updateAuth } = useAuth();

  // Determine current admin section from URL
  const currentSection = location.pathname === '/admin' ? 'dashboard' : 
                        location.pathname.split('/admin/')[1] || 'dashboard';

  useEffect(() => {
    if (currentSection === 'users' || currentSection === 'dashboard') {
      loadUsers();
    }
  }, [currentSection]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet("/admin/users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId, currentAdminStatus) => {
    if (
      !window.confirm(
        `Are you sure you want to ${
          currentAdminStatus ? "remove admin access from" : "grant admin access to"
        } this user?`
      )
    ) {
      return;
    }

    try {
      const result = await apiPatch(`/admin/users/${userId}/toggle-admin`);
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, is_admin: result.is_admin } : user
        )
      );
    } catch (err) {
      console.error("Failed to toggle admin status:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Network error occurred";
      alert(`Failed to toggle admin status: ${errorMessage}`);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (
      !window.confirm(
        `Are you sure you want to delete user "${username}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await apiDelete(`/admin/users/${userId}`);
      setUsers(users.filter((user) => user.id !== userId));
    } catch (err) {
      console.error("Failed to delete user:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Network error occurred";
      alert(`Failed to delete user: ${errorMessage}`);
    }
  };

  const handleImpersonate = async (userId, username) => {
    if (
      !window.confirm(
        `Are you sure you want to impersonate user "${username}"? You will be logged in as them.`
      )
    ) {
      return;
    }

    try {
      const currentToken = localStorage.getItem("token");
      localStorage.setItem("admin_token", currentToken);
      localStorage.setItem("impersonating", username);

      const response = await apiPost(`/admin/impersonate/${userId}`);
      await updateAuth(response.access_token, response.username);

      navigate("/wip");
    } catch (err) {
      console.error("Failed to impersonate user:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Network error occurred";
      alert(`Failed to impersonate user: ${errorMessage}`);
    }
  };

  const handleBroadcastNotification = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert("Please enter both title and message");
      return;
    }

    try {
      setSendingBroadcast(true);
      const response = await apiPost("/admin/broadcast-notification", {
        title: broadcastTitle,
        message: broadcastMessage,
      });

      alert(response.message);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setShowBroadcastForm(false);
    } catch (err) {
      console.error("Failed to send broadcast:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Network error occurred";
      alert(`Failed to send broadcast notification: ${errorMessage}`);
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Sorting logic
  const sortedUsers = React.useMemo(() => {
    if (!sortConfig.key) return users;

    return [...users].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null dates
      if (sortConfig.key.includes("_at")) {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [users, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="error-message">{error}</div>
        <button onClick={loadUsers}>Retry</button>
      </div>
    );
  }

  // Render admin navigation tabs
  const renderNavTabs = () => (
    <div className="admin-nav-tabs" style={{ 
      display: 'flex', 
      gap: '1rem', 
      marginBottom: '2rem',
      borderBottom: '2px solid #eee'
    }}>
      {[
        { id: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
        { id: 'users', label: 'Users', path: '/admin/users' },
        { id: 'release-posts', label: 'Release Posts', path: '/admin/release-posts' },
        { id: 'notifications', label: 'Notifications', path: '/admin/notifications' },
        { id: 'tools', label: 'Tools', path: '/admin/tools' }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => navigate(tab.path)}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: currentSection === tab.id ? '#007bff' : 'transparent',
            color: currentSection === tab.id ? 'white' : '#666',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: currentSection === tab.id ? '600' : '400',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
          onMouseEnter={(e) => {
            if (currentSection !== tab.id) {
              e.target.style.background = '#f8f9fa';
              e.target.style.color = '#333';
            }
          }}
          onMouseLeave={(e) => {
            if (currentSection !== tab.id) {
              e.target.style.background = 'transparent';
              e.target.style.color = '#666';
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderDashboard = () => (
    <div className="admin-dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Recent Activity */}
        <div className="admin-card">
          <h3>Activity Feed</h3>
          <ActivityFeed limit={5} />
        </div>

        {/* Recently Authored Parts */}
        <div className="admin-card">
          <h3>Parts Recently Authored</h3>
          <RecentlyAuthoredParts limit={12} />
        </div>
        
        {/* Quick Actions */}
        <div className="admin-card">
          <h3>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              onClick={() => navigate('/admin/release-posts')}
              className="admin-action-btn"
              style={{
                padding: '0.75rem 1rem',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Create Release Post
            </button>
            <button 
              onClick={() => navigate('/admin/notifications')}
              className="admin-action-btn"
              style={{
                padding: '0.75rem 1rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Send Notification
            </button>
            <button 
              onClick={() => navigate('/admin/users')}
              className="admin-action-btn"
              style={{
                padding: '0.75rem 1rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Manage Users
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="admin-users-section">
      {/* User Table */}
      <div className="users-table-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>User Management ({users.length} users)</h3>
          <button onClick={loadUsers} style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6', cursor: 'pointer' }} onClick={() => handleSort('username')}>
                  Username {sortConfig.key === 'username' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Songs</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Admin</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Active</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6', cursor: 'pointer' }} onClick={() => handleSort('last_login_at')}>
                  Last Login {sortConfig.key === 'last_login_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user, index) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>{user.username}</td>
                  <td style={{ padding: '1rem' }}>{user.email || 'N/A'}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{user.song_count || 0}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {user.is_admin ? (
                      <span style={{ color: '#dc3545', fontWeight: 'bold' }}>✓</span>
                    ) : (
                      <span style={{ color: '#6c757d' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {user.is_active ? (
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓</span>
                    ) : (
                      <span style={{ color: '#dc3545', fontWeight: 'bold' }}>✗</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#6c757d' }}>
                    {formatDate(user.last_login_at)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8rem',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: user.is_admin ? '#dc3545' : '#28a745',
                          color: 'white'
                        }}
                      >
                        {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => handleImpersonate(user.id, user.username)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8rem',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: '#6c757d',
                          color: 'white'
                        }}
                      >
                        Impersonate
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8rem',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: '#dc3545',
                          color: 'white'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReleasePosts = () => (
    <div className="admin-release-posts-section">
      <h3>Release Posts Management</h3>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Create and manage release announcements that appear on the home page.
      </p>
      <div className="coming-soon" style={{
        background: '#f8f9fa',
        padding: '3rem',
        borderRadius: '12px',
        textAlign: 'center',
        border: '2px dashed #dee2e6'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#6c757d' }}>UNDER CONSTRUCTION</div>
        <h4 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>Release Post Editor Coming Soon</h4>
        <p style={{ color: '#999' }}>
          The visual editor for creating and managing release posts is being built.
          <br />
          You can use the API endpoints at <code>/admin/release-posts</code> in the meantime.
        </p>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="admin-notifications-section">
      <h3>Broadcast Notifications</h3>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Send system-wide notifications to all active users.
      </p>
      
      <div className="broadcast-form" style={{
        background: '#f8f9fa',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Notification Title:
          </label>
          <input
            type="text"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
            placeholder="Enter notification title..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Message:
          </label>
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Enter notification message..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              fontSize: '1rem',
              resize: 'vertical'
            }}
          />
        </div>
        
        <button
          onClick={handleBroadcastNotification}
          disabled={sendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            background: sendingBroadcast ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sendingBroadcast ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
        </button>
      </div>
    </div>
  );

  const renderTools = () => (
    <div className="admin-tools-section">
      <h3>System Tools</h3>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Administrative tools and maintenance functions.
      </p>
      
      <div className="tools-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Activity Feed */}
        <div className="admin-card">
          <h4>Activity Feed</h4>
          <ActivityFeed limit={10} />
        </div>

        {/* Recently Authored Parts */}
        <div className="admin-card">
          <h4>Parts Recently Authored</h4>
          <RecentlyAuthoredParts limit={15} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p className="admin-subtitle">
          {currentSection === 'dashboard' && 'Overview and quick actions'}
          {currentSection === 'users' && 'Manage users and permissions'}
          {currentSection === 'release-posts' && 'Create and manage release announcements'}
          {currentSection === 'notifications' && 'Send system messages to users'}
          {currentSection === 'tools' && 'Maintenance and system tools'}
        </p>
      </div>
      
      {renderNavTabs()}
      
      {currentSection === 'dashboard' && renderDashboard()}
      {currentSection === 'users' && renderUsers()}
      {currentSection === 'release-posts' && renderReleasePosts()}
      {currentSection === 'notifications' && renderNotifications()}
      {currentSection === 'tools' && renderTools()}
    </div>
  );
}

export default AdminPage;