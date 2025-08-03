import React from "react";

const BulkActionsToolbar = ({
  selectedSongs,
  songs,
  onBulkEdit,
  onStartWork,
  status,
}) => {
  if (selectedSongs.length === 0) return null;

  // Component shows bulk actions for selected songs

  return (
    <div
      className="bulk-actions"
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        background: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "8px",
        padding: "0.7rem 1.2rem",
        marginBottom: "1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <span style={{ fontWeight: 500, color: "#333", fontSize: "1rem" }}>
        {selectedSongs.length} selected
      </span>

      <button
        onClick={onBulkEdit}
        style={{
          background: "#f3f4f6",
          color: "#222",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          padding: "0.5rem 1.1rem",
          fontWeight: 600,
          fontSize: "1rem",
          cursor: "pointer",
          transition: "background 0.2s, border 0.2s",
        }}
      >
        Bulk Actions
      </button>

      {status === "Future Plans" && (
        <button
          onClick={onStartWork}
          style={{
            background: "#f3f4f6",
            color: "#222",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "0.5rem 1.1rem",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            transition: "background 0.2s, border 0.2s",
          }}
        >
          Start Work
        </button>
      )}
    </div>
  );
};

export default BulkActionsToolbar;
