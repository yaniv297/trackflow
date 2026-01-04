import React from "react";

const InstrumentAssignment = ({
  collaborationType,
  permissionType,
  packSongs,
  selectedSongs,
  selectedInstruments,
  onSongSelection,
  onInstrumentSelection,
  onAddCollaboration,
  onBack,
  instrumentFields
}) => {
  const getStepDescription = () => {
    if (collaborationType === "song") {
      return "Select instruments to assign";
    } else if (permissionType === "specific") {
      return "Select songs for collaboration";
    }
    return "";
  };

  const isAddDisabled = () => {
    return permissionType === "specific" &&
      ((collaborationType === "pack" && selectedSongs.length === 0) ||
        (collaborationType === "song" && selectedInstruments.length === 0));
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3
        style={{
          margin: "0 0 1rem 0",
          fontSize: "1rem",
          color: "#555",
        }}
      >
        {getStepDescription()}
      </h3>

      {/* Song Selection (only show for pack collaboration or song-by-song) */}
      {collaborationType === "pack" && permissionType === "specific" && (
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
            Select Songs:
          </h4>
          <div
            style={{
              maxHeight: "150px",
              overflow: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "0.5rem",
            }}
          >
            {packSongs.map((song) => (
              <label
                key={song.id}
                style={{
                  display: "block",
                  padding: "0.25rem 0",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedSongs.includes(song.id)}
                  onChange={(e) =>
                    onSongSelection(song.id, e.target.checked)
                  }
                  style={{ marginRight: "0.5rem" }}
                />
                {song.title} - {song.artist}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Instrument Selection (only for WIP songs, not for Future Plans collaborations) */}
      {permissionType === "specific" && collaborationType === "song" && (
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
            Select Instruments:
          </h4>
          <div
            style={{
              maxHeight: "150px",
              overflow: "auto",
              border: "1px solid #ddd",
              borderRadius: "4px",
              padding: "0.5rem",
            }}
          >
            {instrumentFields.length === 0 ? (
              <p style={{ color: "#666", fontSize: "0.9rem", fontStyle: "italic" }}>
                Loading workflow steps...
              </p>
            ) : (
              instrumentFields.map((instrument) => (
                <label
                  key={instrument}
                  style={{
                    display: "block",
                    padding: "0.25rem 0",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedInstruments.includes(instrument)}
                    onChange={(e) =>
                      onInstrumentSelection(instrument, e.target.checked)
                    }
                    style={{ marginRight: "0.5rem" }}
                  />
                  {instrument}
                </label>
              ))
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={onBack}
          style={{
            padding: "0.5rem 1rem",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          onClick={onAddCollaboration}
          disabled={isAddDisabled()}
          style={{
            padding: "0.5rem 1rem",
            background: isAddDisabled() ? "#ccc" : "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isAddDisabled() ? "not-allowed" : "pointer",
          }}
        >
          Add Collaboration
        </button>
      </div>
    </div>
  );
};

export default InstrumentAssignment;