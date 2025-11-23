import { useMemo } from "react";

/**
 * Custom hook for managing song sorting and grouping logic
 */
export const useSongSortingAndGrouping = (
  songs,
  sortKey,
  sortDirection,
  groupBy,
  packSortBy,
  packs
) => {
  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      if (!sortKey) return 0;

      let aValue = a[sortKey] || "";
      let bValue = b[sortKey] || "";

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [songs, sortKey, sortDirection]);

  const groupedSongs = useMemo(() => {
    // No need to filter here since we're already filtering on the backend
    const filteredSongs = sortedSongs;

    if (groupBy === "artist") {
      const grouped = filteredSongs.reduce((acc, song) => {
        if (!song || typeof song !== "object") return acc;

        const artist = song.artist || "Unknown Artist";
        const album = song.album || "Unknown Album";

        if (!acc[artist]) acc[artist] = {};
        if (!acc[artist][album]) acc[artist][album] = [];

        acc[artist][album].push(song);
        return acc;
      }, {});

      // Sort songs within each album (editable first)
      Object.keys(grouped).forEach((artist) => {
        Object.keys(grouped[artist]).forEach((album) => {
          grouped[artist][album].sort((a, b) => {
            // Editable songs first
            if (a.is_editable && !b.is_editable) return -1;
            if (!a.is_editable && b.is_editable) return 1;
            // Then by title
            return (a.title || "").localeCompare(b.title || "");
          });
        });
      });

      return grouped;
    } else {
      const grouped = filteredSongs.reduce((acc, song) => {
        if (!song || typeof song !== "object") return acc;

        const packName = song.pack_name || "(no pack)";
        if (!acc[packName]) acc[packName] = [];
        acc[packName].push(song);
        return acc;
      }, {});

      // Sort songs within each pack (editable first)
      Object.keys(grouped).forEach((packName) => {
        grouped[packName].sort((a, b) => {
          // Editable songs first
          if (a.is_editable && !b.is_editable) return -1;
          if (!a.is_editable && b.is_editable) return 1;
          // Then by title
          return (a.title || "").localeCompare(b.title || "");
        });
      });

      // Sort pack names by priority first, then alphabetically, with "(no pack)" at the end
      const sortedGrouped = {};

      // Helper function to get pack priority
      const getPackPriority = (packName) => {
        if (packName === "(no pack)") return null; // No priority for no pack

        // First try to find from packs array
        const packData = packs.find((p) => p.name === packName);
        if (packData && packData.priority !== null) {
          return packData.priority;
        }

        // Fallback: get priority from songs in this pack (they have pack_priority field)
        const songsInPack = grouped[packName] || [];
        const songWithPriority = songsInPack.find(
          (song) =>
            song.pack_priority !== null && song.pack_priority !== undefined
        );
        return songWithPriority ? songWithPriority.pack_priority : null;
      };

      Object.keys(grouped)
        .sort((a, b) => {
          // Put "(no pack)" at the end
          if (a === "(no pack)") return 1;
          if (b === "(no pack)") return -1;

          if (packSortBy === "alphabetical") {
            // Alphabetical sorting (case insensitive)
            return a.toLowerCase().localeCompare(b.toLowerCase());
          } else if (packSortBy === "priority") {
            // Priority sorting (highest first), then alphabetically
            const aPriority = getPackPriority(a) ?? 0;
            const bPriority = getPackPriority(b) ?? 0;
            if (aPriority !== bPriority) {
              return bPriority - aPriority; // Higher priority first
            }
            return a.toLowerCase().localeCompare(b.toLowerCase()); // Then alphabetically
          } else {
            // For Future Plans, we don't have completion data, so default to priority sorting
            const aPriority = getPackPriority(a) ?? 0;
            const bPriority = getPackPriority(b) ?? 0;
            if (aPriority !== bPriority) {
              return bPriority - aPriority; // Higher priority first
            }
            return a.toLowerCase().localeCompare(b.toLowerCase());
          }
        })
        .forEach((packName) => {
          sortedGrouped[packName] = grouped[packName];
        });

      return sortedGrouped;
    }
  }, [sortedSongs, groupBy, packs, packSortBy]);

  return {
    sortedSongs,
    groupedSongs,
  };
};

