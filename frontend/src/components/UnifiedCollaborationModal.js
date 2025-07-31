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
  currentUser = null,
  onCollaborationSaved = null,
}) => {
  // UI flow state
  const [step, setStep] = useState(1); // 1: select user, 2: choose permissions, 3: select songs (for song-by-song)
  const [selectedUser, setSelectedUser] = useState("");
  const [permissionType, setPermissionType] = useState(""); // "full" or "song-by-song"
  const [selectedSongs, setSelectedSongs] = useState([]);

  // Data state
  const [collaborators, setCollaborators] = useState([]);
  const [users, setUsers] = useState([]);
  const [packSongs, setPackSongs] = useState([]);

  // Pending changes system
  const [pendingCollaborations, setPendingCollaborations] = useState([]);
  const [pendingRemovals, setPendingRemovals] = useState([]);

  // Loading states
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load collaborators
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

  // Load users for dropdown
  const loadUsers = useCallback(async () => {
    try {
      const response = await apiGet("/auth/users/");
      setUsers(response);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, []);

  // Load songs for the pack (for song-by-song permissions)
  const loadPackSongs = useCallback(async () => {
    if (!packId) return;

    try {
      const response = await apiGet(`/songs/?pack_id=${packId}`);
      setPackSongs(response);
    } catch (error) {
      console.error("Error loading pack songs:", error);
    }
  }, [packId]);

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
      loadUsers();
      if (collaborationType === "pack") {
        loadPackSongs();
      }
    }
  }, [isOpen, loadCollaborators, loadUsers, loadPackSongs, collaborationType]);

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedUser("");
      setPermissionType("");
      setSelectedSongs([]);
      setPendingCollaborations([]);
      setPendingRemovals([]);
    }
  }, [isOpen]);

  const handleUserSelect = (username) => {
    setSelectedUser(username);
    setStep(2);
  };

  const handlePermissionSelect = (type) => {
    setPermissionType(type);

    if (type === "full") {
      // Add to pending collaborations and reset to step 1
      const user = users.find((u) => u.username === selectedUser);
      if (user) {
        setPendingCollaborations((prev) => [
          ...prev,
          {
            type: "full",
            user_id: user.id,
            username: user.username,
            permissions: ["pack_view", "pack_edit"],
          },
        ]);
      }
      // Reset to step 1 to add more collaborators
      setSelectedUser("");
      setPermissionType("");
      setStep(1);
    } else if (type === "song-by-song") {
      setStep(3);
    }
  };

  const handleSongSelection = (songId, isSelected) => {
    if (isSelected) {
      setSelectedSongs((prev) => [...prev, songId]);
    } else {
      setSelectedSongs((prev) => prev.filter((id) => id !== songId));
    }
  };

  const handleAddSongBySongCollaboration = () => {
    const user = users.find((u) => u.username === selectedUser);
    if (user && selectedSongs.length > 0) {
      const songsData = selectedSongs
        .map((songId) => packSongs.find((song) => song.id === songId))
        .filter(Boolean);

      setPendingCollaborations((prev) => [
        ...prev,
        {
          type: "song-by-song",
          user_id: user.id,
          username: user.username,
          permissions: ["pack_view"],
          songs: songsData,
        },
      ]);
    }

    // Reset to step 1
    setSelectedUser("");
    setPermissionType("");
    setSelectedSongs([]);
    setStep(1);
  };

  const handleRemoveCollaborator = (userId) => {
    const collaborator = collaborators.find((c) => c.user_id === userId);
    if (collaborator) {
      setPendingRemovals((prev) => [...prev, collaborator]);
    }
  };

  const handleRemovePendingRemoval = (userId) => {
    setPendingRemovals((prev) =>
      prev.filter((removal) => removal.user_id !== userId)
    );
  };

  const handleSaveAll = async () => {
    console.log("handleSaveAll called", {
      pendingCollaborations,
      pendingRemovals,
      packId,
      songId,
      collaborationType,
    });

    if (pendingCollaborations.length === 0 && pendingRemovals.length === 0) {
      console.log("No pending changes, closing modal");
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Handle additions
      for (const collab of pendingCollaborations) {
        if (collab.type === "full") {
          // Give full pack permissions
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: collab.user_id,
            permissions: collab.permissions,
          });
        } else if (collab.type === "song-by-song") {
          // Give pack view permission
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: collab.user_id,
            permissions: collab.permissions,
          });

          // Give song edit permissions for selected songs
          for (const song of collab.songs) {
            await apiPost(`/collaborations/songs/${song.id}/collaborate`, {
              user_id: collab.user_id,
            });
          }
        }
      }

      // Handle removals
      console.log("Processing removals:", pendingRemovals);
      for (const removal of pendingRemovals) {
        console.log("Removing collaborator:", removal);
        if (collaborationType === "pack") {
          const response = await apiDelete(
            `/collaborations/packs/${packId}/collaborate/${removal.user_id}`
          );
          console.log("Remove response:", response);
        } else {
          const response = await apiDelete(
            `/collaborations/songs/${songId}/collaborate/${removal.user_id}`
          );
          console.log("Remove response:", response);
        }
      }

      // Reset form and reload collaborators
      setPendingCollaborations([]);
      setPendingRemovals([]);
      setSelectedUser("");
      setPermissionType("");
      setSelectedSongs([]);
      setStep(1);
      await loadCollaborators();

      // Notify parent component to refresh data
      if (onCollaborationSaved) {
        onCollaborationSaved();
      }

      onClose();
    } catch (error) {
      console.error("Error saving collaborations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (pendingCollaborations.length > 0 || pendingRemovals.length > 0) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to close?"
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getPermissionDescription = (collab) => {
    if (collaborationType === "pack") {
      // Check if this collaborator has song-level permissions
      const songCollabs = collaborators.filter(
        (c) =>
          c.user_id === collab.user_id &&
          c.song_id &&
          c.collaboration_type === "song_edit"
      );

      if (collab.collaboration_type === "pack_edit") {
        return "Full permissions (pack view + edit)";
      } else if (collab.collaboration_type === "pack_view") {
        if (songCollabs.length > 0) {
          const songTitles = songCollabs
            .map((sc) => {
              const song = packSongs.find((ps) => ps.id === sc.song_id);
              return song ? song.title : `Song ${sc.song_id}`;
            })
            .join(", ");
          return `Pack view + song edit for: ${songTitles}`;
        } else {
          return "Pack view only";
        }
      }
    }
    return collab.collaboration_type?.replace("_", " ") || "Unknown";
  };

  if (!isOpen) return null;

  const getTitle = () => {
    if (collaborationType === "pack") {
      return `Pack Collaboration: ${packName}`;
    } else {
      return `Song Collaboration: ${songTitle}`;
    }
  };

  const getDescription = () => {
    if (collaborationType === "pack") {
      return "Add users who can view and edit songs in this pack. Choose between full permissions or song-by-song access.";
    } else {
      return "Add users who can collaborate on this specific song with equal editing rights.";
    }
  };

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
      onClick={handleClose}
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

        {/* Step 1: Select User */}
        {step === 1 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              Select User to Collaborate
            </h3>

            <UserDropdown
              value=""
              onChange={(e) => {
                // Handle user selection differently - extract from the added user
                const newUsers = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
                if (newUsers.length > 0) {
                  handleUserSelect(newUsers[newUsers.length - 1]); // Take the last added user
                }
              }}
              placeholder="Select a user..."
              currentUser={currentUser}
            />
          </div>
        )}

        {/* Step 2: Choose Permission Type */}
        {step === 2 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              Choose Permissions for {selectedUser}
            </h3>

            <div
              style={{ display: "flex", gap: "1rem", flexDirection: "column" }}
            >
              <button
                onClick={() => handlePermissionSelect("full")}
                style={{
                  padding: "1rem",
                  border: "2px solid #007bff",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                  Full Permissions
                </div>
                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                  Gives both pack view and edit permissions. User can view all
                  songs and edit any song in the pack.
                </div>
              </button>

              <button
                onClick={() => handlePermissionSelect("song-by-song")}
                style={{
                  padding: "1rem",
                  border: "2px solid #28a745",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>
                  Song-by-Song Permissions
                </div>
                <div style={{ fontSize: "0.9rem", color: "#666" }}>
                  Gives pack view + lets you choose specific songs they can
                  edit. Other songs will be read-only.
                </div>
              </button>
            </div>

            <button
              onClick={() => setStep(1)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>
        )}

        {/* Step 3: Select Songs */}
        {step === 3 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              Select Songs for {selectedUser}
            </h3>

            <div
              style={{
                maxHeight: "300px",
                overflow: "auto",
                border: "1px solid #eee",
                borderRadius: "4px",
              }}
            >
              {packSongs.map((song) => (
                <div
                  key={song.id}
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSongs.includes(song.id)}
                    onChange={(e) =>
                      handleSongSelection(song.id, e.target.checked)
                    }
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "500" }}>{song.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                      {song.artist} • {song.album}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Back
              </button>

              <button
                onClick={handleAddSongBySongCollaboration}
                disabled={selectedSongs.length === 0}
                style={{
                  padding: "0.5rem 1rem",
                  background: selectedSongs.length > 0 ? "#28a745" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: selectedSongs.length > 0 ? "pointer" : "not-allowed",
                }}
              >
                Add Collaboration ({selectedSongs.length} songs)
              </button>
            </div>
          </div>
        )}

        {/* Pending Collaborations */}
        {pendingCollaborations.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              Pending Additions
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {pendingCollaborations.map((collab, index) => (
                <li
                  key={index}
                  style={{
                    padding: "0.5rem",
                    border: "1px solid #e3f2fd",
                    borderRadius: "4px",
                    marginBottom: "0.5rem",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <div style={{ fontWeight: "500" }}>{collab.username}</div>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>
                    {collab.type === "full"
                      ? "Full permissions (pack view + edit)"
                      : `Pack view + song edit for: ${collab.songs
                          .map((s) => s.title)
                          .join(", ")}`}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Current Collaborators */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#555" }}
          >
            Current Collaborators
          </h3>
          {loadingCollaborators ? (
            <p>Loading collaborators...</p>
          ) : (
            <>
              {/* Only show pack_edit collaborations, filtered by pending removals */}
              {collaborators.filter(
                (collab) =>
                  collab.collaboration_type === "pack_edit" &&
                  !pendingRemovals.some(
                    (removal) => removal.user_id === collab.user_id
                  )
              ).length === 0 ? (
                <p style={{ color: "#666", fontStyle: "italic" }}>
                  No collaborators yet.
                </p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {collaborators
                    .filter(
                      (collab) =>
                        collab.collaboration_type === "pack_edit" &&
                        !pendingRemovals.some(
                          (removal) => removal.user_id === collab.user_id
                        )
                    )
                    .map((collab) => (
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
                          <span style={{ fontWeight: "500" }}>
                            {collab.username}
                          </span>
                          <div style={{ fontSize: "0.8rem", color: "#666" }}>
                            {getPermissionDescription(collab)}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleRemoveCollaborator(collab.user_id)
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
                          Remove
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Pending Removals */}
        {pendingRemovals.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              Pending Removals
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {pendingRemovals.map((removal) => (
                <li
                  key={removal.user_id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem",
                    border: "1px solid #f5c6cb",
                    borderRadius: "4px",
                    marginBottom: "0.5rem",
                    backgroundColor: "#f8d7da",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "500" }}>
                      {removal.username}
                    </span>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#666",
                        marginLeft: "0.5rem",
                      }}
                    >
                      (will be removed)
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePendingRemoval(removal.user_id)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      background: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                    }}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: "0.5rem 1rem",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSaveAll}
            disabled={
              loading ||
              (pendingCollaborations.length === 0 &&
                pendingRemovals.length === 0)
            }
            style={{
              padding: "0.5rem 1rem",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
            title={`Debug: loading=${loading}, pendingCollabs=${pendingCollaborations.length}, pendingRemovals=${pendingRemovals.length}`}
          >
            {loading
              ? "Saving..."
              : `Save ${
                  pendingCollaborations.length + pendingRemovals.length
                } Change${
                  pendingCollaborations.length + pendingRemovals.length !== 1
                    ? "s"
                    : ""
                }`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCollaborationModal;
