import React from "react";

const BulkActions = ({
  selectedSongs,
  onBulkEdit,
  onBulkDelete,
  onBulkEnhance,
  onStartWork,
  onCleanTitles,
  showAlbumSeriesButton,
  onShowAlbumSeriesModal,
  showDoubleAlbumSeriesButton,
  onMakeDoubleAlbumSeries,
  packName,
  albumsWithEnoughSongs,
  canMakeDoubleAlbumSeries,
  status,
}) => {
  if (selectedSongs.length === 0) return null;

  return (
    <div
      style={{
        display: "inline-flex",
        gap: "0.4rem",
        marginLeft: "1.2rem",
        verticalAlign: "middle",
      }}
    >
      <button
        onClick={onBulkEdit}
        style={{
          background: "#f3f4f6",
          color: "#222",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          padding: "0.28rem 0.9rem",
          fontWeight: 600,
          fontSize: "0.98rem",
          cursor: "pointer",
          transition: "background 0.2s, border 0.2s",
        }}
      >
        Bulk Actions
      </button>

      {status === "Future Plans" && (
        <button
          onClick={onStartWork}
          style={{
            background: "#f3f4f6",
            color: "#222",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "0.28rem 0.9rem",
            fontWeight: 600,
            fontSize: "0.98rem",
            cursor: "pointer",
            transition: "background 0.2s, border 0.2s",
          }}
        >
          Start Work
        </button>
      )}
    </div>
  );
};

export default BulkActions;
