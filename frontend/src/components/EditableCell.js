import React from "react";

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

  return (
    <td
      className="editable-cell"
      onClick={() => setEditing({ [key]: true })}
    >
      {isEditing ? (
        <input
          value={displayValue}
          onChange={(e) =>
            setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
          }
          onBlur={() => saveEdit(songId, field)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit(songId, field);
          }}
          autoFocus
        />
      ) : (
        displayValue
      )}
    </td>
  );
}
