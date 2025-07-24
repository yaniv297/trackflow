import React from "react";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const AlbumSeriesModal = ({
  showModal,
  onClose,
  formData,
  setFormData,
  onSubmit,
  selectedSongs,
  songs,
  title = "Create Album Series",
}) => {
  if (!showModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.18)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "2rem 2.5rem",
          minWidth: 400,
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#333" }}>{title}</h2>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.3rem",
                fontWeight: 600,
              }}
            >
              Artist Name *
            </label>
            <input
              type="text"
              value={formData.artist_name}
              onChange={(e) =>
                setFormData({ ...formData, artist_name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.6rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "0.9rem",
              }}
              placeholder="Enter artist name"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.3rem",
                fontWeight: 600,
              }}
            >
              Album Name *
            </label>
            <input
              type="text"
              value={formData.album_name}
              onChange={(e) =>
                setFormData({ ...formData, album_name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.6rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "0.9rem",
              }}
              placeholder="Enter album name"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.3rem",
                fontWeight: 600,
              }}
            >
              Year
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.6rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "0.9rem",
              }}
              placeholder="e.g., 2023"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.3rem",
                fontWeight: 600,
              }}
            >
              Cover Image URL
            </label>
            <input
              type="url"
              value={formData.cover_image_url}
              onChange={(e) =>
                setFormData({ ...formData, cover_image_url: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.6rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "0.9rem",
              }}
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.3rem",
                fontWeight: 600,
              }}
            >
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.6rem",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "0.9rem",
                minHeight: "80px",
                resize: "vertical",
              }}
              placeholder="Optional description of the album series"
            />
          </div>

          {selectedSongs && selectedSongs.length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.3rem",
                  fontWeight: 600,
                }}
              >
                Selected Songs ({selectedSongs.length})
              </label>
              <div
                style={{
                  maxHeight: "120px",
                  overflowY: "auto",
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  padding: "0.5rem",
                  background: "#f9f9f9",
                }}
              >
                {selectedSongs.map((songId) => {
                  const song = songs.find((s) => s.id === songId);
                  return song ? (
                    <div
                      key={songId}
                      style={{
                        fontSize: "0.85rem",
                        padding: "0.2rem 0",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {song.title} - {song.artist}
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            justifyContent: "flex-end",
            marginTop: "1rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.6rem 1.2rem",
              border: "1px solid #ddd",
              borderRadius: "6px",
              background: "#f8f9fa",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            style={{
              padding: "0.6rem 1.2rem",
              border: "none",
              borderRadius: "6px",
              background: "#4CAF50",
              color: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            Create Album Series
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlbumSeriesModal;
