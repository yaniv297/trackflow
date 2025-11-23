import { useState } from "react";
import { apiGet, apiPost } from "../../utils/api";

/**
 * Custom hook for Spotify enhancement functionality
 */
export const useSpotifyEnhancement = (songId, onSongUpdate, onEditValuesUpdate) => {
  const [spotifyOptions, setSpotifyOptions] = useState([]);
  const [loadingSpotify, setLoadingSpotify] = useState(false);

  const loadSpotifyOptions = async () => {
    setLoadingSpotify(true);
    try {
      const data = await apiGet(`/spotify/${songId}/spotify-options/`);
      setSpotifyOptions(data || []);
    } catch (err) {
      console.error("Spotify fetch failed", err);
      window.showNotification("Failed to fetch Spotify options.", "error");
    } finally {
      setLoadingSpotify(false);
    }
  };

  const enhanceFromSpotify = async (trackId = null) => {
    try {
      let track_id;

      if (trackId) {
        // Use the provided track_id
        track_id = trackId;
      } else {
        // Fallback to first option (for backward compatibility)
        const options = await apiGet(`/spotify/${songId}/spotify-options/`);
        if (options.length === 0) {
          window.showNotification("Failed to fetch Spotify options.", "error");
          return;
        }
        track_id = options[0].track_id;
      }

      const enhancedSong = await apiPost(`/spotify/${songId}/enhance/`, {
        track_id: track_id,
      });

      window.showNotification("✅ Song enhanced!", "success");

      // Update the song data in the parent component
      if (onSongUpdate && enhancedSong) {
        onSongUpdate(songId, enhancedSong);
      }

      // Update local edit values
      if (enhancedSong && onEditValuesUpdate) {
        onEditValuesUpdate({
          title: enhancedSong.title,
          artist: enhancedSong.artist,
          album: enhancedSong.album,
          year: enhancedSong.year,
        });
      }
    } catch (error) {
      console.error("Enhancement failed:", error);
      window.showNotification("Enhancement failed.", "error");
    }
  };

  const clearSpotifyOptions = () => {
    setSpotifyOptions([]);
  };

  return {
    spotifyOptions,
    loadingSpotify,
    loadSpotifyOptions,
    enhanceFromSpotify,
    clearSpotifyOptions,
  };
};