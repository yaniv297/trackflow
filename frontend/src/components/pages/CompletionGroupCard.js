import React from "react";
import WipSongCard from "./WipSongCard";
import { useUserWorkflowFields } from "../../hooks/useUserWorkflowFields";

const CompletionGroupCard = ({
  categoryName,
  songs,
  isCollapsed,
  onToggle,
  user,
  authoringFields,
  selectedSongs,
  // Action handlers
  onUpdateAuthoringField,
  onToggleOptional,
  onDeleteSong,
  onSongUpdate,
}) => {
  const { fetchUserWorkflowFields, getWorkflowFields } =
    useUserWorkflowFields();

  // Fetch workflow fields for all unique song owners
  React.useEffect(() => {
    const uniqueUserIds = new Set();

    songs.forEach((song) => {
      if (song.user_id) {
        uniqueUserIds.add(song.user_id);
      }
    });

    // Fetch workflow fields for each unique user
    uniqueUserIds.forEach((userId) => {
      fetchUserWorkflowFields(userId);
    });
  }, [songs, fetchUserWorkflowFields]);

  if (!songs || songs.length === 0) return null;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {/* Category Header - match pack view styling */}
      <h4
        onClick={onToggle}
        style={{
          marginTop: "0",
          marginBottom: "1rem",
          color: "#6c757d",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <span>{isCollapsed ? "▶" : "▼"}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          {categoryName}
          <span style={{ color: "#666", fontWeight: 400 }}>
            ({songs.length} {songs.length === 1 ? "song" : "songs"})
          </span>
        </span>
      </h4>

      {/* Songs List */}
      {!isCollapsed && (
        <div>
          {songs.map((song) => {
            // Get the song owner's workflow fields
            const songOwnerFields = getWorkflowFields(song.user_id) || [];

            return (
              <WipSongCard
                key={song.id}
                song={song}
                showPackName={true}
                authoringFields={songOwnerFields}
                onAuthoringUpdate={(songId, field, value) =>
                  onUpdateAuthoringField(songId, field, value)
                }
                onDelete={() => onDeleteSong(song.id)}
                onToggleOptional={(songId, isOptional) =>
                  onToggleOptional(songId, isOptional)
                }
                defaultExpanded={false}
                readOnly={song.user_id !== user?.id}
                onSongUpdate={onSongUpdate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompletionGroupCard;
