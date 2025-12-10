import React from "react";
import AutoComplete from "./AutoComplete";

export default function EditableCell({
  value,
  songId,
  field,
  editing,
  editValues,
  setEditing,
  setEditValues,
  saveEdit,
  isEditable = true,
}) {
  const key = `${songId}_${field}`;
  const isEditing = editing[key];
  const displayValue = editValues[key] ?? value;

  // Disable autocomplete temporarily due to 403 errors on autocomplete endpoints
  const shouldUseAutocomplete = false; // ["artist", "album", "pack"].includes(field);
  const autocompleteType = field; // Use the field name directly for autocomplete type

  // Special handling for album_cover field
  const isAlbumCover = field === "album_cover";
  // Special handling for notes field
  const isNotes = field === "notes";

  const handleChange = (e) => {
    setEditValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleKeyDown = (e) => {
    // For notes field, only save on Ctrl+Enter or Escape
    if (isNotes) {
      if (e.key === "Enter" && e.ctrlKey) saveEdit(songId, field);
      if (e.key === "Escape") {
        // Cancel edit and restore original value
        setEditValues((prev) => ({ ...prev, [key]: value }));
        setEditing({ [key]: false });
      }
    } else {
      if (e.key === "Enter") saveEdit(songId, field);
      if (e.key === "Escape") {
        // Cancel edit and restore original value
        setEditValues((prev) => ({ ...prev, [key]: value }));
        setEditing({ [key]: false });
      }
    }
  };

  const handleBlur = () => {
    saveEdit(songId, field);
  };

  const handleClick = () => {
    if (isEditable) {
      // Initialize editValues with current value when entering edit mode
      // This ensures that if user doesn't change anything, we still have the original value to save
      // Use a function form to ensure we're working with the latest state
      setEditValues((prev) => {
        if (prev[key] === undefined) {
          return { ...prev, [key]: value };
        }
        return prev;
      });
      setEditing({ [key]: true });
    }
  };

  return (
    <div 
      className="editable-cell" 
      onClick={handleClick}
      style={{
        cursor: isEditable ? "pointer" : "default",
        opacity: isEditable ? 1 : 0.6,
        backgroundColor: isEditable ? "transparent" : "#f8f9fa",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {isEditing ? (
        shouldUseAutocomplete ? (
          <AutoComplete
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            type={autocompleteType}
            autoFocus={true}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: "0.85rem",
              padding: "2px 4px",
            }}
          />
        ) : isAlbumCover ? (
          <input
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Enter artwork URL..."
            autoFocus
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: "0.85rem",
              padding: "2px 4px",
            }}
          />
        ) : isNotes ? (
          <textarea
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Progress notes... (Ctrl+Enter to save)"
            autoFocus
            rows="2"
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: "0.85rem",
              padding: "2px 4px",
              resize: "vertical",
              minHeight: "40px",
            }}
          />
        ) : (
          <input
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        )
      ) : (
        <>
          {isAlbumCover && displayValue ? (
            <img
              src={displayValue}
              alt="cover"
              style={{
                width: "50px",
                height: "50px",
                aspectRatio: "1",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : isNotes ? (
            <div style={{ 
              flex: 1, 
              fontSize: "0.85rem", 
              color: displayValue ? "#333" : "#999",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "60px",
              overflowY: "auto",
              padding: "2px 0"
            }}>
              {displayValue || "Click to add notes..."}
            </div>
          ) : (
            <span style={{ flex: 1 }}>{displayValue}</span>
          )}
        </>
      )}
    </div>
  );
}
