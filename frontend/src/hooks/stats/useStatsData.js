import { useState, useEffect } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing stats data fetching
 */
export const useStatsData = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiGet("/stats/");
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return {
    stats,
    loading,
  };
};

