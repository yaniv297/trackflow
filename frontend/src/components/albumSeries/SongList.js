import React from "react";
import { getAuthorsForSong, calculateSongCompletion } from "../../utils/albumSeriesUtils";

/**
 * Component for rendering a list of songs
 */
const SongList = ({ songs, title, color, showCompletion = false }) => {
  if (!songs || songs.length === 0) return null;

  // Sort songs by completion percentage if showCompletion is true
  const sortedSongs = showCompletion
    ? [...songs].sort((a, b) => {
        const aCompletion = calculateSongCompletion(a);
        const bCompletion = calculateSongCompletion(b);
        return bCompletion - aCompletion; // Sort descending (highest first)
      })
    : songs;

  return (
    <div style={{ marginTop: "1rem" }}>
      <h3
        style={{
          fontSize: "1.1rem",
          fontWeight: "600",
          color: "#333",
          marginBottom: "0.75rem",
          paddingBottom: "0.25rem",
          borderBottom: `2px solid ${color}`,
        }}
      >
        {title} ({songs.length})
      </h3>
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        {sortedSongs.map((song, index) => {
          const authors = getAuthorsForSong(song);
          const songCompletion = showCompletion
            ? calculateSongCompletion(song)
            : null;

          return (
            <div
              key={song.id}
              style={{
                padding: "0.75rem",
                backgroundColor: "#f8f9fa",
                border: "1px solid #e0e0e0",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ flex: "1" }}>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "500",
                    color: "#333",
                    marginBottom: "0.25rem",
                  }}
                >
                  {index + 1}. {song.title}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#666",
                    marginBottom: showCompletion ? "0.5rem" : "0",
                  }}
                >
                  {song.artist}
                </div>
                {showCompletion && songCompletion !== null && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          color: "#495057",
                        }}
                      >
                        Progress
                      </span>
                      <div
                        style={{
                          background: "#e9ecef",
                          borderRadius: "4px",
                          height: "6px",
                          overflow: "hidden",
                          width: "100px",
                        }}
                      >
                        <div
                          style={{
                            background:
                              songCompletion === 100 ? "#28a745" : "#007bff",
                            width: `${songCompletion}%`,
                            height: "100%",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      {songCompletion !== 100 && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: "600",
                            color: "#007bff",
                          }}
                        >
                          {songCompletion}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "0.25rem",
                }}
              >
                {authors.map((author, authorIndex) => (
                  <div
                    key={authorIndex}
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "500",
                      backgroundColor: "#2196F3",
                      color: "white",
                    }}
                  >
                    {author}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SongList;

