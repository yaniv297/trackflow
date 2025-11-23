import { useState, useEffect, useCallback } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing album series data fetching
 */
export const useAlbumSeriesData = () => {
  const [albumSeries, setAlbumSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seriesDetails, setSeriesDetails] = useState({});

  const fetchAlbumSeries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet("/album-series/");
      setAlbumSeries(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSeriesDetails = useCallback(async (seriesId) => {
    if (seriesDetails[seriesId]) return; // Already fetched

    try {
      const data = await apiGet(`/album-series/${seriesId}`);
      setSeriesDetails((prev) => ({
        ...prev,
        [seriesId]: data,
      }));
    } catch (err) {
      console.error("Error fetching series details:", err);
    }
  }, [seriesDetails]);

  useEffect(() => {
    fetchAlbumSeries();
  }, [fetchAlbumSeries]);

  return {
    albumSeries,
    setAlbumSeries,
    loading,
    error,
    seriesDetails,
    setSeriesDetails,
    fetchAlbumSeries,
    fetchSeriesDetails,
  };
};

