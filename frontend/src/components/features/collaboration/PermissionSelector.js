import React from "react";

const PermissionSelector = ({
  collaborationType,
  selectedUser,
  onPermissionSelect,
  onBack
}) => {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3
        style={{
          margin: "0 0 1rem 0",
          fontSize: "1rem",
          color: "#555",
        }}
      >
        Choose the type of collaboration for {selectedUser}
      </h3>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <button
          onClick={() => onPermissionSelect("full")}
          style={{
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            background: "#f8f9fa",
            cursor: "pointer",
            textAlign: "left",
            marginBottom: "0.5rem",
          }}
        >
          <strong>
            {collaborationType === "pack"
              ? "Full Pack Access"
              : "Full Song Access"}
          </strong>
          <br />
          <small style={{ color: "#666" }}>
            {collaborationType === "pack"
              ? "Can edit all songs in this pack"
              : "Can edit all instruments in this song"}
          </small>
        </button>

        <button
          onClick={() => onPermissionSelect("readonly")}
          style={{
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            background: "#f8f9fa",
            cursor: "pointer",
            textAlign: "left",
            marginBottom: "0.5rem",
          }}
        >
          <strong>Read Only</strong>
          <br />
          <small style={{ color: "#666" }}>
            Can view the pack and add songs, but cannot edit existing
            content
          </small>
        </button>

        <button
          onClick={() => onPermissionSelect("specific")}
          style={{
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            background: "#f8f9fa",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <strong>
            {collaborationType === "pack"
              ? "Choose Songs & Instruments"
              : "Choose Instruments"}
          </strong>
          <br />
          <small style={{ color: "#666" }}>
            {collaborationType === "pack"
              ? "Select specific songs and assign instruments"
              : "Assign specific instruments only"}
          </small>
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={onBack}
          style={{
            padding: "0.5rem 1rem",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default PermissionSelector;