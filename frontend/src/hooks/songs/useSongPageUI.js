import { useState, useMemo, useCallback } from "react";

/**
 * Custom hook for managing UI state in SongPage (editing, sorting, grouping, etc.)
 */
export const useSongPageUI = (groupedSongs = {}) => {
  const [editing, setEditing] = useState({});
  const [editValues, setEditValues] = useState({});
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupBy, setGroupBy] = useState("pack");
  const [packSortBy, setPackSortBy] = useState("priority");
  const [visibleColumns, setVisibleColumns] = useState({});

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allCollapsed = useMemo(() => {
    if (!groupedSongs || typeof groupedSongs !== "object") {
      return false;
    }
    return Object.keys(groupedSongs)
      .filter((key) => groupedSongs[key]?.length > 0)
      .every((key) => collapsedGroups[key]);
  }, [groupedSongs, collapsedGroups]);

  const toggleAllGroups = useCallback(() => {
    if (!groupedSongs || typeof groupedSongs !== "object") {
      return;
    }

    const groupKeys = Object.keys(groupedSongs);

    if (allCollapsed) {
      setCollapsedGroups({});
    } else {
      const newCollapsed = {};
      groupKeys.forEach((key) => {
        newCollapsed[key] = true;
      });
      setCollapsedGroups(newCollapsed);
    }
  }, [groupedSongs, allCollapsed]);

  return {
    editing,
    setEditing,
    editValues,
    setEditValues,
    sortKey,
    sortDirection,
    handleSort,
    collapsedGroups,
    toggleGroup,
    allCollapsed,
    toggleAllGroups,
    groupBy,
    setGroupBy,
    packSortBy,
    setPackSortBy,
    visibleColumns,
    setVisibleColumns,
  };
};

