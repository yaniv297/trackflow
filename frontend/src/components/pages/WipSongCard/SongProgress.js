import React from "react";

/**
 * Component for displaying song progress bar and optional toggle
 */
const SongProgress = ({ 
  progressData, 
  fields, 
  isOptional, 
  onToggleOptional, 
  songId, 
  readOnly = false 
}) => {
  const { completedCount, percentage, isComplete } = progressData;

  return (
    <div style={{ textAlign: "right", minWidth: 150 }}>
      <div
        style={{
          background: "#eee",
          borderRadius: 6,
          height: 10,
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            background: percentage === 100 ? "#2ecc71" : "#3498db",
            width: `${percentage}%`,
            height: "100%",
          }}
        />
      </div>
      <small style={{ fontSize: "0.8rem", color: "#444" }}>
        {completedCount} / {fields.length} parts
      </small>
      {!isComplete && !readOnly && (
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginLeft: "0.7rem",
            fontSize: "0.89rem",
            color: "#bbb",
            cursor: "pointer",
            fontWeight: 400,
          }}
          title={
            isOptional ? "This song is optional" : "This song is core"
          }
        >
          <input
            type="checkbox"
            checked={isOptional}
            onChange={() => onToggleOptional(songId, isOptional)}
            style={{
              marginRight: "0.25em",
              accentColor: "#b0c4de",
              width: "0.95em",
              height: "0.95em",
            }}
          />
          Optional
        </label>
      )}
    </div>
  );
};

export default SongProgress;