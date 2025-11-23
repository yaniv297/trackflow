import { useState, useCallback } from "react";
import { apiPost, apiPatch, apiPut } from "../../utils/api";

/**
 * Custom hook for managing album series operations
 */
export const useAlbumSeriesOperations = (
  songs,
  setSongs,
  selectedSongs,
  setSelectedSongs,
  refreshSongs,
  setShowAlbumSeriesModal
) => {
  const [albumSeriesFormData, setAlbumSeriesFormData] = useState({
    artist_name: "",
    album_name: "",
    year: "",
    cover_image_url: "",
    description: "",
  });
  const [showDoubleAlbumSeriesModal, setShowDoubleAlbumSeriesModal] =
    useState(false);
  const [doubleAlbumSeriesData, setDoubleAlbumSeriesData] = useState(null);
  const [isExecutingDoubleAlbumSeries, setIsExecutingDoubleAlbumSeries] =
    useState(false);

  const handleShowAlbumSeriesModal = useCallback(
    (packName, albumsWithEnoughSongs) => {
      // Find the songs in this pack
      const packSongs = songs.filter((song) => song.pack_name === packName);

      if (packSongs.length === 0) {
        console.error("No songs found for pack:", packName);
        return;
      }

      // Select all songs in the pack by default
      const packSongIds = packSongs.map((song) => song.id);
      setSelectedSongs(packSongIds);

      // Pre-populate form data if possible
      if (albumsWithEnoughSongs && albumsWithEnoughSongs.length > 0) {
        const [albumName] = albumsWithEnoughSongs[0];
        const firstSong = packSongs[0];
        setAlbumSeriesFormData({
          artist_name: firstSong?.artist || "",
          album_name: albumName || "",
          year: firstSong?.year || "",
          cover_image_url: firstSong?.album_cover || "",
          description: "",
        });
      }

      // Open the traditional AlbumSeriesModal
      if (setShowAlbumSeriesModal) {
        setShowAlbumSeriesModal(true);
      }
    },
    [songs, setSelectedSongs, setShowAlbumSeriesModal]
  );

  const handleAlbumSeriesSubmit = useCallback(
    async () => {
      if (selectedSongs.length === 0) {
        if (window.showNotification) {
          window.showNotification("Please select songs first", "warning");
        }
        return;
      }

      try {
        const firstSong = songs.find((song) =>
          selectedSongs.includes(song.id)
        );
        if (!firstSong?.pack_name) {
          if (window.showNotification) {
            window.showNotification(
              "Selected songs must be in a pack",
              "error"
            );
          }
          return;
        }

        await apiPost("/album-series/create-from-pack", {
          pack_name: firstSong.pack_name,
          artist_name: albumSeriesFormData.artist_name,
          album_name: albumSeriesFormData.album_name,
          year: parseInt(albumSeriesFormData.year) || null,
          cover_image_url: albumSeriesFormData.cover_image_url || null,
          description: albumSeriesFormData.description || null,
        });

        if (window.showNotification) {
          window.showNotification(
            `Album series "${albumSeriesFormData.album_name}" created successfully!`,
            "success"
          );
        }

        setSelectedSongs([]);
        setAlbumSeriesFormData({
          artist_name: "",
          album_name: "",
          year: "",
          cover_image_url: "",
          description: "",
        });

        // Clear cache and refresh
        refreshSongs();

        return true;
      } catch (error) {
        console.error("Failed to create album series:", error);
        if (window.showNotification) {
          window.showNotification("Failed to create album series", "error");
        }
        throw error;
      }
    },
    [selectedSongs, songs, albumSeriesFormData, setSelectedSongs, refreshSongs]
  );

  const handleMakeDoubleAlbumSeries = useCallback(
    (packName, albumsWithEnoughSongs) => {
      if (!albumsWithEnoughSongs || albumsWithEnoughSongs.length < 2) {
        if (window.showNotification) {
          window.showNotification(
            "Pack must have at least 2 albums with 4+ songs each for double album series",
            "error"
          );
        }
        return;
      }

      // Prevent multiple modal openings
      if (showDoubleAlbumSeriesModal || isExecutingDoubleAlbumSeries) {
        return;
      }

      const packSongs = songs.filter((song) => song.pack_name === packName);
      const mostCommonArtist = packSongs[0]?.artist;

      // Find the album that should be the "base" album series (the one that stays)
      // This should be the album with the most songs that has an album_series_id
      const albumSeriesCounts = {};
      packSongs.forEach((song) => {
        if (song.album_series_id && song.album) {
          albumSeriesCounts[song.album] =
            (albumSeriesCounts[song.album] || 0) + 1;
        }
      });

      // Find the album with the most songs in the album series (this becomes the "base")
      const baseAlbumSeries = Object.entries(albumSeriesCounts).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

      const albumsToChooseFrom = albumsWithEnoughSongs.filter(
        ([albumName]) => albumName !== baseAlbumSeries
      );

      if (albumsToChooseFrom.length === 0) {
        if (window.showNotification) {
          window.showNotification(
            "No suitable album found for double album series",
            "error"
          );
        }
        return;
      }

      const [secondAlbumName] = albumsToChooseFrom[0];
      const songsInSecondAlbum = packSongs.filter(
        (song) => song.album === secondAlbumName
      );

      if (songsInSecondAlbum.length < 4) {
        if (window.showNotification) {
          window.showNotification(
            `"${secondAlbumName}" needs at least 4 songs for album series (found ${songsInSecondAlbum.length} total songs including optional ones)`,
            "error"
          );
        }
        return;
      }

      // Show confirmation modal instead of immediately executing
      const newPackName = `${secondAlbumName} Album Series`;
      setDoubleAlbumSeriesData({
        packName,
        secondAlbumName,
        songsToMove: songsInSecondAlbum,
        newPackName,
        mostCommonArtist,
      });
      setShowDoubleAlbumSeriesModal(true);
    },
    [songs, showDoubleAlbumSeriesModal, isExecutingDoubleAlbumSeries]
  );

  const executeDoubleAlbumSeries = useCallback(async () => {
    if (!doubleAlbumSeriesData || isExecutingDoubleAlbumSeries) return;

    setIsExecutingDoubleAlbumSeries(true);

    const { secondAlbumName, songsToMove, newPackName, mostCommonArtist } =
      doubleAlbumSeriesData;

    try {
      // Update all songs from the second album to the new pack
      const songIdsToMove = songsToMove.map((song) => song.id);

      // Update pack names for songs in the second album (sequentially to avoid race conditions)
      for (const songId of songIdsToMove) {
        await apiPatch(`/songs/${songId}`, { pack: newPackName });
      }

      // Create album series for the second album
      await apiPost("/album-series/create-from-pack", {
        pack_name: newPackName,
        artist_name: mostCommonArtist,
        album_name: secondAlbumName,
        year: null,
        cover_image_url: null,
        description: null,
      });

      if (window.showNotification) {
        window.showNotification(
          `Double album series created! "${secondAlbumName}" split into its own album series with ${songsToMove.length} songs.`,
          "success"
        );
      }

      // Close modal and refresh songs to show the updated structure
      setShowDoubleAlbumSeriesModal(false);
      setDoubleAlbumSeriesData(null);
      refreshSongs();
    } catch (error) {
      console.error("Error creating double album series:", error);
      if (window.showNotification) {
        window.showNotification("Failed to create double album series", "error");
      }
    } finally {
      setIsExecutingDoubleAlbumSeries(false);
    }
  }, [doubleAlbumSeriesData, isExecutingDoubleAlbumSeries, refreshSongs]);

  return {
    albumSeriesFormData,
    setAlbumSeriesFormData,
    showDoubleAlbumSeriesModal,
    setShowDoubleAlbumSeriesModal,
    doubleAlbumSeriesData,
    setDoubleAlbumSeriesData,
    isExecutingDoubleAlbumSeries,
    handleShowAlbumSeriesModal,
    handleAlbumSeriesSubmit,
    handleMakeDoubleAlbumSeries,
    executeDoubleAlbumSeries,
  };
};

