import React from "react";
import MultipleDLCCheck from "../../features/dlc/MultipleDLCCheck";

/**
 * Component for pack form action buttons and DLC check
 */
const PackFormActions = ({
  mode,
  meta,
  entries,
  creationMode,
  isSubmitting,
  onOpenEditor,
  onSubmit,
}) => {
  const hasEntries =
    entries
      .trim()
      .split("\n")
      .filter((line) => line.trim().length > 0).length > 0;

  const buttonBaseStyle = {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "1rem 2rem",
    fontSize: "1.1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    marginTop: "1rem",
  };

  const disabledStyle = {
    background: "#ccc",
    cursor: "not-allowed",
    opacity: 0.7,
  };

  if (meta.isAlbumSeries && creationMode === "wizard") {
    return (
      <button
        type="button"
        onClick={onOpenEditor}
        style={buttonBaseStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = "0 8px 25px rgba(102,126,234,0.3)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "none";
        }}
      >
        Open Editor
      </button>
    );
  }

  return (
    <>
      {/* DLC Check for multiple songs */}
      {entries && (
        <MultipleDLCCheck
          songsText={entries}
          mode={mode}
          artistName={mode === "artist" ? meta.artist : null}
        />
      )}

      <button
        type="submit"
        disabled={isSubmitting || !hasEntries}
        style={
          isSubmitting || !hasEntries
            ? { ...buttonBaseStyle, ...disabledStyle }
            : buttonBaseStyle
        }
        onMouseEnter={(e) => {
          if (!isSubmitting && hasEntries) {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 8px 25px rgba(102,126,234,0.3)";
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "none";
        }}
      >
        {isSubmitting ? "Creating Pack..." : "Create Pack"}
      </button>
    </>
  );
};

export default PackFormActions;

