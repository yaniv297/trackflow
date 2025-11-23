import React from "react";

/**
 * Component for displaying pack creation progress
 */
const PackFormProgress = ({ progress }) => {
  if (!progress.phase) return null;

  return (
    <div
      style={{
        marginTop: "1.5rem",
        padding: "1rem",
        background: "#f8f9fa",
        borderRadius: "8px",
        border: "1px solid #e9ecef",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontWeight: "500", color: "#495057" }}>
          {progress.phase}
        </span>
        <span style={{ fontSize: "0.9rem", color: "#6c757d" }}>
          {progress.current}/{progress.total}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "8px",
          background: "#e9ecef",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${
              progress.total > 0
                ? (progress.current / progress.total) * 100
                : 0
            }%`,
            height: "100%",
            background: "linear-gradient(90deg, #007bff, #0056b3)",
            borderRadius: "4px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};

export default PackFormProgress;

