import React from "react";

const PageHeader = ({
  status,
  search,
  setSearch,
  groupBy,
  setGroupBy,
  allCollapsed,
  toggleAllGroups,
}) => {
  return (
    <div>
      <h2>{status || "All Songs"}</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search title, artist, album, or collaborators..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "1rem",
            border: "1px solid #ccc",
            borderRadius: "999px",
            minWidth: "260px",
            flex: "1 1 auto",
          }}
        />

        {/* Toggle Switch */}
        <div
          style={{
            display: "flex",
            border: "1px solid #ccc",
            borderRadius: "999px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setGroupBy("artist")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: groupBy === "artist" ? "#2ecc71" : "white",
              color: groupBy === "artist" ? "white" : "black",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            👤 Group by Artist
          </button>
          <button
            onClick={() => setGroupBy("pack")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: groupBy === "pack" ? "#2ecc71" : "white",
              color: groupBy === "pack" ? "white" : "black",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            📦 Group by Pack
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleAllGroups}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            border: "1px solid #ccc",
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500",
            flexShrink: 0,
          }}
        >
          {allCollapsed ? "Expand All" : "Collapse All"}
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
