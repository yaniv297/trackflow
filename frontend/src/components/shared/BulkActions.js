import React, { useState } from "react";
import CustomAlert from "../ui/CustomAlert";

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
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning",
  });

  const handleBulkEditClick = () => {
    if (selectedSongs.length === 0) {
      setAlertConfig({
        isOpen: true,
        title: "No Songs Selected",
        message: "Please select at least one song to perform bulk actions.",
        onConfirm: () => {},
        type: "info",
        confirmText: "OK",
      });
      return;
    }
    onBulkEdit();
  };

  return (
    <>
      <div
        style={{
          display: "inline-flex",
          gap: "0.4rem",
          marginLeft: "0.2rem",
          verticalAlign: "middle",
        }}
      >
        <button
          onClick={handleBulkEditClick}
          style={{
            background: "#f3f4f6",
            color: "#222",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            padding: "0.4rem 0.8rem",
            fontWeight: "500",
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "background 0.2s, border 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "#e5e7eb";
            e.target.style.borderColor = "#9ca3af";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#f3f4f6";
            e.target.style.borderColor = "#d1d5db";
          }}
        >
          📋 Bulk Actions
        </button>
      </div>

      <CustomAlert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText=""
        onConfirm={alertConfig.onConfirm}
        onClose={() =>
          setAlertConfig({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
            type: "warning",
          })
        }
      />
    </>
  );
};

export default BulkActions;
