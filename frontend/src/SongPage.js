import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "./contexts/AuthContext";
import SongTable from "./components/SongTable";
import PageHeader from "./components/PageHeader";
import BulkEditModal from "./components/BulkEditModal";
import CustomAlert from "./components/CustomAlert";
import CustomPrompt from "./components/CustomPrompt";
import AlbumSeriesModal from "./components/AlbumSeriesModal";
import DoubleAlbumSeriesModal from "./components/DoubleAlbumSeriesModal";
import UnifiedCollaborationModal from "./components/UnifiedCollaborationModal";
import Fireworks from "./components/Fireworks";
import LoadingSpinner from "./components/LoadingSpinner";
import useCollaborations from "./hooks/useCollaborations";
import { apiGet, apiPost, apiDelete, apiPatch, apiPut } from "./utils/api";
import AlbumSeriesEditModal from "./components/AlbumSeriesEditModal";

function SongPage({ status }) {
  const { user } = useAuth();

  // Core state
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [editing, setEditing] = useState({});
  const [editValues, setEditValues] = useState({});
  const [spotifyOptions, setSpotifyOptions] = useState({});
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupBy, setGroupBy] = useState("pack");

  // Modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAlbumSeriesModal, setShowAlbumSeriesModal] = useState(false);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [albumSeriesFormData, setAlbumSeriesFormData] = useState({
    artist_name: "",
    album_name: "",
    year: "",
    cover_image_url: "",
    description: "",
  });
  const [selectedItemForCollaboration, setSelectedItemForCollaboration] =
    useState(null);
  const [collaborationType, setCollaborationType] = useState("pack");
  // Alert/Prompt state
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning",
  });
  const [promptConfig, setPromptConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    placeholder: "",
  });

  const [editSeriesModal, setEditSeriesModal] = useState({
    open: false,
    packId: null,
    series: [],
    defaultSeriesId: null,
  });
  const [showDoubleAlbumSeriesModal, setShowDoubleAlbumSeriesModal] =
    useState(false);
  const [doubleAlbumSeriesData, setDoubleAlbumSeriesData] = useState(null);
  const [isExecutingDoubleAlbumSeries, setIsExecutingDoubleAlbumSeries] =
    useState(false);

  // Use collaboration hook
  const { fetchCollaborations, getPackCollaborators } = useCollaborations();

  // Simple cache for songs data
  const [songsCache, setSongsCache] = useState({});

  // Define fetchSongs before using it in useEffect
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
      console.log(
        "fetchSongs: Fetched fresh data from server:",
        response.length,
        "songs"
      );
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

  // Load data
  useEffect(() => {
    fetchSongs();
    fetchCollaborations();
  }, [status, fetchCollaborations, fetchSongs]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchSongs(), 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, fetchSongs]);

  useEffect(() => {
    const handler = (e) => {
      const { packId, series } = e.detail || {};
      setEditSeriesModal({
        open: true,
        packId: packId || null,
        series: series || [],
        defaultSeriesId: series?.[0]?.id || null,
      });
    };
    window.addEventListener("open-edit-album-series", handler);
    return () => window.removeEventListener("open-edit-album-series", handler);
  }, []);

  // Listen for global cache invalidation events
  useEffect(() => {
    const invalidate = () => {
      setSongsCache({});
      fetchSongs();
    };
    window.addEventListener("songs-invalidate-cache", invalidate);
    return () =>
      window.removeEventListener("songs-invalidate-cache", invalidate);
  }, [fetchSongs]);

  // Sorting and grouping logic
  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      if (!sortKey) return 0;

      let aValue = a[sortKey] || "";
      let bValue = b[sortKey] || "";

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [songs, sortKey, sortDirection]);

  const groupedSongs = useMemo(() => {
    // No need to filter here since we're already filtering on the backend
    const filteredSongs = sortedSongs;

    if (groupBy === "artist") {
      const grouped = filteredSongs.reduce((acc, song) => {
        if (!song || typeof song !== "object") return acc;

        const artist = song.artist || "Unknown Artist";
        const album = song.album || "Unknown Album";

        if (!acc[artist]) acc[artist] = {};
        if (!acc[artist][album]) acc[artist][album] = [];

        acc[artist][album].push(song);
        return acc;
      }, {});

      // Sort songs within each album (editable first)
      Object.keys(grouped).forEach((artist) => {
        Object.keys(grouped[artist]).forEach((album) => {
          grouped[artist][album].sort((a, b) => {
            // Editable songs first
            if (a.is_editable && !b.is_editable) return -1;
            if (!a.is_editable && b.is_editable) return 1;
            // Then by title
            return (a.title || "").localeCompare(b.title || "");
          });
        });
      });

      return grouped;
    } else {
      const grouped = filteredSongs.reduce((acc, song) => {
        if (!song || typeof song !== "object") return acc;

        const packName = song.pack_name || "(no pack)";
        if (!acc[packName]) acc[packName] = [];
        acc[packName].push(song);
        return acc;
      }, {});

      // Sort songs within each pack (editable first)
      Object.keys(grouped).forEach((packName) => {
        grouped[packName].sort((a, b) => {
          // Editable songs first
          if (a.is_editable && !b.is_editable) return -1;
          if (!a.is_editable && b.is_editable) return 1;
          // Then by title
          return (a.title || "").localeCompare(b.title || "");
        });
      });

      // Sort pack names alphabetically, with "(no pack)" at the end
      const sortedGrouped = {};
      Object.keys(grouped)
        .sort((a, b) => {
          // Put "(no pack)" at the end
          if (a === "(no pack)") return 1;
          if (b === "(no pack)") return -1;
          // Sort other packs alphabetically
          return a.localeCompare(b);
        })
        .forEach((packName) => {
          sortedGrouped[packName] = grouped[packName];
        });

      return sortedGrouped;
    }
  }, [sortedSongs, search, groupBy]);

  // Event handlers
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allCollapsed = Object.keys(groupedSongs || {})
    .filter((key) => groupedSongs[key]?.length > 0)
    .every((key) => collapsedGroups[key]);

  const toggleAllGroups = () => {
    const groupKeys = Object.keys(groupedSongs).map((key) =>
      groupBy === "pack" ? key : key
    );

    if (allCollapsed) {
      setCollapsedGroups({});
    } else {
      const newCollapsed = {};
      groupKeys.forEach((key) => {
        newCollapsed[key] = true;
      });
      setCollapsedGroups(newCollapsed);
    }
  };

  // Bulk action handlers

  const handleStartWork = async (songIds = null) => {
    // Move songs from Future Plans to In Progress
    try {
      const songsToMove = songIds
        ? songs.filter((s) => songIds.includes(s.id))
        : songs.filter((s) => selectedSongs.includes(s.id));

      const movedIds = new Set(songsToMove.map((s) => s.id));

      // Group songs by album series for status updates
      const seriesGroups = {};
      songsToMove.forEach((song) => {
        if (song.album_series_id) {
          if (!seriesGroups[song.album_series_id]) {
            seriesGroups[song.album_series_id] = [];
          }
          seriesGroups[song.album_series_id].push(song);
        }
      });

      console.log("DEBUG: Songs to move:", songsToMove);
      console.log("DEBUG: Series groups:", seriesGroups);

      // Optimistic UI update
      setSongs((prev) => {
        if (status === "Future Plans") {
          // Remove moved songs from the current view
          return prev.filter((s) => !movedIds.has(s.id));
        }
        // Otherwise, mark them as In Progress
        return prev.map((s) =>
          movedIds.has(s.id) ? { ...s, status: "In Progress" } : s
        );
      });

      await Promise.all(
        songsToMove.map((song) =>
          apiPatch(`/songs/${song.id}`, { status: "In Progress" })
        )
      );

      // Update album series status to "in_progress" if any songs belong to a series
      for (const [seriesId, seriesSongs] of Object.entries(seriesGroups)) {
        if (seriesSongs.length > 0) {
          try {
            console.log(
              `DEBUG: Updating album series ${seriesId} status to in_progress`
            );
            const response = await apiPut(`/album-series/${seriesId}/status`, {
              status: "in_progress",
            });
            console.log(
              `DEBUG: Album series ${seriesId} status update response:`,
              response
            );
          } catch (err) {
            console.error(
              `Failed to update album series ${seriesId} status:`,
              err
            );
          }
        }
      }

      // Invalidate cache so fetchSongs pulls fresh data
      setSongsCache({});
      fetchSongs();
      setSelectedSongs([]);

      if (window.showNotification) {
        window.showNotification(
          `Started work on ${songsToMove.length} song${
            songsToMove.length === 1 ? "" : "s"
          }.`,
          "success"
        );
      }
    } catch (error) {
      console.error("Failed to start work:", error);
      if (window.showNotification) {
        window.showNotification("Failed to start work", "error");
      }
      // Optionally refresh to recover from any mismatch
      fetchSongs();
    }
  };

  // Song editing handlers
  const saveEdit = async (id, field) => {
    const value = editValues[`${id}_${field}`];
    if (value === undefined) return;

    try {
      const updates = { [field]: value };
      const response = await apiPatch(`/songs/${id}`, updates);

      setSongs((prevSongs) =>
        prevSongs.map((song) =>
          song.id === id ? { ...song, ...response } : song
        )
      );

      // Remove unnecessary cache clearing - we already updated local state
      // setSongsCache({});

      setEditing((prev) => {
        const newState = { ...prev };
        delete newState[`${id}_${field}`];
        return newState;
      });

      setEditValues((prev) => {
        const newState = { ...prev };
        delete newState[`${id}_${field}`];
        return newState;
      });
    } catch (error) {
      console.error("Failed to save edit:", error);
    }
  };

  const fetchSpotifyOptions = async (song) => {
    try {
      const data = await apiGet(`/spotify/${song.id}/spotify-options/`);
      setSpotifyOptions((prev) => ({ ...prev, [song.id]: data }));
    } catch (error) {
      console.error("Failed to fetch Spotify options:", error);
    }
  };

  const applySpotifyEnhancement = async (songId, trackId) => {
    try {
      const updated = await apiPost(`/spotify/${songId}/enhance/`, {
        track_id: trackId,
      });

      // Only update specific fields that should change from Spotify enhancement
      // Preserve pack-related fields and other important display fields
      setSongs((prevSongs) =>
        prevSongs.map((song) =>
          song.id === songId
            ? {
                ...song,
                album: updated.album,
                year: updated.year,
                album_cover: updated.album_cover,
                artist: updated.artist,
                title: updated.title,
              }
            : song
        )
      );

      // Close the Spotify enhancement modal
      setSpotifyOptions((prev) => ({ ...prev, [songId]: undefined }));

      window.showNotification("Song enhanced successfully!", "success");
    } catch (error) {
      console.error(
        "Failed to apply Spotify enhancement:",
        error.message || error
      );
      // Show user-friendly error message
      window.showNotification("Failed to apply Spotify enhancement", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiDelete(`/songs/${id}`);
      setSongs(songs.filter((song) => song.id !== id));
      // Remove unnecessary cache clearing - we already updated local state
      // setSongsCache({});
    } catch (error) {
      console.error("Failed to delete song:", error);
    }
  };

  const handlePackNameUpdate = async (packId, newName) => {
    try {
      await apiPatch(`/packs/${packId}`, { name: newName });
      // Clear cache and refresh
      setSongsCache({});
      fetchSongs();
    } catch (error) {
      console.error("Failed to update pack name:", error);
      throw error; // Re-throw so the component can handle it
    }
  };

  const handleDeletePack = async (packName, packId) => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Pack",
      message: `Are you sure you want to delete "${packName}"? This will permanently delete the pack and all songs in it.`,
      onConfirm: async () => {
        try {
          if (!packId) {
            throw new Error("Pack ID is missing - cannot delete pack");
          }

          // Delete the pack (this will cascade delete songs and album series)
          await apiDelete(`/packs/${packId}`);

          // Clear cache and refresh
          setSongsCache({});
          fetchSongs();

          window.showNotification(
            `Pack "${packName}" deleted successfully`,
            "success"
          );
        } catch (error) {
          console.error("Failed to delete pack:", error);
          window.showNotification(
            `Failed to delete pack: ${error.message}`,
            "error"
          );
        }
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
      },
      type: "danger",
    });
  };

  const handleShowAlbumSeriesModal = (packName, albumsWithEnoughSongs) => {
    console.log(
      "Opening album series modal for pack:",
      packName,
      albumsWithEnoughSongs
    );

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
    setShowAlbumSeriesModal(true);
  };

  const handleAlbumSeriesSubmit = async () => {
    if (selectedSongs.length === 0) {
      window.showNotification("Please select songs first", "warning");
      return;
    }

    try {
      const firstSong = songs.find((song) => selectedSongs.includes(song.id));
      if (!firstSong?.pack_name) {
        window.showNotification("Selected songs must be in a pack", "error");
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

      window.showNotification(
        `Album series "${albumSeriesFormData.album_name}" created successfully!`,
        "success"
      );

      setShowAlbumSeriesModal(false);
      setSelectedSongs([]);
      setAlbumSeriesFormData({
        artist_name: "",
        album_name: "",
        year: "",
        cover_image_url: "",
        description: "",
      });

      // Clear cache and refresh
      setSongsCache({});
      fetchSongs();
    } catch (error) {
      console.error("Failed to create album series:", error);
      window.showNotification("Failed to create album series", "error");
    }
  };

  const handleMakeDoubleAlbumSeries = async (
    packName,
    albumsWithEnoughSongs
  ) => {
    if (!albumsWithEnoughSongs || albumsWithEnoughSongs.length < 2) {
      window.showNotification(
        "Pack must have at least 2 albums with 4+ songs each for double album series",
        "error"
      );
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
      window.showNotification(
        "No suitable album found for double album series",
        "error"
      );
      return;
    }

    const [secondAlbumName] = albumsToChooseFrom[0];
    const songsInSecondAlbum = packSongs.filter(
      (song) => song.album === secondAlbumName
    );

    if (songsInSecondAlbum.length < 4) {
      window.showNotification(
        `"${secondAlbumName}" needs at least 4 songs for album series (found ${songsInSecondAlbum.length} total songs including optional ones)`,
        "error"
      );
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
  };

  const executeDoubleAlbumSeries = async () => {
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

      window.showNotification(
        `Double album series created! "${secondAlbumName}" split into its own album series with ${songsToMove.length} songs.`,
        "success"
      );

      // Close modal and refresh songs to show the updated structure
      setShowDoubleAlbumSeriesModal(false);
      setDoubleAlbumSeriesData(null);
      setSongsCache({});
      fetchSongs();
    } catch (error) {
      console.error("Error creating double album series:", error);
      window.showNotification("Failed to create double album series", "error");
    } finally {
      setIsExecutingDoubleAlbumSeries(false);
    }
  };

  return (
    <div className="app-container">
      <PageHeader
        status={status}
        search={search}
        setSearch={setSearch}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        allCollapsed={allCollapsed}
        toggleAllGroups={toggleAllGroups}
      />

      {/* Loading Spinner */}
      {loading && <LoadingSpinner message="Loading songs..." />}

      {!loading && (
        <SongTable
          songs={songs}
          selectedSongs={selectedSongs}
          setSelectedSongs={setSelectedSongs}
          editing={editing}
          setEditing={setEditing}
          editValues={editValues}
          setEditValues={setEditValues}
          saveEdit={saveEdit}
          fetchSpotifyOptions={fetchSpotifyOptions}
          handleDelete={handleDelete}
          spotifyOptions={spotifyOptions}
          setSpotifyOptions={setSpotifyOptions}
          applySpotifyEnhancement={applySpotifyEnhancement}
          sortKey={sortKey}
          sortDirection={sortDirection}
          handleSort={handleSort}
          groupBy={groupBy}
          groupedSongs={groupedSongs}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          user={user}
          getPackCollaborators={getPackCollaborators}
          setShowCollaborationModal={setShowCollaborationModal}
          setSelectedItemForCollaboration={setSelectedItemForCollaboration}
          setCollaborationType={setCollaborationType}
          status={status}
          onBulkEdit={() => setShowBulkModal(true)}
          onStartWork={handleStartWork}
          onBulkDelete={() => {}} // Placeholder for now
          onBulkEnhance={() => {}} // Placeholder for now
          onCleanTitles={() => {}} // Placeholder for now
          onSongAdded={fetchSongs}
          onPackNameUpdate={handlePackNameUpdate}
          onDeletePack={handleDeletePack}
          onShowAlbumSeriesModal={handleShowAlbumSeriesModal}
          onMakeDoubleAlbumSeries={handleMakeDoubleAlbumSeries}
        />
      )}

      {/* Edit Album Series Modal */}
      <AlbumSeriesEditModal
        key={`${editSeriesModal.defaultSeriesId}-${editSeriesModal.packId}`}
        isOpen={editSeriesModal.open}
        onClose={() =>
          setEditSeriesModal({
            open: false,
            packId: null,
            series: [],
            defaultSeriesId: null,
          })
        }
        packId={editSeriesModal.packId}
        seriesList={editSeriesModal.series}
        defaultSeriesId={editSeriesModal.defaultSeriesId}
        onChanged={() => {
          setSongsCache({});
          fetchSongs();
        }}
      />

      {/* Modals */}
      {showBulkModal && (
        <BulkEditModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          selectedSongs={selectedSongs}
          onComplete={() => {
            console.log(
              "BulkEditModal onComplete called - refreshing songs..."
            );
            setShowBulkModal(false);
            setSelectedSongs([]);
            // Clear cache to force fresh data fetch
            setSongsCache({});
            fetchSongs();
          }}
        />
      )}

      {showAlbumSeriesModal && (
        <AlbumSeriesModal
          showModal={showAlbumSeriesModal}
          onClose={() => setShowAlbumSeriesModal(false)}
          formData={albumSeriesFormData}
          setFormData={setAlbumSeriesFormData}
          onSubmit={handleAlbumSeriesSubmit}
          selectedSongs={selectedSongs}
          songs={songs}
        />
      )}

      {/* Double Album Series Confirmation Modal */}
      {showDoubleAlbumSeriesModal && doubleAlbumSeriesData && (
        <DoubleAlbumSeriesModal
          isOpen={showDoubleAlbumSeriesModal}
          onClose={() => {
            setShowDoubleAlbumSeriesModal(false);
            setDoubleAlbumSeriesData(null);
          }}
          onConfirm={executeDoubleAlbumSeries}
          isExecuting={isExecutingDoubleAlbumSeries}
          packName={doubleAlbumSeriesData.packName}
          secondAlbumName={doubleAlbumSeriesData.secondAlbumName}
          songsToMove={doubleAlbumSeriesData.songsToMove}
          newPackName={doubleAlbumSeriesData.newPackName}
        />
      )}

      {showCollaborationModal && (
        <UnifiedCollaborationModal
          isOpen={showCollaborationModal}
          onClose={() => setShowCollaborationModal(false)}
          collaborationType={collaborationType}
          packId={
            collaborationType === "pack"
              ? selectedItemForCollaboration?.id
              : null
          }
          packName={
            collaborationType === "pack"
              ? selectedItemForCollaboration?.name
              : null
          }
          songId={
            collaborationType === "song"
              ? selectedItemForCollaboration?.id
              : null
          }
          songTitle={
            collaborationType === "song"
              ? selectedItemForCollaboration?.name
              : null
          }
          currentUser={user}
          onCollaborationSaved={() => {
            fetchCollaborations();
            fetchSongs();
          }}
        />
      )}

      <CustomAlert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />

      <CustomPrompt
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        message={promptConfig.message}
        placeholder={promptConfig.placeholder}
        onConfirm={promptConfig.onConfirm}
        onCancel={() => setPromptConfig({ ...promptConfig, isOpen: false })}
      />

      <Fireworks />
    </div>
  );
}

export default SongPage;
