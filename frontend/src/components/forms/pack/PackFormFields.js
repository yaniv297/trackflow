import React from "react";
import SmartDropdown from "../../ui/SmartDropdown";

/**
 * Component for rendering pack form fields
 */
const PackFormFields = ({
  mode,
  setMode,
  meta,
  setMeta,
  entries,
  setEntries,
  creationMode,
  setCreationMode,
  isSubmitting,
}) => {
  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "2px solid #e1e5e9",
    borderRadius: "8px",
    fontSize: "1rem",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };

  const focusStyle = {
    borderColor: "#007bff",
    boxShadow: "0 0 0 3px rgba(0,123,255,0.1)",
  };

  const blurStyle = {
    borderColor: "#e1e5e9",
    boxShadow: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: "500",
    color: "#555",
    fontSize: "0.95rem",
  };

  return (
    <>
      {/* Mode Selection */}
      <div>
        <label style={labelStyle}>Pack Type</label>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderRadius: "8px",
            padding: "0.25rem",
            background: "#f8f9fa",
            border: "2px solid #e1e5e9",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("artist")}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              border: "none",
              borderRadius: "6px",
              background: mode === "artist" ? "#007bff" : "transparent",
              color: mode === "artist" ? "white" : "#666",
              fontWeight: mode === "artist" ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Single Artist
          </button>
          <button
            type="button"
            onClick={() => setMode("mixed")}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              border: "none",
              borderRadius: "6px",
              background: mode === "mixed" ? "#007bff" : "transparent",
              color: mode === "mixed" ? "white" : "#666",
              fontWeight: mode === "mixed" ? "600" : "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Mixed Artists
          </button>
        </div>
      </div>

      {/* Album Series Option (only in Single Artist mode) */}
      {mode === "artist" && (
        <div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              fontWeight: "500",
              color: "#555",
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={meta.isAlbumSeries}
              onChange={(e) =>
                setMeta({ ...meta, isAlbumSeries: e.target.checked })
              }
              style={{
                width: "1.2rem",
                height: "1.2rem",
                accentColor: "#007bff",
              }}
            />
            Create as Album Series
          </label>
          {meta.isAlbumSeries && (
            <div
              style={{
                display: "flex",
                gap: 8,
                margin: "0.5rem 0 0.75rem",
              }}
            >
              <button
                type="button"
                onClick={() => setCreationMode("manual")}
                style={{
                  border: "1px solid #ccc",
                  background:
                    creationMode === "manual" ? "#eef5ff" : "#fff",
                  color: "#333",
                  borderRadius: 6,
                  padding: "0.35rem 0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Manual (list)
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("wizard")}
                style={{
                  border: "1px solid #ccc",
                  background:
                    creationMode === "wizard" ? "#eef5ff" : "#fff",
                  color: "#333",
                  borderRadius: 6,
                  padding: "0.35rem 0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Use Editor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pack Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display:
              meta.isAlbumSeries && mode === "artist" ? "none" : "block",
          }}
        >
          <label style={labelStyle}>Pack Name *</label>
          <input
            type="text"
            value={meta.pack}
            onChange={(e) => setMeta({ ...meta, pack: e.target.value })}
            placeholder="e.g., Classic Rock Pack"
            style={inputStyle}
            onFocus={(e) => {
              Object.assign(e.target.style, focusStyle);
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, blurStyle);
            }}
          />
        </div>

        {mode === "artist" && !meta.isAlbumSeries && (
          <div>
            <label style={labelStyle}>Artist *</label>
            <SmartDropdown
              type="artist"
              value={meta.artist}
              onChange={(value) => setMeta({ ...meta, artist: value })}
              placeholder="Select or add artist name"
            />
          </div>
        )}
      </div>

      {/* Status and Priority */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={meta.status}
            onChange={(e) => setMeta({ ...meta, status: e.target.value })}
            style={inputStyle}
            onFocus={(e) => {
              Object.assign(e.target.style, focusStyle);
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, blurStyle);
            }}
          >
            <option value="Future Plans">Future Plans</option>
            <option value="In Progress">In Progress</option>
            <option value="Released">Released</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Priority</label>
          <select
            value={meta.priority || ""}
            onChange={(e) =>
              setMeta({
                ...meta,
                priority: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            style={inputStyle}
            onFocus={(e) => {
              Object.assign(e.target.style, focusStyle);
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, blurStyle);
            }}
          >
            <option value="">📝 No Priority</option>
            <option value="5">🔥 Urgent (5)</option>
            <option value="4">⚡ High (4)</option>
            <option value="3">📝 Medium (3)</option>
            <option value="2">📋 Low (2)</option>
            <option value="1">💤 Someday (1)</option>
          </select>
        </div>
      </div>

      {/* Album Series Fields (replacement when isAlbumSeries) */}
      {mode === "artist" && meta.isAlbumSeries && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            padding: "1rem",
            background: "#f8f9fa",
            borderRadius: "8px",
            border: "1px solid #e1e5e9",
          }}
        >
          <div>
            <label style={labelStyle}>Album Series Artist *</label>
            <SmartDropdown
              type="artist"
              value={meta.albumSeriesArtist}
              onChange={(value) =>
                setMeta({ ...meta, albumSeriesArtist: value })
              }
              placeholder="Select or add artist name"
            />
          </div>
          <div>
            <label style={labelStyle}>Album Series Name *</label>
            <input
              type="text"
              value={meta.albumSeriesAlbum}
              onChange={(e) =>
                setMeta({ ...meta, albumSeriesAlbum: e.target.value })
              }
              placeholder="e.g., Abbey Road"
              style={inputStyle}
              onFocus={(e) => {
                Object.assign(e.target.style, focusStyle);
              }}
              onBlur={(e) => {
                Object.assign(e.target.style, blurStyle);
              }}
            />
          </div>
        </div>
      )}

      {/* Song Entries (hidden in Wizard mode) */}
      {!(meta.isAlbumSeries && creationMode === "wizard") && (
        <div>
          <label style={labelStyle}>
            {mode === "artist"
              ? "Song Titles (one per line)"
              : "Songs (Artist - Title format, one per line)"}
          </label>
          <textarea
            value={entries}
            onChange={(e) => setEntries(e.target.value)}
            placeholder={
              mode === "artist"
                ? "Hey Jude\nLet It Be\nYesterday\nHere Comes the Sun"
                : "The Beatles - Hey Jude\nPink Floyd - Comfortably Numb\nLed Zeppelin - Stairway to Heaven"
            }
            rows={8}
            style={{
              ...inputStyle,
              fontFamily: "inherit",
              resize: "vertical",
            }}
            onFocus={(e) => {
              Object.assign(e.target.style, focusStyle);
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, blurStyle);
            }}
          />
        </div>
      )}
    </>
  );
};

export default PackFormFields;

