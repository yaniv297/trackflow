import React, { useState, useEffect, useRef } from "react";
import EditableCell from "./EditableCell";
import SpotifyEnhancementRow from "./SpotifyEnhancementRow";

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

// Collaboration AutoComplete component for comma-separated values
const CollaborationAutoComplete = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  autoFocus = false,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/songs/autocomplete/collaborators?query=${encodeURIComponent(
          query
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1); // Reset selection when typing
    onChange(e); // Call parent onChange

    // Get the last part after the last comma for suggestions
    const parts = newValue.split(",");
    const lastPart = parts[parts.length - 1].trim();

    // Fetch suggestions for the last part
    fetchSuggestions(lastPart);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion) => {
    const parts = inputValue.split(",");
    parts[parts.length - 1] = suggestion; // Replace the last part
    const newValue = parts.join(", ");

    setInputValue(newValue);
    setShowSuggestions(false);

    // Create a synthetic event for the parent onChange
    const syntheticEvent = {
      target: { value: newValue },
    };
    onChange(syntheticEvent);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
    } else if (e.key === "Enter") {
      if (showSuggestions && suggestions.length > 0 && selectedIndex >= 0) {
        // Only auto-select if user has explicitly navigated to a suggestion
        e.preventDefault();
        const selectedSuggestion = suggestions[selectedIndex];
        handleSuggestionClick(selectedSuggestion);
      } else {
        // Otherwise, just save whatever the user typed
        if (onKeyDown) {
          onKeyDown(e);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
      setSelectedIndex(-1);
      // Let the parent handle escape (which should cancel the edit)
      if (onKeyDown) {
        onKeyDown(e);
      }
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleBlur = (e) => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 150);
    if (onBlur) onBlur(e);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        placeholder="Enter collaborators (comma-separated)..."
        autoFocus={autoFocus}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          fontSize: "0.85rem",
          padding: "2px 4px",
        }}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "0.85rem",
                borderBottom:
                  index < suggestions.length - 1 ? "1px solid #eee" : "none",
                backgroundColor: index === selectedIndex ? "#e3f2fd" : "white",
              }}
              onMouseEnter={(e) => {
                setSelectedIndex(index);
                e.target.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor =
                  index === selectedIndex ? "#e3f2fd" : "white";
              }}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
              onClick={() => setEditing({ [`${song.id}_album_cover`]: true })}
              style={{ cursor: "pointer" }}
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
        />

        {/* Collaborations */}
        <td
          className="editable-cell"
          onClick={() => setEditing({ [`${song.id}_collaborations`]: true })}
        >
          {editing[`${song.id}_collaborations`] ? (
            <CollaborationAutoComplete
              value={
                editValues[`${song.id}_collaborations`] ??
                (song.collaborations && song.collaborations.length > 0
                  ? song.collaborations
                      .filter((collab) => collab.author !== "yaniv297")
                      .map((collab) => collab.author)
                      .join(", ")
                  : "None")
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
                  .filter((collab) => collab.author !== "yaniv297")
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
