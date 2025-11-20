import React, { useState } from "react";
import EditableCell from "../ui/EditableCell";
import SpotifyEnhancementRow from "../music/SpotifyEnhancementRow";
import SmartDropdown from "../ui/SmartDropdown";
import CustomAlert from "../ui/CustomAlert";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfilePopup } from "../../hooks/useUserProfilePopup";
import UserProfilePopup from "../shared/UserProfilePopup";

// Color palette for collaborators
const collaboratorColors = [
  "#3498db", // Blue
  "#e74c3c", // Red
  "#2ecc71", // Green
  "#f39c12", // Orange
  "#9b59b6", // Purple
  "#1abc9c", // Turquoise
  "#e67e22", // Dark Orange
  "#34495e", // Dark Blue
  "#16a085", // Dark Green
  "#8e44ad", // Dark Purple
  "#27ae60", // Emerald
  "#d35400", // Pumpkin
  "#c0392b", // Dark Red
  "#2980b9", // Dark Blue
  "#f1c40f", // Yellow
];

// Function to get consistent color for each collaborator
const getCollaboratorColor = (collaboratorName) => {
  // Handle undefined or null collaborator names
  if (!collaboratorName || typeof collaboratorName !== "string") {
    return collaboratorColors[0]; // Return first color as fallback
  }

  // Simple hash function to get consistent color for each collaborator
  let hash = 0;
  for (let i = 0; i < collaboratorName.length; i++) {
    const char = collaboratorName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % collaboratorColors.length;
  return collaboratorColors[index];
};

export default function SongRow({
  song,
  selected,
  onSelect,
  editing,
  editValues,
  setEditing,
  setEditValues,
  saveEdit,
  fetchSpotifyOptions,
  handleDelete,
  spotifyOptions,
  setSpotifyOptions,
  applySpotifyEnhancement,
  status,
  groupBy,
  packName,
}) {
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  return (
    <>
      <tr
        style={{
          backgroundColor: selected ? "#e3f2fd" : "white",
          borderBottom: "1px solid #eee",
        }}
      >
        {/* Checkbox */}
        <td style={{ padding: "8px", width: "40px" }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e)}
            style={{ cursor: "pointer" }}
          />
        </td>

        {/* Album Cover */}
        <td style={{ padding: "8px" }}>
          <EditableCell
            value={song.album_cover || ""}
            songId={song.id}
            field="album_cover"
            editing={editing}
            editValues={editValues}
            setEditing={setEditing}
            setEditValues={setEditValues}
            saveEdit={saveEdit}
            isEditable={song.is_editable}
          />
        </td>

        {/* Title */}
        <td style={{ padding: "8px" }}>
          <EditableCell
            value={song.title}
            songId={song.id}
            field="title"
            editing={editing}
            editValues={editValues}
            setEditing={setEditing}
            setEditValues={setEditValues}
            saveEdit={saveEdit}
            isEditable={song.is_editable}
          />
        </td>

        {/* Artist */}
        {groupBy !== "artist" && (
          <td style={{ padding: "8px" }}>
            <EditableCell
              value={song.artist}
              songId={song.id}
              field="artist"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Album */}
        <td style={{ padding: "8px" }}>
          <EditableCell
            value={song.album}
            songId={song.id}
            field="album"
            editing={editing}
            editValues={editValues}
            setEditing={setEditing}
            setEditValues={setEditValues}
            saveEdit={saveEdit}
            isEditable={song.is_editable}
          />
        </td>

        {/* Pack */}
        {groupBy !== "pack" && (
          <td style={{ padding: "8px" }}>
            <EditableCell
              value={song.pack_name || ""}
              songId={song.id}
              field="pack"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Author */}
        <td style={{ padding: "8px" }}>
          <span
            style={{
              background: getCollaboratorColor(song.author || "Unknown"),
              color: "white",
              padding: "2px 6px",
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: "500",
              cursor: "pointer",
              display: "inline-block",
            }}
            onClick={handleUsernameClick(song.author || "Unknown")}
            title="Click to view profile"
          >
            {song.author || "Unknown"}
          </span>
        </td>

        {/* Year */}
        <td style={{ padding: "8px" }}>
          <EditableCell
            value={song.year || ""}
            songId={song.id}
            field="year"
            editing={editing}
            editValues={editValues}
            setEditing={setEditing}
            setEditValues={setEditValues}
            saveEdit={saveEdit}
            isEditable={song.is_editable}
          />
        </td>

        {/* Collaborations */}
        <td style={{ padding: "8px" }}>
          {editing[`${song.id}_collaborations`] && status !== "Future Plans" ? (
            <SmartDropdown
              type="users"
              value={
                editValues[`${song.id}_collaborations`] ??
                (song.collaborations && song.collaborations.length > 0
                  ? song.collaborations
                      .filter((collab) => collab.username !== user.username)
                      .map((collab) => collab.username)
                      .join(", ")
                  : "")
              }
              onChange={(value) =>
                setEditValues((prev) => ({
                  ...prev,
                  [`${song.id}_collaborations`]: value,
                }))
              }
              onBlur={() => saveEdit(song.id, "collaborations")}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit(song.id, "collaborations");
              }}
              placeholder="Select or add collaborators..."
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                minHeight: "20px",
              }}
            >
              {/* Show collaborators (excluding the song owner) */}
              {song.collaborations && song.collaborations.length > 0
                ? song.collaborations
                    .filter((collab) => collab.username !== song.author)
                    .map((collab) => (
                      <span
                        key={collab.id}
                        style={{
                          background: getCollaboratorColor(collab.username),
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        onClick={handleUsernameClick(collab.username)}
                        title="Click to view profile"
                      >
                        {collab.username}
                      </span>
                    ))
                : null}

              {/* Show "None" if no collaborators */}
              {(!song.collaborations || song.collaborations.length === 0) && (
                <span style={{ color: "#ccc", fontSize: "0.85rem" }}>
                  {status === "Future Plans" ? "Managed via pack" : "None"}
                </span>
              )}
            </div>
          )}
        </td>

        {/* Enhance + Delete */}
        <td style={{ padding: "8px" }}>
          {song.is_editable && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              {spotifyOptions[song.id] ? (
                <button
                  onClick={() =>
                    setSpotifyOptions((prev) => ({
                      ...prev,
                      [song.id]: undefined,
                    }))
                  }
                >
                  Cancel
                </button>
              ) : (
                <button onClick={() => fetchSpotifyOptions(song)}>
                  Enhance
                </button>
              )}
              {song.user_id === user?.id && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "red",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  ❌
                </button>
              )}
            </div>
          )}
        </td>
      </tr>

      {/* Spotify Enhancement Row */}
      <SpotifyEnhancementRow
        songId={song.id}
        options={spotifyOptions[song.id]}
        onApply={applySpotifyEnhancement}
      />

      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />

      <CustomAlert
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          handleDelete(song.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Song"
        message={`Are you sure you want to delete "${song.title}" by ${song.artist}?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
}
