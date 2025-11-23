import { useState, useCallback } from "react";
import { apiPost, apiPatch } from "../../utils/api";

/**
 * Custom hook for managing album series operations in WipPage
 */
export const useWipAlbumSeriesOperations = (
  songs,
  setSongs,
  selectedSongs,
  setSelectedSongs,
  albumSeriesForm,
  setAlbumSeriesForm,
  setShowAlbumSeriesModal,
  setShowDoubleAlbumSeriesModal,
  setDoubleAlbumSeriesData,
  isExecutingDoubleAlbumSeries,
  setIsExecutingDoubleAlbumSeries,
  refreshSongs
) => {
  const handleCreateAlbumSeries = useCallback(
    async () => {
      if (selectedSongs.length === 0) {
        if (window.showNotification) {
          window.showNotification("Please select songs first", "warning");
        }
        return;
      }

      try {
        const firstSong = songs.find((song) => song.id === selectedSongs[0]);
        if (!firstSong?.pack_name) {
          if (window.showNotification) {
            window.showNotification("Selected songs must be in a pack", "error");
          }
          return;
        }

        await apiPost("/album-series/create-from-pack", {
          pack_name: firstSong.pack_name,
          song_ids: selectedSongs,
          artist_name: albumSeriesForm.artist_name,
          album_name: albumSeriesForm.album_name,
          year: parseInt(albumSeriesForm.year) || null,
          cover_image_url: albumSeriesForm.cover_image_url || null,
          description: albumSeriesForm.description || null,
        });

        // Optimistic update - remove selected songs from the current view
        // since they're now part of an album series
        setSongs((prev) =>
          prev.filter((song) => !selectedSongs.includes(song.id))
        );

        if (window.showNotification) {
          window.showNotification(
            `Album series "${albumSeriesForm.album_name}" created successfully!`,
            "success"
          );
        }

        setShowAlbumSeriesModal(false);
        setSelectedSongs([]);
        setAlbumSeriesForm({
          artist_name: "",
          album_name: "",
          year: "",
          cover_image_url: "",
          description: "",
        });
        // Remove unnecessary full refresh - we already updated local state
        // refreshSongs();
      } catch (error) {
        console.error("Failed to create album series:", error);
        if (window.showNotification) {
          window.showNotification("Failed to create album series", "error");
        }
        // Revert optimistic update on error
        refreshSongs();
      }
    },
    [
      selectedSongs,
      songs,
      albumSeriesForm,
      setSongs,
      setSelectedSongs,
      setAlbumSeriesForm,
      setShowAlbumSeriesModal,
      refreshSongs,
    ]
  );

  const handleShowAlbumSeriesModal = useCallback(
    (packName, albumsWithEnoughSongs) => {
      const packSongs = songs.filter((song) => song.pack_name === packName);
      if (packSongs.length === 0) {
        console.error("No songs found for pack:", packName);
        return;
      }

      const packSongIds = packSongs.map((song) => song.id);
      setSelectedSongs(packSongIds);

      if (albumsWithEnoughSongs && albumsWithEnoughSongs.length > 0) {
        const [albumName] = albumsWithEnoughSongs[0];
        const firstSong = packSongs[0];
        setAlbumSeriesForm({
          artist_name: firstSong?.artist || "",
          album_name: albumName || "",
          year: firstSong?.year || "",
          cover_image_url: firstSong?.album_cover || "",
          description: "",
        });
      }
      setShowAlbumSeriesModal(true);
    },
    [songs, setSelectedSongs, setAlbumSeriesForm, setShowAlbumSeriesModal]
  );

  const handleMakeDoubleAlbumSeries = useCallback(
    async (packName, albumsWithEnoughSongs) => {
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
      if (isExecutingDoubleAlbumSeries) {
        return;
      }

      const packSongs = songs.filter(
        (song) => (song.pack_name || "(no pack)") === packName
      );
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
    [songs, isExecutingDoubleAlbumSeries, setDoubleAlbumSeriesData, setShowDoubleAlbumSeriesModal]
  );

  // This function will be called from the component with doubleAlbumSeriesData
  const executeDoubleAlbumSeries = useCallback(
    (doubleAlbumSeriesData) => {
      if (!doubleAlbumSeriesData || isExecutingDoubleAlbumSeries) return;

      setIsExecutingDoubleAlbumSeries(true);

      const { secondAlbumName, songsToMove, newPackName, mostCommonArtist } =
        doubleAlbumSeriesData;

      const execute = async () => {
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
      };

      execute();
    },
    [isExecutingDoubleAlbumSeries, setIsExecutingDoubleAlbumSeries, setShowDoubleAlbumSeriesModal, setDoubleAlbumSeriesData, refreshSongs]
  );

  const handleCreateAlbumSeriesFromPack = useCallback(
    async (packName, albumSeriesForm) => {
      try {
        // Find the pack ID by looking at songs in the pack
        const packSongs = songs.filter(
          (s) => (s.pack_name || "(no pack)") === packName
        );
        if (packSongs.length === 0) {
          if (window.showNotification) {
            window.showNotification("No songs found in pack", "error");
          }
          return;
        }

        const packId = packSongs[0].pack_id;
        if (!packId) {
          if (window.showNotification) {
            window.showNotification("Pack ID not found", "error");
          }
          return;
        }

        // Check if pack has at least 4 songs from the specified album
        const songsFromAlbum = packSongs.filter(
          (song) =>
            song.artist?.toLowerCase() ===
              albumSeriesForm.artist_name.toLowerCase() &&
            song.album?.toLowerCase() === albumSeriesForm.album_name.toLowerCase()
        );

        if (songsFromAlbum.length < 4) {
          if (window.showNotification) {
            window.showNotification(
              `Pack must have at least 4 songs from "${albumSeriesForm.artist_name} - ${albumSeriesForm.album_name}" (found ${songsFromAlbum.length})`,
              "error"
            );
          }
          return;
        }

        await apiPost("/album-series/", {
          pack_id: packId,
          artist_name: albumSeriesForm.artist_name,
          album_name: albumSeriesForm.album_name,
        });

        if (window.showNotification) {
          window.showNotification(
            `Album series created for "${albumSeriesForm.artist_name} - ${albumSeriesForm.album_name}"`,
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to create album series:", error);
        if (window.showNotification) {
          window.showNotification("Failed to create album series", "error");
        }
      }
    },
    [songs]
  );

  return {
    handleCreateAlbumSeries,
    handleShowAlbumSeriesModal,
    handleMakeDoubleAlbumSeries,
    executeDoubleAlbumSeries,
    handleCreateAlbumSeriesFromPack,
  };
};

