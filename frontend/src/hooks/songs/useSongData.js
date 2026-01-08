import { useState, useEffect, useCallback } from "react";
import { apiGet } from "../../utils/api";

/**
 * Custom hook for managing song data fetching, caching, and search
 */
export const useSongData = (status, search) => {
  const [songs, setSongs] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [songsCache, setSongsCache] = useState({});

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("query", search);

      const cacheKey = `${status || "all"}-${search || ""}`;

      // Check cache first
      if (songsCache[cacheKey] && !search) {
        // Only use cache for non-search requests
        setSongs(songsCache[cacheKey]);
        setLoading(false);
        return;
      }

      const response = await apiGet(`/songs/?${params.toString()}`);
      setSongs(response);

      // Cache the result (only for non-search requests)
      if (!search) {
        setSongsCache((prev) => ({ ...prev, [cacheKey]: response }));
      }
    } catch (error) {
      console.error("Failed to fetch songs:", error);
    } finally {
      setLoading(false);
    }
  }, [status, search, songsCache]);

  // Load data on mount and when status changes
  useEffect(() => {
    fetchSongs();
  }, [status, fetchSongs]);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchSongs(), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, fetchSongs]);

  // Listen for global cache invalidation events
  useEffect(() => {
    const invalidate = () => {
      setSongsCache({});
      fetchSongs();
    };
    const invalidateOnly = () => {
      // Only clear cache, don't refresh current page
      // This is used when marking songs as "needs update" to avoid refreshing Released page
      setSongsCache({});
    };
    window.addEventListener("songs-invalidate-cache", invalidate);
    window.addEventListener("songs-invalidate-cache-only", invalidateOnly);
    return () => {
      window.removeEventListener("songs-invalidate-cache", invalidate);
      window.removeEventListener("songs-invalidate-cache-only", invalidateOnly);
    };
  }, [fetchSongs]);

  const invalidateCache = useCallback(() => {
    setSongsCache({});
  }, []);

  const refreshSongs = useCallback(() => {
    invalidateCache();
    fetchSongs();
  }, [invalidateCache, fetchSongs]);

  return {
    songs,
    setSongs,
    packs,
    setPacks,
    loading,
    fetchSongs,
    invalidateCache,
    refreshSongs,
  };
};

