import React, { useState, useEffect } from "react";
import { apiGet, apiPatch, apiDelete, apiPost } from "./utils/api";
import { useAuth } from "./contexts/AuthContext";
import "./AdminPage.css";

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchingImages, setFetchingImages] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
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
      const response = await apiPost("/spotify/artists/fetch-all-missing-images");
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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
      return '↕️';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
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

      <div className="admin-tools-section" style={{ marginBottom: "2rem" }}>
        <h2>Admin Tools</h2>
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
        </div>
        <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9rem" }}>
          Fetches artist profile pictures from Spotify for all artists that don't
          have images yet.
        </p>
      </div>

      <div className="users-section">
        <h2>User Management ({users.length} users)</h2>

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
                  onClick={() => handleSort('display_name')}
                >
                  Display Name {getSortIcon('display_name')}
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('is_admin')}
                >
                  Admin {getSortIcon('is_admin')}
                </th>
                <th 
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => handleSort('is_active')}
                >
                  Active {getSortIcon('is_active')}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td className="username-cell">{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.display_name || "-"}</td>
                  <td>
                    <span
                      className={`badge ${
                        user.is_admin ? "badge-admin" : "badge-user"
                      }`}
                    >
                      {user.is_admin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        user.is_active ? "badge-active" : "badge-inactive"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(user.created_at)}</td>
                  <td className="date-cell">
                    {formatDate(user.last_login_at)}
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
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
