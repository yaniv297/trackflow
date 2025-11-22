import React from "react";
import { getFieldCompletion } from "../../../utils/progressUtils";

/**
 * Component for displaying and managing authoring fields
 */
const AuthoringFields = ({
  song,
  fields,
  wipCollaborations,
  onToggleAuthoringField,
  onUsernameClick,
  readOnly = false,
}) => {
  const renderFieldBadge = (field, filled) => {
    const displayName = field
      .split("_")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

    const bg = filled ? "#4caf50" : "#ddd";
    const color = filled ? "white" : "black";

    return (
      <span
        key={field}
        onClick={() => !readOnly && onToggleAuthoringField(field)}
        style={{
          padding: "0.25rem 0.6rem",
          borderRadius: "12px",
          fontSize: "0.85rem",
          backgroundColor: bg,
          color,
          display: "inline-flex",
          alignItems: "center",
          lineHeight: "1",
          cursor: readOnly ? "default" : "pointer",
          userSelect: "none",
          opacity: readOnly ? 0.7 : 1,
        }}
      >
        {displayName}
      </span>
    );
  };

  const renderCollaboratorSection = (collaborator, assignedFields, isOwner = false) => {
    return (
      <div key={collaborator} style={{ marginBottom: "0.5rem" }}>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: "bold",
            marginBottom: "0.25rem",
            color: "#666",
            cursor: "pointer",
          }}
          onClick={onUsernameClick(collaborator)}
          title="Click to view profile"
        >
          {collaborator}:
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          {assignedFields.map((field) => {
            const filled = getFieldCompletion(song, field);
            return renderFieldBadge(field, filled);
          })}
        </div>
      </div>
    );
  };

  // Show fields grouped by collaborator if collaborations exist
  if (wipCollaborations.length > 0) {
    // Group collaborations by collaborator
    const collaboratorGroups = {};
    wipCollaborations.forEach((collab) => {
      if (!collaboratorGroups[collab.collaborator]) {
        collaboratorGroups[collab.collaborator] = [];
      }
      collaboratorGroups[collab.collaborator].push(collab.field);
    });

    // Get all fields that are NOT assigned to any collaborator (these belong to the song owner)
    const assignedFields = new Set(
      wipCollaborations.map((collab) => collab.field)
    );
    const unassignedFields = fields.filter(
      (field) => !assignedFields.has(field)
    );

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          flexGrow: 1,
        }}
      >
        <div>
          {/* Add song owner's unassigned fields */}
          {unassignedFields.length > 0 && 
            renderCollaboratorSection(
              song.author || "Song Owner", 
              unassignedFields, 
              true
            )
          }

          {/* Add collaborators' explicitly assigned fields */}
          {Object.entries(collaboratorGroups).map(([collaborator, assignedFields]) =>
            renderCollaboratorSection(collaborator, assignedFields, false)
          )}
        </div>

        {/* Read-only notice for collaborator songs */}
        {readOnly && (
          <div
            style={{
              marginLeft: "0.2rem",
              marginTop: "0.4rem",
              fontSize: "0.91rem",
              color: "#999",
              fontWeight: 400,
              textAlign: "left",
            }}
          >
            <span
              style={{
                color: "#999",
                fontStyle: "italic",
                fontSize: "0.8rem",
              }}
            >
              Read-only (owned by collaborator)
            </span>
          </div>
        )}
      </div>
    );
  }

  // Show regular fields if no collaborations
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        flexGrow: 1,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {fields.map((field) => {
          const filled = getFieldCompletion(song, field);
          return renderFieldBadge(field, filled);
        })}
      </div>
    </div>
  );
};

export default AuthoringFields;