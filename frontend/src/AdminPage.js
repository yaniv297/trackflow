import React, { useState, useEffect } from "react";
import { apiGet, apiPatch, apiDelete, apiPost } from "./utils/api";
import { useAuth } from "./contexts/AuthContext";
import "./AdminPage.css";

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

      <div className="users-section">
        <h2>User Management ({users.length} users)</h2>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Display Name</th>
                <th>Admin</th>
                <th>Active</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
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
