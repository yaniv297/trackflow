import React, { useState, useEffect, useCallback } from "react";
import { apiPost, apiGet, apiDelete } from "../utils/api";
import UserDropdown from "./UserDropdown";

const UnifiedCollaborationModal = ({
  isOpen,
  onClose,
  packId,
  packName,
  songId,
  songTitle,
  collaborationType = "pack", // "pack" or "song"
}) => {
  const [collaborators, setCollaborators] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCollaborators = useCallback(async () => {
    if (!packId && !songId) return;

    setLoadingCollaborators(true);
    try {
      let endpoint;
      if (collaborationType === "pack") {
        endpoint = `/collaborations/packs/${packId}/collaborators`;
      } else {
        endpoint = `/collaborations/songs/${songId}/collaborators`;
      }

      const response = await apiGet(endpoint);
      setCollaborators(response);
    } catch (error) {
      console.error("Error loading collaborators:", error);
    } finally {
      setLoadingCollaborators(false);
    }
  }, [packId, songId, collaborationType]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await apiGet("/auth/users/");
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

  const handleAddCollaborators = async () => {
    if (selectedUsers.length === 0) return;

    setLoading(true);
    try {
      for (const username of selectedUsers) {
        // Find user by username
        const user = users.find((u) => u.username === username);
        if (!user) continue;

        if (collaborationType === "pack") {
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: user.id,
            permissions: ["pack_view", "pack_edit"], // Give both view and edit permissions
          });
        } else {
          await apiPost(`/collaborations/songs/${songId}/collaborate`, {
            user_id: user.id,
          });
        }
      }

      setSelectedUsers([]);
      await loadCollaborators();
    } catch (error) {
      console.error("Error adding collaborators:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    setLoading(true);
    try {
      if (collaborationType === "pack") {
        await apiDelete(
          `/collaborations/packs/${packId}/collaborate/${userId}`
        );
      } else {
        await apiDelete(
          `/collaborations/songs/${songId}/collaborate/${userId}`
        );
      }
      await loadCollaborators();
    } catch (error) {
      console.error("Error removing collaborator:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (collaborationType === "pack") {
      return `Pack Collaboration: ${packName}`;
    } else {
      return `Song Collaboration: ${songTitle}`;
    }
  };

  const getDescription = () => {
    if (collaborationType === "pack") {
      return "Add users who can view and edit songs in this pack. They can add new songs but only edit their own.";
    } else {
      return "Add users who can collaborate on this specific song with equal editing rights.";
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
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#333" }}>{getTitle()}</h2>

        <p
          style={{
            margin: "0 0 1.5rem 0",
            color: "#666",
            fontSize: "0.9rem",
            lineHeight: "1.4",
          }}
        >
          {getDescription()}
        </p>

        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#555" }}
          >
            Add Collaborators
          </h3>

          <UserDropdown
            users={users}
            selectedUsers={selectedUsers}
            onUsersChange={setSelectedUsers}
            placeholder="Select users to collaborate with..."
            disabled={loadingUsers}
          />

          <button
            onClick={handleAddCollaborators}
            disabled={selectedUsers.length === 0 || loading}
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
            {loading
              ? "Adding..."
              : `Add ${
                  selectedUsers.length > 0 ? selectedUsers.length : ""
                } Collaborator${selectedUsers.length !== 1 ? "s" : ""}`}
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
                  <div>
                    <span style={{ fontWeight: "500" }}>{collab.username}</span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#666",
                        marginLeft: "0.5rem",
                      }}
                    >
                      ({collab.collaboration_type.replace("_", " ")})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.user_id)}
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

export default UnifiedCollaborationModal;
