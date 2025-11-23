import { useMemo } from "react";

/**
 * Custom hook for filtering grouped packs based on search query
 */
export const useWipFilteredGrouped = (grouped, searchQuery) => {
  const filteredGrouped = useMemo(() => {
    if (!searchQuery) return grouped;
    const q = searchQuery.trim().toLowerCase();
    const matches = (s) =>
      [s.title, s.artist, s.album, s.pack_name]
        .map((v) => (v || "").toString().toLowerCase())
        .some((v) => v.includes(q));

    return grouped
      .map((packData) => {
        const filteredCore = (packData.coreSongs || []).filter(matches);
        const filteredAll = (packData.allSongs || []).filter(matches);
        if (filteredAll.length === 0) return null;
        return {
          ...packData,
          coreSongs: filteredCore,
          allSongs: filteredAll,
        };
      })
      .filter(Boolean);
  }, [grouped, searchQuery]);

  return {
    filteredGrouped,
  };
};

