import { useState, useCallback } from "react";

/**
 * Custom hook for managing album series UI state (expanded series)
 */
export const useAlbumSeriesUI = (fetchSeriesDetails) => {
  const [expandedSeries, setExpandedSeries] = useState(new Set());

  const toggleSeries = useCallback(
    (seriesId) => {
      setExpandedSeries((prev) => {
        const newExpanded = new Set(prev);
        if (newExpanded.has(seriesId)) {
          newExpanded.delete(seriesId);
        } else {
          newExpanded.add(seriesId);
          fetchSeriesDetails(seriesId);
        }
        return newExpanded;
      });
    },
    [fetchSeriesDetails]
  );

  return {
    expandedSeries,
    toggleSeries,
  };
};

