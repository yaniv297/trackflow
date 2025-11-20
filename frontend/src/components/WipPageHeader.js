import React from "react";

const WipPageHeader = ({
  grouped,
  collapsedPacks,
  onToggleAll,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  packSortBy,
  setPackSortBy,
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
              minWidth: 200,
            }}
          />
          
          {/* Sort Dropdown - only show when in pack view mode */}
          {viewMode === "pack" && packSortBy && setPackSortBy && (
            <div style={{ position: "relative" }}>
              <select
                value={packSortBy}
                onChange={(e) => setPackSortBy(e.target.value)}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  padding: "0.5rem 2rem 0.5rem 1rem",
                  fontSize: "1rem",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  minWidth: "140px",
                  fontWeight: "500",
                  color: "#333",
                  outline: "none",
                  background: "white url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\" viewBox=\"0 0 8 8\"><polygon points=\"0,0 8,0 4,8\" fill=\"%23666\"/></svg>') no-repeat right 12px center",
                  backgroundSize: "8px",
                }}
              >
                <option value="completion">Sort: Completion</option>
                <option value="alphabetical">Sort: A-Z</option>
                <option value="priority">Sort: Priority</option>
              </select>
            </div>
          )}

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
