import React from "react";

const PendingChanges = ({
  pendingCollaborations,
  pendingRemovals,
  onRemovePendingCollaboration,
  onUsernameClick
}) => {
  const hasPendingChanges = pendingCollaborations.length > 0 || pendingRemovals.length > 0;

  return (
    <>
      {/* Pending Collaborations */}
      {pendingCollaborations.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1rem",
              color: "#555",
            }}
          >
            Pending Collaborations
          </h3>
          <div style={{ border: "1px solid #ddd", borderRadius: "4px" }}>
            {pendingCollaborations.map((collab, index) => (
              <div
                key={index}
                style={{
                  padding: "0.75rem",
                  borderBottom:
                    index < pendingCollaborations.length - 1
                      ? "1px solid #eee"
                      : "none",
                  backgroundColor: "#e8f5e8",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <strong
                      style={{ cursor: "pointer" }}
                      onClick={onUsernameClick(collab.username)}
                      title="Click to view profile"
                    >
                      {collab.username}
                    </strong>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>
                      {collab.type === "full" && "Full permissions"}
                      {collab.type === "readonly" && "Read only (pack view)"}
                      {collab.type === "song_edit" && "Song edit permission"}
                      {collab.type === "specific" &&
                        `${
                          collab.instruments
                            ? collab.instruments.join(", ")
                            : "Song edit"
                        } for: ${collab.songs
                          .map((s) => s.title)
                          .join(", ")}`}
                      {collab.type === "pack_share" &&
                        "Pack view permission (read-only)"}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemovePendingCollaboration(index)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note about saving */}
      {hasPendingChanges && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.5rem",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "4px",
            fontSize: "0.8rem",
            color: "#856404",
          }}
        >
          <strong>Note:</strong> Collaborators are not actually created
          until you click the "Save" button.
        </div>
      )}
    </>
  );
};

export default PendingChanges;