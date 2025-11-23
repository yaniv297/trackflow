import { useState, useCallback } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing year details (hover popup data)
 */
export const useYearDetails = () => {
  const [hoveredYear, setHoveredYear] = useState(null);
  const [yearDetails, setYearDetails] = useState({});
  const [loadingYear, setLoadingYear] = useState(null);

  const handleYearHover = useCallback(
    async (year) => {
      if (!yearDetails[year] && !loadingYear) {
        setLoadingYear(year);
        try {
          const response = await apiGet(`/stats/year/${year}/details`);
          const details = response;
          setYearDetails((prev) => ({ ...prev, [year]: details }));
        } catch (error) {
          console.error("Failed to fetch year details:", error);
        } finally {
          setLoadingYear(null);
        }
      }
      setHoveredYear(year);
    },
    [yearDetails, loadingYear]
  );

  const handleYearLeave = useCallback(() => {
    setHoveredYear(null);
  }, []);

  return {
    hoveredYear,
    yearDetails,
    loadingYear,
    handleYearHover,
    handleYearLeave,
  };
};

