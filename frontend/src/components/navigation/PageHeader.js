import React from "react";
import ColumnSelector from "../ColumnSelector";

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
  onColumnChange,
  publicFilter,
  setPublicFilter,
  selectedSongs,
  onMakeAllPublic,
  allFuturePlansPublic,
  onRandomizerClick,
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
            minWidth: "200px",
            flex: "1 1 auto",
          }}
        />

        {/* Group By Dropdown */}
        <div style={{ position: "relative" }}>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
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
              background:
                'white url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><polygon points="0,0 8,0 4,8" fill="%23666"/></svg>\') no-repeat right 12px center',
              backgroundSize: "8px",
            }}
          >
            <option value="pack">Group: Pack</option>
            <option value="artist">Group: Artist</option>
          </select>
        </div>

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
                background:
                  'white url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><polygon points="0,0 8,0 4,8" fill="%23666"/></svg>\') no-repeat right 12px center',
                backgroundSize: "8px",
              }}
            >
              <option value="alphabetical">Sort: A-Z</option>
              {status !== "Released" && (
                <option value="priority">Sort: Priority</option>
              )}
              {status === "In Progress" && (
                <option value="completion">Sort: Completion</option>
              )}
            </select>
          </div>
        )}

        {/* Future Plans: Make All Public/Private Toggle Button OR Public/Private Filter for other pages */}
        {status === "Future Plans" && onMakeAllPublic ? (
          <button
            onClick={onMakeAllPublic}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              border: allFuturePlansPublic
                ? "1px solid #dc3545"
                : "1px solid #28a745",
              backgroundColor: allFuturePlansPublic ? "#dc3545" : "#28a745",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "500",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (allFuturePlansPublic) {
                e.target.style.backgroundColor = "#c82333";
                e.target.style.borderColor = "#bd2130";
              } else {
                e.target.style.backgroundColor = "#218838";
                e.target.style.borderColor = "#1e7e34";
              }
            }}
            onMouseLeave={(e) => {
              if (allFuturePlansPublic) {
                e.target.style.backgroundColor = "#dc3545";
                e.target.style.borderColor = "#dc3545";
              } else {
                e.target.style.backgroundColor = "#28a745";
                e.target.style.borderColor = "#28a745";
              }
            }}
            title={
              allFuturePlansPublic
                ? "Make all Future Plans songs private"
                : "Make all Future Plans songs public"
            }
          >
            {allFuturePlansPublic
              ? "🔒 Make All Private"
              : "🌐 Make All Public"}
          </button>
        ) : (
          <div style={{ position: "relative" }}>
            <select
              value={publicFilter || "all"}
              onChange={(e) =>
                setPublicFilter && setPublicFilter(e.target.value)
              }
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
                background:
                  'white url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><polygon points="0,0 8,0 4,8" fill="%23666"/></svg>\') no-repeat right 12px center',
                backgroundSize: "8px",
              }}
            >
              <option value="all">All Songs</option>
              <option value="public">🌐 Public Only</option>
              <option value="private">🔒 Private Only</option>
            </select>
          </div>
        )}

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

        {/* Column Selector */}
        <ColumnSelector
          onColumnChange={onColumnChange}
          groupBy={groupBy}
          status={status}
        />

        {/* Randomizer Button - only show for Future Plans */}
        {status === "Future Plans" && onRandomizerClick && (
          <button
            onClick={onRandomizerClick}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              border: "1px solid #007bff",
              backgroundColor: "#007bff",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "500",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#0056b3";
              e.target.style.borderColor = "#0056b3";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#007bff";
              e.target.style.borderColor = "#007bff";
            }}
            title="Pick a random pack to work on"
          >
            🎲 Random Pack
          </button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
