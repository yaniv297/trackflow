import { useState, useCallback } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing decade details (hover popup data)
 */
export const useDecadeDetails = () => {
  const [hoveredDecade, setHoveredDecade] = useState(null);
  const [decadeDetails, setDecadeDetails] = useState({});
  const [loadingDecade, setLoadingDecade] = useState(null);

  const handleDecadeHover = useCallback(
    async (decadeValue) => {
      if (!decadeDetails[decadeValue] && !loadingDecade) {
        setLoadingDecade(decadeValue);
        try {
          const response = await apiGet(`/stats/decade/${decadeValue}/details`);
          const details = response;
          setDecadeDetails((prev) => ({ ...prev, [decadeValue]: details }));
        } catch (error) {
          console.error("Failed to fetch decade details:", error);
        } finally {
          setLoadingDecade(null);
        }
      }
      setHoveredDecade(decadeValue);
    },
    [decadeDetails, loadingDecade]
  );

  const handleDecadeLeave = useCallback(() => {
    setHoveredDecade(null);
  }, []);

  return {
    hoveredDecade,
    decadeDetails,
    loadingDecade,
    handleDecadeHover,
    handleDecadeLeave,
  };
};

