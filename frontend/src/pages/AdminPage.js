import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiGet, apiDelete, apiPost, apiPut } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import ActivityFeed from "../components/shared/ActivityFeed";
import RecentlyAuthoredParts from "../components/shared/RecentlyAuthoredParts";
import communityEventsService from "../services/communityEventsService";
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
  const [searchQuery, setSearchQuery] = useState("");
  const ITEMS_PER_PAGE = 10;
  const { updateAuth } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    title: "",
    content: "",
    type: "announcement",
    date: new Date().toISOString().split('T')[0]
  });

  // Community Events state
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    event_theme: "",
    event_description: "",
    event_banner_url: "",
    event_end_date: "",
    rv_release_time: ""
  });

  // Determine current admin section from URL
  const currentSection = location.pathname === '/admin' ? 'dashboard' : 
                        location.pathname.split('/admin/')[1] || 'dashboard';

  const loadUpdates = async () => {
    try {
      setLoadingUpdates(true);
      const data = await apiGet("/admin/updates?limit=100");
      setUpdates(data || []);
    } catch (error) {
      console.error("Failed to load updates:", error);
      setError("Failed to load updates");
    } finally {
      setLoadingUpdates(false);
    }
  };

  useEffect(() => {
    if (currentSection === 'users' || currentSection === 'dashboard') {
      loadUsers();
    }
    if (currentSection === 'updates') {
      loadUpdates();
    }
    if (currentSection === 'events') {
      loadEvents();
    }
  }, [currentSection]);

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const result = await communityEventsService.getAdminEvents(true);
      if (result.success) {
        setEvents(result.data.events || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      setError("Failed to load events");
    } finally {
      setLoadingEvents(false);
    }
  };

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

  // Filter and sort logic
  const filteredAndSortedUsers = React.useMemo(() => {
    // First filter by search query
    let filtered = users;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = users.filter((user) => {
        const username = (user.username || "").toLowerCase();
        const email = (user.email || "").toLowerCase();
        return username.includes(query) || email.includes(query);
      });
    }

    // Then sort
    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle null dates
      if (sortConfig.key.includes("_at")) {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      }

      // Handle null/undefined values for string fields
      if (sortConfig.key === "email" || sortConfig.key === "username") {
        aValue = aValue || "";
        bValue = bValue || "";
      }

      // Handle numeric fields (song_count)
      if (sortConfig.key === "song_count") {
        aValue = aValue || 0;
        bValue = bValue || 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [users, sortConfig, searchQuery]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const paginatedUsers = filteredAndSortedUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredAndSortedUsers.length / ITEMS_PER_PAGE);

  // Reset to page 1 when sorting or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [sortConfig.key, sortConfig.direction, searchQuery]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
        { id: 'updates', label: 'Updates', path: '/admin/updates' },
        { id: 'notifications', label: 'Notifications', path: '/admin/notifications' },
        { id: 'events', label: 'Events', path: '/admin/events' },
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3>User Management ({searchQuery.trim() ? `${filteredAndSortedUsers.length} of ${users.length}` : users.length} users)</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '0.9rem',
                minWidth: '250px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
            />
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button onClick={loadUsers} style={{ padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Refresh
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('username')}>
                  Username {sortConfig.key === 'username' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('email')}>
                  Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('song_count')}>
                  Songs {sortConfig.key === 'song_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Admin</th>
                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Active</th>
                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('last_login_at')}>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                background: currentPage === 1 ? '#e9ecef' : 'white',
                color: currentPage === 1 ? '#6c757d' : '#333',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              Previous
            </button>

            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        background: currentPage === page ? '#007bff' : 'white',
                        color: currentPage === page ? 'white' : '#333',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: currentPage === page ? '600' : '400',
                        minWidth: '2.5rem'
                      }}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} style={{ padding: '0 0.25rem', color: '#6c757d' }}>
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                background: currentPage === totalPages ? '#e9ecef' : 'white',
                color: currentPage === totalPages ? '#6c757d' : '#333',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              Next
            </button>

            <div style={{
              marginLeft: '1rem',
              paddingLeft: '1rem',
              borderLeft: '1px solid #dee2e6',
              color: '#6c757d',
              fontSize: '0.9rem'
            }}>
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
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

  const handleCreateUpdate = async () => {
    try {
      await apiPost("/admin/updates", updateForm);
      setShowUpdateForm(false);
      setUpdateForm({ title: "", content: "", type: "announcement", date: new Date().toISOString().split('T')[0] });
      loadUpdates();
    } catch (error) {
      console.error("Failed to create update:", error);
      alert("Failed to create update: " + (error.message || "Unknown error"));
    }
  };

  const handleUpdateUpdate = async () => {
    try {
      await apiPut(`/admin/updates/${editingUpdate.id}`, updateForm);
      setEditingUpdate(null);
      setShowUpdateForm(false);
      setUpdateForm({ title: "", content: "", type: "announcement", date: new Date().toISOString().split('T')[0] });
      loadUpdates();
    } catch (error) {
      console.error("Failed to update update:", error);
      alert("Failed to update update: " + (error.message || "Unknown error"));
    }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!window.confirm("Are you sure you want to delete this update?")) {
      return;
    }
    try {
      await apiDelete(`/admin/updates/${updateId}`);
      loadUpdates();
    } catch (error) {
      console.error("Failed to delete update:", error);
      alert("Failed to delete update: " + (error.message || "Unknown error"));
    }
  };

  const handleEditUpdate = (update) => {
    setEditingUpdate(update);
    setUpdateForm({
      title: update.title,
      content: update.content,
      type: update.type,
      date: update.date.split('T')[0]
    });
    setShowUpdateForm(true);
  };

  const renderUpdates = () => (
    <div className="admin-updates-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h3>Latest Updates Management</h3>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            Create and manage updates that appear in the "Latest Updates" section on the home page.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUpdate(null);
            setUpdateForm({ title: "", content: "", type: "announcement", date: new Date().toISOString().split('T')[0] });
            setShowUpdateForm(true);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600'
          }}
        >
          + New Update
        </button>
      </div>

      {showUpdateForm && (
        <div style={{
          background: '#f8f9fa',
          padding: '2rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h4 style={{ marginBottom: '1.5rem' }}>
            {editingUpdate ? 'Edit Update' : 'Create New Update'}
          </h4>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Title:
            </label>
            <input
              type="text"
              value={updateForm.title}
              onChange={(e) => setUpdateForm({ ...updateForm, title: e.target.value })}
              placeholder="Update title..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Content:
            </label>
            <textarea
              value={updateForm.content}
              onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })}
              placeholder="Update content..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Type:
            </label>
            <select
              value={updateForm.type}
              onChange={(e) => setUpdateForm({ ...updateForm, type: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="announcement">Announcement</option>
              <option value="feature">Feature</option>
              <option value="update">Update</option>
              <option value="bugfix">Bug Fix</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Date:
            </label>
            <input
              type="date"
              value={updateForm.date}
              onChange={(e) => setUpdateForm({ ...updateForm, date: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={editingUpdate ? handleUpdateUpdate : handleCreateUpdate}
              disabled={!updateForm.title || !updateForm.content}
              style={{
                padding: '0.75rem 1.5rem',
                background: editingUpdate ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (!updateForm.title || !updateForm.content) ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                opacity: (!updateForm.title || !updateForm.content) ? 0.5 : 1
              }}
            >
              {editingUpdate ? 'Update' : 'Create'}
            </button>
            <button
              onClick={() => {
                setShowUpdateForm(false);
                setEditingUpdate(null);
                setUpdateForm({ title: "", content: "", type: "announcement", date: new Date().toISOString().split('T')[0] });
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loadingUpdates ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading updates...</div>
      ) : updates.length === 0 ? (
        <div style={{
          background: '#f8f9fa',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#666'
        }}>
          <p>No updates yet. Create your first update!</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem'
        }}>
          {updates.map(update => (
            <div
              key={update.id}
              style={{
                background: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '1.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{update.title}</h4>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: '#e9ecef',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      textTransform: 'capitalize'
                    }}>
                      {update.type}
                    </span>
                  </div>
                  <p style={{ color: '#666', margin: 0, whiteSpace: 'pre-wrap' }}>{update.content}</p>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#999' }}>
                    By {update.author} • {new Date(update.date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                  <button
                    onClick={() => handleEditUpdate(update)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUpdate(update.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        const result = await communityEventsService.updateEvent(editingEvent.id, eventForm);
        if (result.success) {
          loadEvents();
          setShowEventForm(false);
          setEditingEvent(null);
          setEventForm({
            name: "",
            event_theme: "",
            event_description: "",
            event_banner_url: "",
            event_end_date: "",
            rv_release_time: ""
          });
        } else {
          setError(result.error);
        }
      } else {
        const result = await communityEventsService.createEvent({
          ...eventForm,
          event_end_date: eventForm.event_end_date || null,
          rv_release_time: eventForm.rv_release_time || null
        });
        if (result.success) {
          loadEvents();
          setShowEventForm(false);
          setEventForm({
            name: "",
            event_theme: "",
            event_description: "",
            event_banner_url: "",
            event_end_date: "",
            rv_release_time: ""
          });
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      console.error("Failed to save event:", err);
      setError("Failed to save event");
    }
  };

  const handleEventDelete = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event? This will remove all registrations and associated data.")) {
      return;
    }
    try {
      const result = await communityEventsService.deleteEvent(eventId);
      if (result.success) {
        loadEvents();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
      setError("Failed to delete event");
    }
  };

  const handleEventReveal = async (eventId) => {
    if (!window.confirm("Are you sure you want to reveal this event? This will make all RhythmVerse links and submission details visible to everyone.")) {
      return;
    }
    try {
      const result = await communityEventsService.revealEvent(eventId);
      if (result.success) {
        loadEvents();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to reveal event:", err);
      setError("Failed to reveal event");
    }
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return "No deadline";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const renderEvents = () => (
    <div className="admin-events-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, color: '#333' }}>Community Events</h3>
        <button
          onClick={() => {
            setEditingEvent(null);
            setEventForm({
              name: "",
              event_theme: "",
              event_description: "",
              event_banner_url: "",
              event_end_date: "",
              rv_release_time: ""
            });
            setShowEventForm(true);
          }}
          style={{
            padding: '0.5rem 1rem',
            background: '#e94560',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Create Event
        </button>
      </div>

      {showEventForm && (
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{ marginTop: 0, color: '#333', marginBottom: '1rem' }}>{editingEvent ? 'Edit Event' : 'Create New Event'}</h4>
          <form onSubmit={handleEventSubmit}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>Event Name *</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    color: '#333',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>Theme *</label>
                <input
                  type="text"
                  value={eventForm.event_theme}
                  onChange={(e) => setEventForm({ ...eventForm, event_theme: e.target.value })}
                  placeholder="e.g., Valentine's Day, Halloween"
                  required
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    color: '#333',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>Description</label>
                <textarea
                  value={eventForm.event_description}
                  onChange={(e) => setEventForm({ ...eventForm, event_description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    color: '#333',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>Banner Image URL</label>
                <input
                  type="url"
                  value={eventForm.event_banner_url}
                  onChange={(e) => setEventForm({ ...eventForm, event_banner_url: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    color: '#333',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  End Date (leave empty for no deadline - must manually reveal)
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.event_end_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_end_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    color: '#333',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  RhythmVerse Release Time (CET)
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.rv_release_time}
                  onChange={(e) => setEventForm({ ...eventForm, rv_release_time: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    color: '#333',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: '#888', fontSize: '0.75rem' }}>
                  The time when songs should be scheduled for release on RhythmVerse server
                </small>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="submit"
                style={{
                  padding: '0.5rem 1rem',
                  background: '#2ed573',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loadingEvents ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>Loading events...</p>
      ) : events.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No community events yet. Create one to get started!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {events.map(event => (
            <div
              key={event.id}
              style={{
                background: 'white',
                border: `1px solid ${event.status === 'active' ? '#2ed573' : '#ddd'}`,
                borderRadius: '8px',
                padding: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', color: '#333' }}>{event.name}</h4>
                  <span style={{ color: '#e94560', fontSize: '0.875rem' }}>{event.event_theme}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '999px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      background: event.status === 'active' ? '#d4edda' : '#fff3cd',
                      color: event.status === 'active' ? '#155724' : '#856404'
                    }}
                  >
                    {event.status}
                  </span>
                  {event.is_revealed && (
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: '#d1ecf1',
                        color: '#0c5460'
                      }}
                    >
                      Revealed
                    </span>
                  )}
                </div>
              </div>

              {event.event_description && (
                <p style={{ color: '#666', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                  {event.event_description.slice(0, 150)}
                  {event.event_description.length > 150 ? '...' : ''}
                </p>
              )}

              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#666', marginBottom: '0.75rem' }}>
                <span>📅 {formatEventDate(event.event_end_date)}</span>
                <span>👥 {event.registered_count} registered</span>
                <span>🎵 {event.songs_count} songs</span>
                <span>✅ {event.submitted_count} submitted</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setEditingEvent(event);
                    setEventForm({
                      name: event.name,
                      event_theme: event.event_theme,
                      event_description: event.event_description || "",
                      event_banner_url: event.event_banner_url || "",
                      event_end_date: event.event_end_date ? new Date(event.event_end_date).toISOString().slice(0, 16) : "",
                      rv_release_time: event.rv_release_time ? new Date(event.rv_release_time).toISOString().slice(0, 16) : ""
                    });
                    setShowEventForm(true);
                  }}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#f0f0f0',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Edit
                </button>
                {!event.is_revealed && (
                  <button
                    onClick={() => handleEventReveal(event.id)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: '#d1ecf1',
                      color: '#0c5460',
                      border: '1px solid #bee5eb',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Reveal Links
                  </button>
                )}
                <button
                  onClick={() => handleEventDelete(event.id)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: '#f8d7da',
                    color: '#721c24',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
          {currentSection === 'updates' && 'Manage Latest Updates for the home page'}
          {currentSection === 'notifications' && 'Send system messages to users'}
          {currentSection === 'events' && 'Create and manage community events'}
          {currentSection === 'tools' && 'Maintenance and system tools'}
        </p>
      </div>
      
      {renderNavTabs()}
      
      {currentSection === 'dashboard' && renderDashboard()}
      {currentSection === 'users' && renderUsers()}
      {currentSection === 'updates' && renderUpdates()}
      {currentSection === 'notifications' && renderNotifications()}
      {currentSection === 'events' && renderEvents()}
      {currentSection === 'tools' && renderTools()}
    </div>
  );
}

export default AdminPage;