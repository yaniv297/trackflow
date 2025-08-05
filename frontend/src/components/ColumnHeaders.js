import React from "react";

const ColumnHeaders = ({
  groupBy,
  handleSort,
  sortKey,
  sortDirection,
  packName,
}) => {
  return (
    <tr
      style={{
        backgroundColor: "#f8f9fa",
        borderBottom: "2px solid #dee2e6",
        fontSize: "0.9rem",
        fontWeight: "600",
      }}
    >
      <th style={{ padding: "0.5rem", textAlign: "center", width: "40px" }}>
        {/* Checkbox column - no header needed */}
      </th>
      <th style={{ padding: "0.5rem", width: "60px" }}>Cover</th>
      <th
        onClick={() => handleSort("title")}
        className="sortable"
        style={{
          padding: "0.5rem",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        Title {sortKey === "title" && (sortDirection === "asc" ? "▲" : "▼")}
      </th>
      {groupBy !== "artist" && (
        <th
          onClick={() => handleSort("artist")}
          className="sortable"
          style={{
            padding: "0.5rem",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          Artist {sortKey === "artist" && (sortDirection === "asc" ? "▲" : "▼")}
        </th>
      )}
      <th
        onClick={() => handleSort("album")}
        className="sortable"
        style={{
          padding: "0.5rem",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        Album {sortKey === "album" && (sortDirection === "asc" ? "▲" : "▼")}
      </th>
      {(groupBy !== "pack" || packName === "(no pack)") && (
        <th style={{ padding: "0.5rem" }}>Pack</th>
      )}
      <th style={{ padding: "0.5rem" }}>Owner</th>
      <th
        onClick={() => handleSort("year")}
        className="sortable"
        style={{
          padding: "0.5rem",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        Year {sortKey === "year" && (sortDirection === "asc" ? "▲" : "▼")}
      </th>
      <th style={{ padding: "0.5rem" }}>Collaborations</th>
      <th style={{ padding: "0.5rem" }}>Actions</th>
    </tr>
  );
};

export default ColumnHeaders;
