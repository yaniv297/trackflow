import React, { useState, useEffect } from "react";
import { apiGet, apiPatch, apiDelete, apiPost } from "./utils/api";
import { useAuth } from "./contexts/AuthContext";
import ActivityFeed from "./components/shared/ActivityFeed";
import "./AdminPage.css";

function AdminPage() {
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { updateAuth } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

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
          currentAdminStatus ? "remove" : "grant"
        } admin privileges?`
      )
    ) {
      return;
    }

    try {
      await apiPatch(`/admin/users/${userId}/toggle-admin`);
      await loadUsers(); // Reload the list
    } catch (err) {
      console.error("Failed to toggle admin status:", err);
      alert(`Error: ${err.message || "Failed to update admin status"}`);
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
      await loadUsers(); // Reload the list
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert(`Error: ${err.message || "Failed to delete user"}`);
    }
  };

  const handleImpersonate = async (userId, username) => {
    if (
      !window.confirm(
        `Impersonate user "${username}"? You will be logged in as this user.`
      )
    ) {
      return;
    }

    try {
      const response = await apiPost(`/admin/impersonate/${userId}`);

      // Store the current admin token before impersonation
      const currentToken = localStorage.getItem("token");
      localStorage.setItem("admin_token", currentToken);
      localStorage.setItem("impersonating", username);

      // Store the new token and update auth context
      localStorage.setItem("token", response.access_token);
      updateAuth(response.access_token, response.username);

      // Redirect to home page as the impersonated user
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to impersonate user:", err);
      alert(`Error: ${err.message || "Failed to impersonate user"}`);
    }
  };

  const handleFetchAllArtistImages = async () => {
    if (
      !window.confirm(
        "This will fetch artist images from Spotify for all artists that don't have them. This may take a while. Continue?"
      )
    ) {
      return;
    }

    try {
      setFetchingImages(true);
      setFetchLogs(["Starting artist image fetch..."]);
      const response = await apiPost("/spotify/artists/fetch-all-missing-images");
      setFetchLogs(response.log || []);
      window.showNotification(
        response.message || `Updated ${response.updated_count} artist images`,
        "success"
      );
    } catch (err) {
      console.error("Failed to fetch artist images:", err);
      window.showNotification(
        `Error: ${err.message || "Failed to fetch artist images"}`,
        "error"
      );
    } finally {
      setFetchingImages(false);
    }
  };

  const handleFixSongArtistLinks = async () => {
    if (
      !window.confirm(
        "This will link songs without artist_id to existing artists by name. Continue?"
      )
    ) {
      return;
    }

    try {
      setFixingSongLinks(true);
      setSongLinkLogs(["Starting song↔artist link fix..."]);
      const response = await apiPost("/admin/fix-song-artist-links");
      const logs = [
        response.message || `Linked ${response.linked || 0} songs`,
        `Checked ${response.checked || 0} songs total.`,
      ];
      if (response.missing_artist_names && response.missing_artist_names.length > 0) {
        logs.push(
          `Still missing ${response.missing_artist_names.length} artists (showing up to 25):`,
          ...response.missing_artist_names.map((name) => ` - ${name}`)
        );
      }
      const combinedLogs = response.log ? [...response.log, "---", ...logs] : logs;
      setSongLinkLogs(combinedLogs);
      window.showNotification(response.message || "Song/artist links updated", "success");
    } catch (err) {
      console.error("Failed to fix song artist links:", err);
      window.showNotification(
        `Error: ${err.message || "Failed to fix song artist links"}`,
        "error"
      );
    } finally {
      setFixingSongLinks(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [users.length]);

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle date fields
    if (sortConfig.key === 'created_at' || sortConfig.key === 'last_login_at') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    // Handle null/undefined values
    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';

    // Handle boolean values
    if (typeof aValue === 'boolean') {
      aValue = aValue ? 1 : 0;
      bValue = bValue ? 1 : 0;
    }

    // Handle string comparison
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return "↕️";
    }
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = sortedUsers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">Loading users...</div>
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

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p className="admin-subtitle">Manage users and system settings</p>
      </div>

      <div className="admin-tools-section" style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => setShowTools((prev) => !prev)}
          style={{
            width: "100%",
            textAlign: "left",
            border: "none",
            background: "transparent",
            padding: "0.75rem 0",
            marginBottom: "0.25rem",
            cursor: "pointer",
            color: "#172035",
            fontSize: "1.1rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderBottom: "1px solid #e5e9f0",
          }}
        >
          <span
            style={{
              fontSize: "1.1rem",
              color: "#5a6a85",
              width: "1.2rem",
              display: "inline-block",
            }}
          >
            {showTools ? "▾" : "▸"}
          </span>
          <span>Admin Tools</span>
        </button>
        {showTools && (
          <div style={{ padding: "0.5rem 0 1rem" }}>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            onClick={handleFetchAllArtistImages}
            disabled={fetchingImages}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: fetchingImages ? "#ccc" : "#9C27B0",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: fetchingImages ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "500",
            }}
          >
            {fetchingImages
              ? "⏳ Fetching Artist Images..."
              : "🎨 Fetch All Missing Artist Images"}
          </button>
          <button
            onClick={handleFixSongArtistLinks}
            disabled={fixingSongLinks}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: fixingSongLinks ? "#ccc" : "#0d6efd",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: fixingSongLinks ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "500",
            }}
          >
            {fixingSongLinks
              ? "⏳ Linking Songs..."
              : "🪢 Link Songs to Artists"}
          </button>
        </div>
        <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9rem" }}>
          Fetches artist profile pictures from Spotify for all artists that don't
          have images yet.
        </p>
        {fetchLogs.length > 0 && (
          <div
            style={{
              marginTop: "1rem",
              maxHeight: "200px",
              overflowY: "auto",
              border: "1px solid #eee",
              borderRadius: "6px",
              padding: "0.75rem",
              background: "#fafafa",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              lineHeight: 1.5,
            }}
          >
            {fetchLogs.map((entry, idx) => (
              <div key={idx}>{entry}</div>
            ))}
          </div>
        )}
        {songLinkLogs.length > 0 && (
          <div
            style={{
              marginTop: "1rem",
              maxHeight: "200px",
              overflowY: "auto",
              border: "1px solid #eee",
              borderRadius: "6px",
              padding: "0.75rem",
              background: "#f3f8ff",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              lineHeight: 1.5,
            }}
          >
            {songLinkLogs.map((entry, idx) => (
              <div key={`song-link-${idx}`}>{entry}</div>
            ))}
          </div>
        )}
          </div>
        )}
      </div>

      <div className="users-section" style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => setShowUsers((prev) => !prev)}
          style={{
            width: "100%",
            textAlign: "left",
            border: "none",
            background: "transparent",
            padding: "0.75rem 0",
            marginBottom: "0.25rem",
            cursor: "pointer",
            color: "#172035",
            fontSize: "1.1rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderBottom: "1px solid #e5e9f0",
          }}
        >
          <span
            style={{
              fontSize: "1.1rem",
              color: "#5a6a85",
              width: "1.2rem",
              display: "inline-block",
            }}
          >
            {showUsers ? "▾" : "▸"}
          </span>
          <span>
            User Management ({users.length} {users.length === 1 ? "user" : "users"})
          </span>
        </button>

        {showUsers && (
          <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('id')}
                >
                  ID {getSortIcon('id')}
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('username')}
                >
                  Username {getSortIcon('username')}
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('email')}
                >
                  Email {getSortIcon('email')}
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('is_admin')}
                >
                  Admin {getSortIcon('is_admin')}
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('created_at')}
                >
                  Created {getSortIcon('created_at')}
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('last_login_at')}
                >
                  Last Login {getSortIcon('last_login_at')}
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('song_count')}
                >
                  Songs {getSortIcon('song_count')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td className="username-cell">{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        user.is_admin ? "badge-admin" : "badge-user"
                      }`}
                    >
                      {user.is_admin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(user.created_at)}</td>
                  <td className="date-cell">
                    {formatDate(user.last_login_at)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {user.song_count || 0}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-impersonate"
                      onClick={() => handleImpersonate(user.id, user.username)}
                      title="Impersonate this user"
                    >
                      👤 Login As
                    </button>
                    <button
                      className={`btn-toggle-admin ${
                        user.is_admin ? "btn-demote" : "btn-promote"
                      }`}
                      onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                      title={user.is_admin ? "Remove admin" : "Make admin"}
                    >
                      {user.is_admin ? "⬇️ Demote" : "⬆️ Promote"}
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      title="Delete user"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  background: currentPage === 1 ? "#f0f0f0" : "white",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: "0.9rem", color: "#555" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  background: currentPage === totalPages ? "#f0f0f0" : "white",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="admin-tools-section">
        <button
          onClick={() => setShowActivityFeed((prev) => !prev)}
          style={{
            width: "100%",
            textAlign: "left",
            border: "none",
            background: "transparent",
            padding: "0.75rem 0",
            marginBottom: "0.25rem",
            cursor: "pointer",
            color: "#172035",
            fontSize: "1.1rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderBottom: "1px solid #e5e9f0",
          }}
        >
          <span
            style={{
              fontSize: "1.1rem",
              color: "#5a6a85",
              width: "1.2rem",
              display: "inline-block",
            }}
          >
            {showActivityFeed ? "▾" : "▸"}
          </span>
          <span>Activity Feed</span>
        </button>

        {showActivityFeed && (
          <div style={{ padding: "0.5rem 0 1rem" }}>
            <ActivityFeed />
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
