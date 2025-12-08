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

  const fetchSeriesDetails = useCallback(
    async (seriesId) => {
      if (seriesDetails[seriesId]) return; // Already fetched

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

            // Merge progress data into songs
            const songsWithProgress = allSongs.map((s) => ({
              ...s,
              progress: progressMap[s.id] || s.progress || {},
            }));

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

            setSeriesDetails((prev) => ({
              ...prev,
              [seriesId]: updatedData,
            }));
          } catch (e) {
            console.error("Failed to fetch bulk progress:", e);
            // Fallback to original data if progress fetch fails
            setSeriesDetails((prev) => ({
              ...prev,
              [seriesId]: data,
            }));
          }
        } else {
          setSeriesDetails((prev) => ({
            ...prev,
            [seriesId]: data,
          }));
        }
      } catch (err) {
        console.error("Error fetching series details:", err);
      }
    },
    [seriesDetails]
  );

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
