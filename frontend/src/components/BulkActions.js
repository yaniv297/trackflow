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
        Bulk Edit
      </button>

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

      <button
        onClick={onCleanTitles}
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
        Clean Remaster Tags
      </button>

      <button
        onClick={onBulkEnhance}
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
        Bulk Enhance
      </button>

      <button
        onClick={onBulkDelete}
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
        Bulk Delete
      </button>

      {showAlbumSeriesButton && (
        <button
          onClick={onShowAlbumSeriesModal}
          style={{
            background: "#4CAF50",
            color: "white",
            border: "1px solid #45a049",
            borderRadius: "6px",
            padding: "0.28rem 0.9rem",
            fontWeight: 600,
            fontSize: "0.98rem",
            cursor: "pointer",
            transition: "background 0.2s, border 0.2s",
          }}
        >
          🎵 Create Album Series
        </button>
      )}

      {canMakeDoubleAlbumSeries && (
        <button
          onClick={() =>
            onMakeDoubleAlbumSeries(packName, albumsWithEnoughSongs)
          }
          style={{
            background: "#FF6B35",
            color: "white",
            border: "1px solid #E55A2B",
            borderRadius: "6px",
            padding: "0.28rem 0.9rem",
            fontWeight: 600,
            fontSize: "0.98rem",
            cursor: "pointer",
            transition: "background 0.2s, border 0.2s",
          }}
          title={`Split "${albumsWithEnoughSongs[1][0]}" into its own album series (${albumsWithEnoughSongs[1][1]} songs)`}
        >
          🎵🎵 Make Double Album Series
        </button>
      )}
    </div>
  );
};

export default BulkActions;
