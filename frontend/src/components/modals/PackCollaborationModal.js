import React, { useState, useEffect, useCallback } from "react";
import { apiCall, apiPost, apiGet, apiDelete } from "../../utils/api";

const PackCollaborationModal = ({ isOpen, onClose, packId, packName }) => {
  const [collaborators, setCollaborators] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCollaborators = useCallback(async () => {
    if (!packId) return;

    setLoadingCollaborators(true);
    try {
      const response = await apiGet(`/pack-collaborations/${packId}`);
      setCollaborators(response);
    } catch (error) {
      console.error("Error loading collaborators:", error);
    } finally {
      setLoadingCollaborators(false);
    }
  }, [packId]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await apiGet("/pack-collaborations/users/");
      setUsers(response);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
      loadUsers();
    }
  }, [isOpen, loadCollaborators, loadUsers]);

  const handleAddCollaborator = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    try {
      const selectedUser = users.find(
        (user) => user.id.toString() === selectedUserId
      );
      if (!selectedUser) return;

      await apiPost("/pack-collaborations/", {
        pack_id: packId,
        collaborator_username: selectedUser.username,
      });

      setSelectedUserId("");
      await loadCollaborators();
    } catch (error) {
      console.error("Error adding collaborator:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorUsername) => {
    setLoading(true);
    try {
      await apiDelete(`/pack-collaborations/${packId}/${collaboratorUsername}`);
      await loadCollaborators();
    } catch (error) {
      console.error("Error removing collaborator:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#333" }}>
          Pack Collaboration: {packName}
        </h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#555" }}
          >
            Add Collaborator
          </h3>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            disabled={loadingUsers}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          >
            <option value="">
              {loadingUsers ? "Loading users..." : "Select a user..."}
            </option>
            {users
              .filter(
                (user) =>
                  !collaborators.some(
                    (collab) => collab.collaborator_username === user.username
                  )
              )
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
          </select>
          {users.length > 0 &&
            users.filter(
              (user) =>
                !collaborators.some(
                  (collab) => collab.collaborator_username === user.username
                )
            ).length === 0 && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#666",
                  margin: "0.25rem 0 0 0",
                }}
              >
                All available users are already collaborators on this pack.
              </p>
            )}
          <button
            onClick={handleAddCollaborator}
            disabled={!selectedUserId || loading}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {loading ? "Adding..." : "Add Collaborator"}
          </button>
        </div>

        <div>
          <h3
            style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#555" }}
          >
            Current Collaborators
          </h3>
          {loadingCollaborators ? (
            <p>Loading collaborators...</p>
          ) : collaborators.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>
              No collaborators yet.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {collaborators.map((collab) => (
                <li
                  key={collab.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem",
                    border: "1px solid #eee",
                    borderRadius: "4px",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span>{collab.collaborator_username}</span>
                  <button
                    onClick={() =>
                      handleRemoveCollaborator(collab.collaborator_username)
                    }
                    disabled={loading}
                    style={{
                      padding: "0.25rem 0.5rem",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    {loading ? "Removing..." : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackCollaborationModal;
