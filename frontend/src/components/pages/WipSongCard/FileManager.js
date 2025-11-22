import React from "react";

/**
 * Component for displaying file history button with count badge
 */
const FileManager = ({ 
  fileLinksCount, 
  onShowFileHistory, 
  wipCollaborations, 
  isFinished, 
  readOnly = false 
}) => {
  if (readOnly || (wipCollaborations.length === 0 && !isFinished)) {
    return null;
  }

  return (
    <div style={{ position: "relative", marginRight: "0.5rem" }}>
      <button
        onClick={onShowFileHistory}
        style={{
          background: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          fontSize: "12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#218838";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "#28a745";
        }}
        title={`File History (${fileLinksCount} files)`}
      >
        📁
      </button>

      {/* File count badge */}
      {fileLinksCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: "-6px",
            right: "-6px",
            background: "#dc3545",
            color: "white",
            borderRadius: "50%",
            width: "16px",
            height: "16px",
            fontSize: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            border: "2px solid white",
          }}
        >
          {fileLinksCount > 9 ? "9+" : fileLinksCount}
        </div>
      )}
    </div>
  );
};

export default FileManager;