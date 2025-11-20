import React from "react";

const PageHeader = ({
  status,
  search,
  setSearch,
  groupBy,
  setGroupBy,
  allCollapsed,
  toggleAllGroups,
  packSortBy,
  setPackSortBy,
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
        {/* Search Input and Sort Dropdown Container */}
        <div style={{ display: "flex", gap: "0.75rem", flex: "1 1 auto", alignItems: "center" }}>
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
              minWidth: "200px",
              flex: "1 1 auto",
            }}
          />
          
          {/* Sort Dropdown - only show when grouping by pack */}
          {groupBy === "pack" && packSortBy && setPackSortBy && (
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
                  borderRadius: "999px",
                  backgroundColor: "white",
                  cursor: "pointer",
                  minWidth: "140px",
                  flexShrink: 0,
                  fontWeight: "500",
                  color: "#333",
                  outline: "none",
                  background: "white url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"8\" height=\"8\" viewBox=\"0 0 8 8\"><polygon points=\"0,0 8,0 4,8\" fill=\"%23666\"/></svg>') no-repeat right 12px center",
                  backgroundSize: "8px",
                }}
              >
                <option value="alphabetical">A-Z</option>
                <option value="priority">Priority</option>
                {status === "In Progress" && <option value="completion">Completion</option>}
              </select>
            </div>
          )}
        </div>

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
