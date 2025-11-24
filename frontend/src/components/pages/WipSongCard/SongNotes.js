import React, { useState } from "react";

/**
 * Component for displaying and editing song notes
 */
const SongNotes = ({ 
  song, 
  notes, 
  onSaveNotes, 
  readOnly = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(notes || "");

  const handleSave = async () => {
    try {
      await onSaveNotes(song.id, noteValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleCancel = () => {
    setNoteValue(notes || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (readOnly) {
    if (!notes) return null;
    return (
      <div style={{ marginTop: "0.5rem" }}>
        <div
          style={{
            fontSize: "0.85rem",
            color: "#666",
            lineHeight: "1.4",
          }}
        >
          {notes}
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      {isEditing ? (
        <div>
          <textarea
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add notes about this song... (Ctrl+Enter to save, Escape to cancel)"
            autoFocus
            rows="3"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "0.85rem",
              fontFamily: "inherit",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            <button
              onClick={handleSave}
              style={{
                padding: "0.25rem 0.75rem",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: "0.25rem 0.75rem",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {notes ? (
            <div
              onClick={() => setIsEditing(true)}
              style={{
                fontSize: "0.85rem",
                color: "#666",
                cursor: "pointer",
                lineHeight: "1.4",
                padding: "0.25rem 0",
              }}
              title="Click to edit notes"
            >
              {notes}
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: "none",
                border: "none",
                color: "#007bff",
                fontSize: "0.8rem",
                cursor: "pointer",
                textDecoration: "none",
                padding: "0",
              }}
              title="Add notes about this song"
            >
              + Add notes
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SongNotes;