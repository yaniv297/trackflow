import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "../utils/api";

const SongPackCollaborationModal = ({
  isOpen,
  onClose,
  packId,
  packName,
  songs,
}) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

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

  const loadCollaborators = useCallback(async () => {
    if (!packId) return;

    setLoadingCollaborators(true);
    try {
      const response = await apiGet(`/song-pack-collaborations/pack/${packId}`);
      setCollaborators(response);
    } catch (error) {
      console.error("Error loading collaborators:", error);
    } finally {
      setLoadingCollaborators(false);
    }
  }, [packId]);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadCollaborators();
    }
  }, [isOpen, loadUsers, loadCollaborators]);

  const handleAddCollaborator = async () => {
    if (!selectedUserId || selectedSongIds.length === 0) return;

    setLoading(true);
    try {
      const selectedUser = users.find(
        (user) => user.id.toString() === selectedUserId
      );
      if (!selectedUser) return;

      await apiPost("/song-pack-collaborations/", {
        pack_id: packId,
        collaborator_username: selectedUser.username,
        song_ids: selectedSongIds,
      });

      setSelectedUserId("");
      setSelectedSongIds([]);
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
      await apiDelete(
        `/song-pack-collaborations/${packId}/${collaboratorUsername}`
      );
      await loadCollaborators();
    } catch (error) {
      console.error("Error removing collaborator:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSongSelection = (songId) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId)
        ? prev.filter((id) => id !== songId)
        : [...prev, songId]
    );
  };

  const handleSelectAllSongs = () => {
    setSelectedSongIds(songs.map((song) => song.id));
  };

  const handleDeselectAllSongs = () => {
    setSelectedSongIds([]);
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
          maxWidth: "800px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#333" }}>
          Song Pack Collaboration: {packName}
        </h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#555" }}
          >
            Add Collaborator
          </h3>

          {/* User Selection */}
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
              marginBottom: "1rem",
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

          {/* Song Selection */}
          {selectedUserId && (
            <div style={{ marginBottom: "1rem" }}>
              <h4
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.9rem",
                  color: "#666",
                }}
              >
                Select songs to give edit access:
              </h4>

              <div style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={handleSelectAllSongs}
                  style={{
                    padding: "0.25rem 0.5rem",
                    background: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    marginRight: "0.5rem",
                  }}
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAllSongs}
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
                  Deselect All
                </button>
              </div>

              <div
                style={{
                  maxHeight: "200px",
                  overflow: "auto",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "0.5rem",
                }}
              >
                {songs.map((song) => (
                  <label
                    key={song.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0.25rem 0",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSongIds.includes(song.id)}
                      onChange={() => handleSongSelection(song.id)}
                      style={{ marginRight: "0.5rem" }}
                    />
                    <span style={{ fontSize: "0.9rem" }}>
                      {song.title} - {song.artist}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAddCollaborator}
            disabled={
              !selectedUserId || selectedSongIds.length === 0 || loading
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
          >
            {loading
              ? "Adding..."
              : `Add Collaborator to ${selectedSongIds.length} songs`}
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
            <div>
              {collaborators.map((collab) => (
                <div
                  key={collab.collaborator_username}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: "4px",
                    marginBottom: "0.5rem",
                    padding: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>
                      {collab.collaborator_username}
                    </span>
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
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#666" }}>
                    <strong>Edit access to:</strong>
                    <ul style={{ margin: "0.25rem 0", paddingLeft: "1rem" }}>
                      {collab.songs.map((song) => (
                        <li key={song.song_id}>{song.song_title}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
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

export default SongPackCollaborationModal;
