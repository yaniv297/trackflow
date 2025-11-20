import React from "react";

const CollaboratorList = ({
  collaborationType,
  groupedCollaborators,
  loadingCollaborators,
  pendingRemovals,
  wipCollaborations,
  packSongs,
  songId,
  songTitle,
  onEditCollaborator,
  onRemoveCollaborator,
  onRemovePendingRemoval,
  onUsernameClick,
  dbToUiFieldMap
}) => {
  const getPermissionDescription = (collab) => {
    if (collaborationType === "pack") {
      // Check if this collaborator has song-level permissions
      const allCollabs = Object.values(groupedCollaborators)
        .flatMap(gc => gc.collaborations);
      const songCollabs = allCollabs.filter(
        (c) =>
          c.user_id === collab.user_id &&
          c.song_id &&
          c.collaboration_type === "song_edit"
      );

      if (collab.collaboration_type === "pack_edit") {
        return "Full permissions (pack view + edit)";
      } else if (collab.collaboration_type === "pack_view") {
        if (songCollabs.length > 0) {
          const songTitles = songCollabs
            .map((sc) => {
              const song = packSongs.find((ps) => ps.id === sc.song_id);
              return song ? song.title : `Song ${sc.song_id}`;
            })
            .join(", ");
          return `Pack view + song edit for: ${songTitles}`;
        } else {
          return "Read only (pack view)";
        }
      }
    } else if (collaborationType === "song") {
      return "Song edit permission";
    } else if (collaborationType === "pack_share") {
      return "Pack view permission (read-only)";
    }
    return collab.collaboration_type?.replace("_", " ") || "Unknown";
  };

  // Get WIP collaborations for display
  const getWipCollaborationsForUser = (username) => {
    const userWipCollabs = {};

    Object.entries(wipCollaborations).forEach(([targetSongId, assignments]) => {
      const userAssignments = assignments.filter(
        (a) => a.collaborator === username
      );
      if (userAssignments.length > 0) {
        let displayTitle;
        if (collaborationType === "song" && parseInt(targetSongId) === songId) {
          displayTitle = songTitle;
        } else {
          const song = packSongs.find((s) => s.id === parseInt(targetSongId));
          displayTitle = song ? song.title : `Song ${targetSongId}`;
        }

        if (displayTitle) {
          userWipCollabs[displayTitle] = userAssignments.map((a) =>
            a.field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          );
        }
      }
    });

    return userWipCollabs;
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "1rem",
          color: "#555",
        }}
      >
        Current Collaborators
      </h3>

      {loadingCollaborators ? (
        <p style={{ color: "#666", fontSize: "0.9rem" }}>Loading...</p>
      ) : Object.keys(groupedCollaborators).length === 0 ? (
        <p style={{ color: "#666", fontSize: "0.9rem" }}>
          No collaborators yet
        </p>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: "4px" }}>
          {Object.values(groupedCollaborators).map((collab, index) => {
            const isPendingRemoval = pendingRemovals.some(
              (removal) => removal.user_id === collab.user_id
            );
            const wipCollabs = getWipCollaborationsForUser(collab.username);

            return (
              <div
                key={collab.user_id}
                style={{
                  padding: "0.75rem",
                  borderBottom:
                    index < Object.keys(groupedCollaborators).length - 1
                      ? "1px solid #eee"
                      : "none",
                  backgroundColor: isPendingRemoval ? "#ffe6e6" : "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong
                      style={{
                        color: "#333",
                        cursor: "pointer",
                      }}
                      onClick={onUsernameClick(collab.username)}
                      title="Click to view profile"
                    >
                      {collab.username}
                    </strong>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#666",
                        marginTop: "0.25rem",
                      }}
                    >
                      {getPermissionDescription(collab.collaborations[0])}
                    </div>

                    {/* Show WIP instrument assignments */}
                    {Object.keys(wipCollabs).length > 0 && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                            color: "#555",
                          }}
                        >
                          Instrument Assignments:
                        </div>
                        {Object.entries(wipCollabs).map(
                          ([songTitleDisplay, instruments]) => (
                            <div
                              key={songTitleDisplay}
                              style={{
                                fontSize: "0.75rem",
                                color: "#666",
                                marginLeft: "0.5rem",
                              }}
                            >
                              {collaborationType === "song" ? (
                                <span>
                                  <strong>Instruments:</strong>{" "}
                                  {instruments.join(", ")}
                                </span>
                              ) : (
                                <span>
                                  <strong>{songTitleDisplay}:</strong>{" "}
                                  {instruments.join(", ")}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {isPendingRemoval ? (
                      <button
                        onClick={() => onRemovePendingRemoval(collab.user_id)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          background: "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        Undo Remove
                      </button>
                    ) : (
                      <>
                        {collaborationType === "song" && (
                          <button
                            onClick={() => onEditCollaborator(collab)}
                            style={{
                              padding: "0.25rem 0.5rem",
                              background: "#007bff",
                              color: "white",
                              border: "none",
                              borderRadius: "3px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveCollaborator(collab.user_id)}
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollaboratorList;