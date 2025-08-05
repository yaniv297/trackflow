import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "./contexts/AuthContext";
import SongTable from "./components/SongTable";
import PageHeader from "./components/PageHeader";
import BulkEditModal from "./components/BulkEditModal";
import CustomAlert from "./components/CustomAlert";
import CustomPrompt from "./components/CustomPrompt";
import AlbumSeriesModal from "./components/AlbumSeriesModal";
import UnifiedCollaborationModal from "./components/UnifiedCollaborationModal";
import Fireworks from "./components/Fireworks";
import LoadingSpinner from "./components/LoadingSpinner";
import useCollaborations from "./hooks/useCollaborations";
import { apiGet, apiPost, apiDelete, apiPatch } from "./utils/api";

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

      return grouped;
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

      await Promise.all(
        songsToMove.map((song) =>
          apiPatch(`/songs/${song.id}`, { status: "In Progress" })
        )
      );
      fetchSongs();
      setSelectedSongs([]);
    } catch (error) {
      console.error("Failed to start work:", error);
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

      // Clear cache since data has changed
      setSongsCache({});

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
      setSongs((prevSongs) =>
        prevSongs.map((song) =>
          song.id === songId ? { ...song, ...updated } : song
        )
      );
      // Clear cache since data has changed
      setSongsCache({});
    } catch (error) {
      console.error("Failed to apply Spotify enhancement:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiDelete(`/songs/${id}`);
      setSongs(songs.filter((song) => song.id !== id));
      // Clear cache since data has changed
      setSongsCache({});
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
        />
      )}

      {/* Modals */}
      {showBulkModal && (
        <BulkEditModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          selectedSongs={selectedSongs}
          onComplete={() => {
            setShowBulkModal(false);
            setSelectedSongs([]);
            fetchSongs();
          }}
        />
      )}

      {showAlbumSeriesModal && (
        <AlbumSeriesModal
          isOpen={showAlbumSeriesModal}
          onClose={() => setShowAlbumSeriesModal(false)}
          selectedSongs={selectedSongs}
          songs={songs}
          onComplete={() => {
            setShowAlbumSeriesModal(false);
            setSelectedSongs([]);
            fetchSongs();
          }}
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
        onCancel={() => setAlertConfig({ ...alertConfig, isOpen: false })}
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
