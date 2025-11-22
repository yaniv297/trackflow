import React from "react";

const EditCollaborator = ({
  editingCollaborator,
  selectedInstruments,
  instrumentFields,
  loading,
  onInstrumentSelection,
  onSaveEdit,
  onCancelEdit
}) => {
  if (!editingCollaborator) return null;

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        padding: "1rem",
        border: "2px solid #007bff",
        borderRadius: "4px",
        backgroundColor: "#f8f9fa",
      }}
    >
      <h3
        style={{
          margin: "0 0 1rem 0",
          fontSize: "1rem",
          color: "#007bff",
        }}
      >
        Edit Collaboration - {editingCollaborator.username}
      </h3>

      <div>
        <p style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
          Select instruments to assign to {editingCollaborator.username}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {instrumentFields.map((instrument) => (
            <label
              key={instrument}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: "pointer",
                backgroundColor: selectedInstruments.includes(instrument)
                  ? "#e3f2fd"
                  : "white",
              }}
            >
              <input
                type="checkbox"
                checked={selectedInstruments.includes(instrument)}
                onChange={(e) =>
                  onInstrumentSelection(instrument, e.target.checked)
                }
              />
              {instrument}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onSaveEdit}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onCancelEdit}
            style={{
              padding: "0.5rem 1rem",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCollaborator;