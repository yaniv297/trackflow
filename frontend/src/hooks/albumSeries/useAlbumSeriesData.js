import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing album series data fetching
 */
export const useAlbumSeriesData = () => {
  const [albumSeries, setAlbumSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seriesDetails, setSeriesDetails] = useState({});
  const fetchingRef = useRef(new Set()); // Track series IDs currently being fetched
  const detailsRef = useRef({}); // Keep ref in sync with state

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

  // Keep ref in sync with state
  useEffect(() => {
    detailsRef.current = seriesDetails;
  }, [seriesDetails]);

  const fetchSeriesDetails = useCallback(
    async (seriesId) => {
      // Check if already fetched or currently being fetched using ref (always up-to-date)
      if (detailsRef.current[seriesId] || fetchingRef.current.has(seriesId)) {
        return; // Already fetched or fetching
      }
      
      fetchingRef.current.add(seriesId);

      try {
        const data = await apiGet(`/album-series/${seriesId}`);

        // Fetch bulk progress for all songs in this series (like WIP page)
        const allSongs = [
          ...(data.album_songs || []),
          ...(data.bonus_songs || []),
        ];
        if (allSongs.length > 0) {
          try {
            const songIds = allSongs.map((s) => s.id).join(",");
            const progressMap = await apiGet(
              `/workflows/songs/progress/bulk?song_ids=${songIds}`
            );

            // Update data with songs that have progress
            const updatedData = {
              ...data,
              album_songs: data.album_songs.map((s) => ({
                ...s,
                progress: progressMap[s.id] || s.progress || {},
              })),
              bonus_songs: data.bonus_songs.map((s) => ({
                ...s,
                progress: progressMap[s.id] || s.progress || {},
              })),
            };

            setSeriesDetails((prev) => {
              // Check again to avoid overwriting if another fetch completed
              if (prev[seriesId]) {
                fetchingRef.current.delete(seriesId);
                return prev;
              }
              fetchingRef.current.delete(seriesId);
              const newDetails = {
                ...prev,
                [seriesId]: updatedData,
              };
              detailsRef.current = newDetails;
              return newDetails;
            });
          } catch (e) {
            console.error("Failed to fetch bulk progress:", e);
            // Fallback to original data if progress fetch fails
            setSeriesDetails((prev) => {
              if (prev[seriesId]) {
                fetchingRef.current.delete(seriesId);
                return prev;
              }
              fetchingRef.current.delete(seriesId);
              const newDetails = {
                ...prev,
                [seriesId]: data,
              };
              detailsRef.current = newDetails;
              return newDetails;
            });
          }
        } else {
          setSeriesDetails((prev) => {
            if (prev[seriesId]) {
              fetchingRef.current.delete(seriesId);
              return prev;
            }
            fetchingRef.current.delete(seriesId);
            const newDetails = {
              ...prev,
              [seriesId]: data,
            };
            detailsRef.current = newDetails;
            return newDetails;
          });
        }
      } catch (err) {
        console.error("Error fetching series details:", err);
        fetchingRef.current.delete(seriesId);
      }
    },
    [] // No dependencies needed since we use ref for tracking
  );

  useEffect(() => {
    fetchAlbumSeries();
  }, [fetchAlbumSeries]);

  // Pre-fetch details for all released series after the main list loads
  useEffect(() => {
    if (loading || albumSeries.length === 0) return;

    const releasedSeries = albumSeries.filter(
      (series) => series.status === "released"
    );

    // Pre-fetch details for all released series in parallel
    releasedSeries.forEach((series) => {
      // Only fetch if not already fetched or currently being fetched
      if (!detailsRef.current[series.id] && !fetchingRef.current.has(series.id)) {
        fetchSeriesDetails(series.id);
      }
    });
  }, [loading, albumSeries, fetchSeriesDetails]);

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
