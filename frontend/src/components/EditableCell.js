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
}) {
  const key = `${songId}_${field}`;
  const isEditing = editing[key];
  const displayValue = editValues[key] ?? value;

  // Determine if this field should use autocomplete
  const shouldUseAutocomplete = ["artist", "album", "pack"].includes(field);
  const autocompleteType = field; // Use the field name directly for autocomplete type

  // Special handling for album_cover field
  const isAlbumCover = field === "album_cover";

  const handleChange = (e) => {
    setEditValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") saveEdit(songId, field);
    if (e.key === "Escape") {
      // Cancel edit and restore original value
      setEditValues((prev) => ({ ...prev, [key]: value }));
      setEditing({ [key]: false });
    }
  };

  const handleBlur = () => {
    saveEdit(songId, field);
  };

  return (
    <td className="editable-cell" onClick={() => setEditing({ [key]: true })}>
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
        displayValue
      )}
    </td>
  );
}
