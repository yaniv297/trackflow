import React from "react";
import ExternalLinks from "./ExternalLinks";

/**
 * Component for displaying and editing song metadata (title, artist, album, year)
 */
const SongMetadata = ({ 
  song, 
  editValues, 
  editing, 
  onStartEdit, 
  onSaveEdit, 
  onEditValueChange, 
  readOnly = false,
  showPackName = false 
}) => {
  const renderEditable = (field, style = {}) => {
    if (readOnly) {
      return (
        <span style={{ cursor: "default", color: "#666", ...style }}>
          {editValues[field]}
        </span>
      );
    }

    return editing[field] ? (
      <input
        value={editValues[field]}
        autoFocus
        onChange={(e) => onEditValueChange(field, e.target.value)}
        onBlur={() => onSaveEdit(field)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSaveEdit(field);
        }}
        style={{
          fontSize: "1.1rem",
          fontWeight: "600",
          padding: "2px 6px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          ...style,
        }}
      />
    ) : (
      <span
        onClick={() => onStartEdit(field)}
        style={{ cursor: "pointer", ...style }}
        title="Click to edit"
      >
        {editValues[field]}
      </span>
    );
  };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
        {renderEditable("title")}
        <span
          style={{
            fontStyle: "italic",
            fontWeight: "400",
            color: "#555",
            marginLeft: 6,
          }}
        >
          – {renderEditable("artist")}
        </span>
      </div>
      
      <div
        style={{
          fontSize: "0.9rem",
          color: "#888",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        {renderEditable("album")}
        
        {/* External links */}
        <ExternalLinks editValues={editValues} />
        
        {editValues.year && (
          <>
            {" "}
            (
            {renderEditable("year", {
              fontSize: "0.9rem",
              width: "4ch",
              textAlign: "center",
            })}
            )
          </>
        )}
      </div>

      {showPackName && song.pack_name && (
        <div
          style={{
            fontSize: "0.85rem",
            color: "#999",
            marginTop: "0.2rem",
          }}
        >
          Pack: {song.pack_name}
        </div>
      )}
    </div>
  );
};

export default SongMetadata;