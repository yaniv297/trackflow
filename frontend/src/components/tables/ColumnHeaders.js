import React from "react";

const ColumnHeaders = ({
  groupBy,
  handleSort,
  sortKey,
  sortDirection,
  packName,
  visibleColumns = {},
}) => {
  // Helper function to check if a column should be displayed
  const shouldShowColumn = (columnKey) => {
    if (!visibleColumns[columnKey]) return true; // Default to showing if not specified
    return visibleColumns[columnKey].enabled && !visibleColumns[columnKey].groupHidden;
  };
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
      {shouldShowColumn("cover") && (
        <th style={{ padding: "0.5rem", width: "60px" }}>Cover</th>
      )}
      {shouldShowColumn("title") && (
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
      )}
      {groupBy !== "artist" && shouldShowColumn("artist") && (
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
      {shouldShowColumn("album") && (
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
      )}
      {groupBy !== "pack" && shouldShowColumn("pack") && (
        <th style={{ padding: "0.5rem" }}>Pack</th>
      )}
      {shouldShowColumn("author") && (
        <th style={{ padding: "0.5rem" }}>Owner</th>
      )}
      {shouldShowColumn("year") && (
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
      )}
      {shouldShowColumn("content_rating") && (
        <th style={{ padding: "0.5rem", textAlign: "center", width: "60px" }}>Rating</th>
      )}
      {shouldShowColumn("notes") && (
        <th style={{ padding: "0.5rem" }}>Notes</th>
      )}
      {shouldShowColumn("collaborations") && (
        <th style={{ padding: "0.5rem" }}>Collaborations</th>
      )}
      {shouldShowColumn("visibility") && (
        <th style={{ padding: "0.5rem", textAlign: "center", width: "80px" }}>Visibility</th>
      )}
      {shouldShowColumn("needs_update") && (
        <th style={{ padding: "0.5rem", textAlign: "center", width: "60px" }}>Update</th>
      )}
      {shouldShowColumn("actions") && (
        <th style={{ padding: "0.5rem" }}>Actions</th>
      )}
    </tr>
  );
};

export default ColumnHeaders;
