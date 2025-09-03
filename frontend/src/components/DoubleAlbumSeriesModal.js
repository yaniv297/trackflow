import React from "react";

const DoubleAlbumSeriesModal = ({
  isOpen,
  onClose,
  onConfirm,
  packName,
  secondAlbumName,
  songsToMove,
  newPackName,
}) => {
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
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 8px 0", color: "#333" }}>
            🎵🎵 Create Double Album Series
          </h2>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
            This will split your pack into two separate album series.
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{ margin: "0 0 8px 0", color: "#333", fontSize: "16px" }}
            >
              Current Pack
            </h3>
            <div
              style={{
                padding: "12px",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
              }}
            >
              <strong>{packName}</strong>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{ margin: "0 0 8px 0", color: "#333", fontSize: "16px" }}
            >
              Album to Split Out
            </h3>
            <div
              style={{
                padding: "12px",
                backgroundColor: "#e3f2fd",
                borderRadius: "6px",
              }}
            >
              <strong>{secondAlbumName}</strong>
              <span
                style={{ color: "#666", fontSize: "14px", marginLeft: "8px" }}
              >
                ({songsToMove.length} songs)
              </span>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h3
              style={{ margin: "0 0 8px 0", color: "#333", fontSize: "16px" }}
            >
              New Pack Name
            </h3>
            <div
              style={{
                padding: "12px",
                backgroundColor: "#f3e5f5",
                borderRadius: "6px",
              }}
            >
              <strong>{newPackName}</strong>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#333", fontSize: "16px" }}>
            Songs That Will Be Moved:
          </h3>
          <div
            style={{
              maxHeight: "200px",
              overflow: "auto",
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              padding: "8px",
            }}
          >
            {songsToMove.map((song, index) => (
              <div
                key={song.id}
                style={{
                  padding: "8px",
                  backgroundColor: index % 2 === 0 ? "#f8f9fa" : "white",
                  borderBottom:
                    index < songsToMove.length - 1 ? "1px solid #eee" : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "14px" }}>{song.title}</span>
                <span style={{ fontSize: "12px", color: "#666" }}>
                  {song.artist}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#fff3cd",
              borderRadius: "6px",
              border: "1px solid #ffeaa7",
            }}
          >
            <strong>⚠️ What will happen:</strong>
            <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
              <li>
                All songs from "{secondAlbumName}" will be moved to a new pack
              </li>
              <li>
                A new album series will be created for "{secondAlbumName}"
              </li>
              <li>The original pack will keep its remaining songs</li>
              <li>This action cannot be easily undone</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            borderTop: "1px solid #eee",
            paddingTop: "20px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              backgroundColor: "white",
              color: "#666",
              cursor: "pointer",
              fontSize: "14px",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "white";
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: "#5a8fcf",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#4a7cbd";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#5a8fcf";
            }}
          >
            🎵🎵 Create Double Album Series
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoubleAlbumSeriesModal;
