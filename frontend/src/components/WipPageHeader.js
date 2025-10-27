import React from "react";

const WipPageHeader = ({
  grouped,
  collapsedPacks,
  onToggleAll,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
        }}
      >
        <h2>🧪 WIP Packs</h2>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, artist, album, pack..."
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #ccc",
              borderRadius: "6px",
              minWidth: 260,
            }}
          />

          <button
            onClick={() => onViewModeChange("pack")}
            style={{
              backgroundColor: viewMode === "pack" ? "#5a8fcf" : "#eee",
              color: viewMode === "pack" ? "white" : "#333",
              border: "1px solid #ccc",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: viewMode === "pack" ? "bold" : "normal",
            }}
          >
            📦 By Pack
          </button>
          <button
            onClick={() => onViewModeChange("completion")}
            style={{
              backgroundColor: viewMode === "completion" ? "#5a8fcf" : "#eee",
              color: viewMode === "completion" ? "white" : "#333",
              border: "1px solid #ccc",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: viewMode === "completion" ? "bold" : "normal",
            }}
          >
            📊 By Completion
          </button>
        </div>
      </div>

      <button
        onClick={onToggleAll}
        style={{
          marginBottom: "1.5rem",
          backgroundColor: "#eee",
          border: "1px solid #ccc",
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        {viewMode === "pack"
          ? grouped.every(({ pack }) => collapsedPacks[pack])
            ? "🔽 Expand All"
            : "🔼 Collapse All"
          : Object.values(collapsedPacks).every((v) => v)
          ? "🔽 Expand All"
          : "🔼 Collapse All"}
      </button>
    </>
  );
};

export default WipPageHeader;
