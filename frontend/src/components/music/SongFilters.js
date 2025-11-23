import React from "react";
import ColumnSelector from "./ColumnSelector";

const SongFilters = ({
  search,
  setSearch,
  status,
  sortKey,
  sortDirection,
  onSort,
  onStatusChange,
  onToggleAllGroups,
  collapsedGroups,
  songs,
  selectedSongs,
  setSelectedSongs,
  onColumnChange,
  groupBy,
}) => {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Search Input */}
        <div style={{ flex: "0 0 250px", minWidth: "200px" }}>
          <input
            type="text"
            placeholder="Search songs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={status || ""}
          onChange={(e) => onStatusChange(e.target.value)}
          style={{
            padding: "0.5rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "0.9rem",
          }}
        >
          <option value="">All Statuses</option>
          <option value="Future Plans">Future Plans</option>
          <option value="In Progress">In Progress</option>
          <option value="Released">Released</option>
        </select>

        {/* Toggle All Groups */}
        <button
          onClick={onToggleAllGroups}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            background: "#f8f9fa",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          {Object.keys(collapsedGroups).length > 0 &&
          Object.values(collapsedGroups).every(Boolean)
            ? "Expand All"
            : "Collapse All"}
        </button>

        {/* Select All Songs */}
        <button
          onClick={() => {
            if (selectedSongs.length === songs.length) {
              setSelectedSongs([]);
            } else {
              setSelectedSongs(songs.map((s) => s.id));
            }
          }}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            background: "#f8f9fa",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          {selectedSongs.length === songs.length
            ? "Deselect All"
            : "Select All"}
        </button>

        {/* Column Selector */}
        <ColumnSelector onColumnChange={onColumnChange} groupBy={groupBy} />
      </div>

      {/* Sort Controls */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          marginTop: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "0.9rem", color: "#666" }}>Sort by:</span>
        {[
          { key: "title", label: "Title" },
          { key: "artist", label: "Artist" },
          { key: "album", label: "Album" },
          { key: "pack", label: "Pack" },
          { key: "year", label: "Year" },
          { key: "status", label: "Status" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSort(key)}
            style={{
              padding: "0.3rem 0.6rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: sortKey === key ? "#e3f2fd" : "#f8f9fa",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: sortKey === key ? "600" : "normal",
            }}
          >
            {label}
            {sortKey === key && (
              <span style={{ marginLeft: "0.3rem" }}>
                {sortDirection === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SongFilters;
