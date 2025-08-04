import React, { useState, useEffect, useCallback } from "react";
import AutoComplete from "./AutoComplete";

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:8001"
    : window.location.origin);

export default function WipCollaborationModal({
  song,
  isOpen,
  onClose,
  onSave,
}) {
  const [assignments, setAssignments] = useState([]);
  const [bulkCollaborator, setBulkCollaborator] = useState("");
  const [bulkFields, setBulkFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState(null);

  const fields = [
    "Demucs",
    "Midi",
    "Tempo Map",
    "Fake Ending",
    "Drums",
    "Bass",
    "Guitar",
    "Vocals",
    "Harmonies",
    "Pro Keys",
    "Keys",
    "Animations",
    "Drum Fills",
    "Overdrive",
    "Compile",
  ];

  const loadWipCollaborations = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/authoring/${song.id}/wip-collaborations`
      );

      if (response.ok) {
        const data = await response.json();

        setAssignments(data.assignments || []);
      } else {
        console.error("Failed to load WIP collaborations:", response.status);
        const errorText = await response.text();
        console.error("Error text:", errorText);
      }
    } catch (error) {
      console.error("Error loading WIP collaborations:", error);
    }
  }, [song?.id]);

  // Load existing WIP collaborations when modal opens
  useEffect(() => {
    if (isOpen && song) {
      loadWipCollaborations();
    }
  }, [isOpen, song, loadWipCollaborations]);

  const handleBulkAssign = () => {
    if (!bulkCollaborator || bulkFields.length === 0) return;

    const newAssignments = bulkFields.map((field) => ({
      collaborator: bulkCollaborator,
      field: field.toLowerCase().replace(/\s+/g, "_"),
    }));

    setAssignments((prev) => {
      // If editing, remove existing assignments for this collaborator first
      const filtered = editingCollaborator
        ? prev.filter((a) => a.collaborator !== editingCollaborator)
        : prev;

      const result = [...filtered, ...newAssignments];
      return result;
    });

    setBulkCollaborator("");
    setBulkFields([]);
    setEditingCollaborator(null);
  };

  const removeAssignment = (collaborator) => {
    setAssignments((prev) =>
      prev.filter((a) => a.collaborator !== collaborator)
    );
  };

  const editCollaborator = (collaborator) => {
    // Get all fields assigned to this collaborator
    const collaboratorFields = assignments
      .filter((a) => a.collaborator === collaborator)
      .map((a) =>
        a.field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      );

    setBulkCollaborator(collaborator);
    setBulkFields(collaboratorFields);
    setEditingCollaborator(collaborator);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/authoring/${song.id}/wip-collaborations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments }),
        }
      );

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const errorText = await response.text();
        console.error(
          "Failed to save WIP collaborations:",
          response.status,
          errorText
        );
      }
    } catch (error) {
      console.error("Error saving WIP collaborations:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBulkField = (field) => {
    setBulkFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const getCollaboratorColor = (collaborator) => {
    const colors = [
      "#3498db",
      "#e74c3c",
      "#2ecc71",
      "#f39c12",
      "#9b59b6",
      "#1abc9c",
      "#e67e22",
      "#34495e",
      "#16a085",
      "#8e44ad",
    ];
    const index = collaborator.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Group assignments by collaborator
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.collaborator]) {
      acc[assignment.collaborator] = [];
    }
    acc[assignment.collaborator].push(assignment.field);
    return acc;
  }, {});

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem", position: "relative" }}>
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
              padding: "0.25rem",
              borderRadius: "4px",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#333")}
            onMouseLeave={(e) => (e.target.style.color = "#666")}
          >
            ×
          </button>
          <h2
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.5rem",
              fontWeight: "600",
            }}
          >
            Edit Collaborations
          </h2>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.1rem",
              color: "#666",
            }}
          >
            {song.title} - {song.artist}
          </h3>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#888" }}>
            Assign collaborators to specific authoring fields. Fields without
            assignments belong to the main user.
          </p>
        </div>

        {/* Assign Collaborator Section */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              margin: "0 0 1rem 0",
              fontSize: "1.1rem",
              fontWeight: "600",
            }}
          >
            {editingCollaborator
              ? `Edit ${editingCollaborator}`
              : "Assign Collaborator"}
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <AutoComplete
              value={bulkCollaborator}
              onChange={(e) => setBulkCollaborator(e.target.value)}
              type="collaborator"
              placeholder="Select collaborator..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.5rem" }}>
              <button
                onClick={() => setBulkFields(fields)}
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  marginRight: "0.5rem",
                }}
              >
                Select All
              </button>
              <button
                onClick={() => setBulkFields([])}
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Clear All
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "0.5rem",
                maxHeight: "200px",
                overflowY: "auto",
                padding: "0.5rem",
                border: "1px solid #eee",
                borderRadius: "4px",
              }}
            >
              {fields.map((field) => (
                <label
                  key={field}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={bulkFields.includes(field)}
                    onChange={() => toggleBulkField(field)}
                    style={{ marginRight: "0.5rem" }}
                  />
                  {field}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleBulkAssign}
              disabled={!bulkCollaborator || bulkFields.length === 0}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor:
                  !bulkCollaborator || bulkFields.length === 0
                    ? "#ccc"
                    : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  !bulkCollaborator || bulkFields.length === 0
                    ? "not-allowed"
                    : "pointer",
                fontSize: "0.9rem",
              }}
            >
              {editingCollaborator
                ? "Update Assignment"
                : "Assign to Selected Fields"}
            </button>
            {editingCollaborator && (
              <button
                onClick={() => {
                  setBulkCollaborator("");
                  setBulkFields([]);
                  setEditingCollaborator(null);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Current Assignments Section */}
        {Object.keys(groupedAssignments).length > 0 && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              border: "1px solid #007bff",
              borderRadius: "4px",
              backgroundColor: "#f8f9fa",
            }}
          >
            <h3
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1.1rem",
                fontWeight: "600",
                color: "#007bff",
              }}
            >
              Current Assignments
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {Object.entries(groupedAssignments).map(
                ([collaborator, fields]) => (
                  <div
                    key={collaborator}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: getCollaboratorColor(collaborator),
                        color: "white",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "12px",
                        fontSize: "0.8rem",
                        fontWeight: "500",
                      }}
                    >
                      {collaborator}
                    </span>
                    <span style={{ fontSize: "0.85rem", flex: 1 }}>
                      {fields
                        .map((field) =>
                          field
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())
                        )
                        .join(", ")}
                    </span>
                    <button
                      onClick={() => editCollaborator(collaborator)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#007bff",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        textDecoration: "underline",
                        marginRight: "0.5rem",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeAssignment(collaborator)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#dc3545",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        textDecoration: "underline",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            borderTop: "1px solid #eee",
            paddingTop: "1rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "white",
              color: "#666",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            {loading ? "Saving..." : "Save Collaborations"}
          </button>
        </div>
      </div>
    </div>
  );
}
