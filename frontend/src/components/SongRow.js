import React, { useState, useEffect, useRef } from "react";
import EditableCell from "./EditableCell";
import SpotifyEnhancementRow from "./SpotifyEnhancementRow";
import UserDropdown from "./UserDropdown";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

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
  // Safety check for undefined or null values
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
}) {
  const { user } = useAuth();
  return (
    <>
      <tr>
        {/* Checkbox */}
        <td>
          <input
            type="checkbox"
            className="pretty-checkbox"
            checked={selected}
            onChange={onSelect}
            disabled={!song.is_editable}
            style={{
              opacity: song.is_editable ? 1 : 0.5,
            }}
          />
        </td>

        {/* Album Cover */}
        <td>
          {editing[`${song.id}_album_cover`] ? (
            <EditableCell
              value={song.album_cover || ""}
              songId={song.id}
              field="album_cover"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
            />
          ) : (
            <div
              className="editable-cell"
              onClick={() =>
                song.is_editable &&
                setEditing({ [`${song.id}_album_cover`]: true })
              }
              style={{
                cursor: song.is_editable ? "pointer" : "default",
                opacity: song.is_editable ? 1 : 0.6,
              }}
            >
              {song.album_cover && (
                <img
                  src={song.album_cover}
                  alt="cover"
                  style={{
                    width: "50px",
                    height: "50px",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>
          )}
        </td>

        {/* Editable fields */}
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
        <EditableCell
          value={song.pack}
          songId={song.id}
          field="pack"
          editing={editing}
          editValues={editValues}
          setEditing={setEditing}
          setEditValues={setEditValues}
          saveEdit={saveEdit}
          isEditable={song.is_editable}
        />

        {/* Status */}
        <td>
          <span className={`status ${song.status.replaceAll(" ", "-")}`}>
            {song.status}
          </span>
        </td>

        {/* Year */}
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

        {/* Collaborations */}
        <td
          className="editable-cell"
          onClick={() =>
            song.is_editable &&
            setEditing({ [`${song.id}_collaborations`]: true })
          }
          style={{
            cursor: song.is_editable ? "pointer" : "default",
            opacity: song.is_editable ? 1 : 0.6,
            backgroundColor: song.is_editable ? "transparent" : "#f8f9fa",
          }}
        >
          {editing[`${song.id}_collaborations`] ? (
            <UserDropdown
              value={
                editValues[`${song.id}_collaborations`] ??
                (song.collaborations && song.collaborations.length > 0
                  ? song.collaborations
                      .filter((collab) => collab.author !== user.username)
                      .map((collab) => collab.author)
                      .join(", ")
                  : "")
              }
              onChange={(e) =>
                setEditValues((prev) => ({
                  ...prev,
                  [`${song.id}_collaborations`]: e.target.value,
                }))
              }
              onBlur={() => saveEdit(song.id, "collaborations")}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit(song.id, "collaborations");
              }}
              autoFocus
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
              {song.collaborations && song.collaborations.length > 0 ? (
                song.collaborations
                  .filter((collab) => collab.author !== user.username)
                  .map((collab) => (
                    <span
                      key={collab.id}
                      style={{
                        background: getCollaboratorColor(collab.author),
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {collab.author}
                    </span>
                  ))
              ) : (
                <span style={{ color: "#ccc", fontSize: "0.85rem" }}>None</span>
              )}
            </div>
          )}
        </td>

        {/* Enhance + Delete */}
        <td>
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
              <button onClick={() => fetchSpotifyOptions(song)}>Enhance</button>
            )}
            <button
              onClick={() => handleDelete(song.id)}
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
          </div>
        </td>
      </tr>

      {/* Spotify Enhancement Row */}
      <SpotifyEnhancementRow
        songId={song.id}
        options={spotifyOptions[song.id]}
        onApply={applySpotifyEnhancement}
      />
    </>
  );
}
