import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import publicSongsService from "../services/publicSongsService";
import SongTable from "../components/tables/SongTable";
import PageHeader from "../components/navigation/PageHeader";
import BulkEditModal from "../components/modals/BulkEditModal";
import CustomAlert from "../components/ui/CustomAlert";
import CustomPrompt from "../components/ui/CustomPrompt";
import AlbumSeriesModal from "../components/modals/AlbumSeriesModal";
import DoubleAlbumSeriesModal from "../components/modals/DoubleAlbumSeriesModal";
import UnifiedCollaborationModal from "../components/modals/UnifiedCollaborationModal";
import Fireworks from "../components/ui/Fireworks";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import AlbumSeriesEditModal from "../components/modals/AlbumSeriesEditModal";
import useCollaborations from "../hooks/collaborations/useCollaborations";
import { useSongData } from "../hooks/songs/useSongData";
import { useSongSortingAndGrouping } from "../hooks/songs/useSongSortingAndGrouping";
import { useSongOperations } from "../hooks/songs/useSongOperations";
import { usePackOperations } from "../hooks/songs/usePackOperations";
import { useAlbumSeriesOperations } from "../hooks/songs/useAlbumSeriesOperations";
import { useBulkOperations } from "../hooks/songs/useBulkOperations";
import { useSongPageModals } from "../hooks/songs/useSongPageModals";

function SongPage({ status }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [publicFilter, setPublicFilter] = useState("all");
  const [showMakeAllPublicConfirm, setShowMakeAllPublicConfirm] = useState(false);

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

  // Data fetching
  const { songs, setSongs, packs, setPacks, loading, refreshSongs } =
    useSongData(status, search);

  // Collaborations
  const { fetchCollaborations, getPackCollaborators } = useCollaborations();

  // Load collaborations on mount
  useEffect(() => {
    fetchCollaborations();
  }, [fetchCollaborations]);

  // UI state - initialize basic state first
  const [editing, setEditing] = useState({});
  const [editValues, setEditValues] = useState({});
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupBy, setGroupBy] = useState("pack");
  const [packSortBy, setPackSortBy] = useState("priority");
  const [visibleColumns, setVisibleColumns] = useState({});

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

  // Filter songs based on public status
  const filteredSongs = useMemo(() => {
    if (publicFilter === "all") return songs;
    if (publicFilter === "public") return songs.filter(song => song.is_public === true);
    if (publicFilter === "private") return songs.filter(song => song.is_public !== true);
    return songs;
  }, [songs, publicFilter]);

  // Sorting and grouping
  const { groupedSongs } = useSongSortingAndGrouping(
    filteredSongs,
    sortKey,
    sortDirection,
    groupBy,
    packSortBy,
    packs
  );

  // Compute allCollapsed and toggleAllGroups after groupedSongs is available
  const allCollapsed = useMemo(() => {
    if (!groupedSongs || typeof groupedSongs !== "object") {
      return false;
    }
    return Object.keys(groupedSongs)
      .filter((key) => groupedSongs[key]?.length > 0)
      .every((key) => collapsedGroups[key]);
  }, [groupedSongs, collapsedGroups]);

  const toggleAllGroups = useCallback(() => {
    if (!groupedSongs || typeof groupedSongs !== "object") {
      return;
    }

    const groupKeys = Object.keys(groupedSongs);

    if (allCollapsed) {
      setCollapsedGroups({});
    } else {
      const newCollapsed = {};
      groupKeys.forEach((key) => {
        newCollapsed[key] = true;
      });
      setCollapsedGroups(newCollapsed);
    }
  }, [groupedSongs, allCollapsed]);

  // Song operations
  const {
    spotifyOptions,
    setSpotifyOptions,
    saveEdit: saveEditBase,
    fetchSpotifyOptions,
    applySpotifyEnhancement,
    handleDelete,
  } = useSongOperations(songs, setSongs, refreshSongs);

  // Wrapper for saveEdit to handle editValues and setEditing
  const saveEdit = async (id, field) => {
    try {
      await saveEditBase(id, field, editValues, setEditing, setEditValues);
    } catch (error) {
      // Error already handled in hook
    }
  };

  // Pack operations
  const {
    handlePackNameUpdate: handlePackNameUpdateBase,
    handleDeletePack: handleDeletePackBase,
    updatePackPriority,
  } = usePackOperations(songs, setSongs, packs, setPacks, refreshSongs);

  // Wrapper for handleDeletePack to show alert
  const handleDeletePack = (packName, packId) => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Pack",
      message: `Are you sure you want to delete "${packName}"? This will permanently delete the pack and all songs in it.`,
      onConfirm: async () => {
        try {
          await handleDeletePackBase(packName, packId);
        } catch (error) {
          // Error already handled in hook
        }
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
      },
      type: "danger",
    });
  };

  // Modal state
  const {
    showBulkModal,
    setShowBulkModal,
    showAlbumSeriesModal,
    setShowAlbumSeriesModal,
    showCollaborationModal,
    setShowCollaborationModal,
    selectedItemForCollaboration,
    setSelectedItemForCollaboration,
    collaborationType,
    setCollaborationType,
    editSeriesModal,
    setEditSeriesModal,
  } = useSongPageModals();

  // Album series operations
  const {
    albumSeriesFormData,
    setAlbumSeriesFormData,
    showDoubleAlbumSeriesModal,
    setShowDoubleAlbumSeriesModal,
    doubleAlbumSeriesData,
    setDoubleAlbumSeriesData,
    isExecutingDoubleAlbumSeries,
    handleShowAlbumSeriesModal,
    handleAlbumSeriesSubmit: handleAlbumSeriesSubmitBase,
    handleMakeDoubleAlbumSeries,
    executeDoubleAlbumSeries,
  } = useAlbumSeriesOperations(
    songs,
    setSongs,
    selectedSongs,
    setSelectedSongs,
    refreshSongs,
    setShowAlbumSeriesModal
  );

  // Wrapper for handleAlbumSeriesSubmit to close modal
  const handleAlbumSeriesSubmit = async () => {
    try {
      await handleAlbumSeriesSubmitBase();
      setShowAlbumSeriesModal(false);
    } catch (error) {
      // Error already handled in hook
    }
  };

  // Handle song updates (e.g., public status toggle)
  const handleSongUpdate = (songId, updates) => {
    setSongs(prevSongs => 
      prevSongs.map(song => 
        song.id === songId ? { ...song, ...updates } : song
      )
    );
  };

  // Handle bulk public status toggle
  const handleBulkTogglePublic = async (makePublic) => {
    try {
      let successCount = 0;
      
      // Call API for each selected song that needs to change
      for (const songId of selectedSongs) {
        const song = songs.find(s => s.id === songId);
        if (song && song.is_public !== makePublic) {
          const result = await publicSongsService.toggleSongPublic(songId);
          if (result.success) {
            handleSongUpdate(songId, { is_public: result.data.is_public });
            successCount++;
          }
        }
      }

      // Show success notification
      if (window.showNotification) {
        window.showNotification(
          `Successfully made ${successCount} songs ${makePublic ? 'public' : 'private'}`,
          'success',
          3000
        );
      }

      // Clear selection
      setSelectedSongs([]);

    } catch (error) {
      console.error('Error toggling bulk public status:', error);
      if (window.showNotification) {
        window.showNotification(
          'Failed to update some songs',
          'error',
          5000
        );
      }
    }
  };

  // Handle making all Future Plans songs public
  const handleMakeAllPublic = () => {
    setShowMakeAllPublicConfirm(true);
  };

  const confirmMakeAllPublic = async () => {
    try {
      // Use all songs, not filtered songs, to get accurate count
      const futurePlansPrivateSongs = songs.filter(song => 
        song.user_id === user?.id && !song.is_public
      );

      if (futurePlansPrivateSongs.length === 0) {
        if (window.showNotification) {
          window.showNotification(
            'All your Future Plans songs are already public!',
            'info',
            3000
          );
        }
        setShowMakeAllPublicConfirm(false);
        return;
      }

      let successCount = 0;
      
      // Call API for each private song
      for (const song of futurePlansPrivateSongs) {
        const result = await publicSongsService.toggleSongPublic(song.id);
        if (result.success) {
          handleSongUpdate(song.id, { is_public: true });
          successCount++;
        }
      }

      // Show success notification
      if (window.showNotification) {
        window.showNotification(
          `Successfully made ${successCount} Future Plans songs public!`,
          'success',
          4000
        );
      }

      setShowMakeAllPublicConfirm(false);

    } catch (error) {
      console.error('Error making all songs public:', error);
      if (window.showNotification) {
        window.showNotification(
          'Failed to make some songs public',
          'error',
          5000
        );
      }
    }
  };

  // Bulk operations
  const { handleStartWork } = useBulkOperations(
    songs,
    setSongs,
    selectedSongs,
    setSelectedSongs,
    status,
    refreshSongs
  );

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
        packSortBy={packSortBy}
        setPackSortBy={setPackSortBy}
        onColumnChange={setVisibleColumns}
        publicFilter={publicFilter}
        setPublicFilter={setPublicFilter}
        selectedSongs={selectedSongs}
        onBulkTogglePublic={handleBulkTogglePublic}
        onMakeAllPublic={status === "Future Plans" ? handleMakeAllPublic : undefined}
      />

      {/* Loading Spinner */}
      {loading && <LoadingSpinner message="Loading songs..." />}

      {!loading && (
        <SongTable
          songs={filteredSongs}
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
          onSongAdded={() => {
            // Ensure we bypass the local cache so new songs appear immediately
            refreshSongs();
          }}
          onPackNameUpdate={handlePackNameUpdateBase}
          onDeletePack={handleDeletePack}
          onShowAlbumSeriesModal={handleShowAlbumSeriesModal}
          onMakeDoubleAlbumSeries={handleMakeDoubleAlbumSeries}
          onUpdatePackPriority={updatePackPriority}
          packs={packs}
          visibleColumns={visibleColumns}
          onSongUpdate={handleSongUpdate}
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
        onChanged={refreshSongs}
      />

      {/* Modals */}
      {showBulkModal && (
        <BulkEditModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          selectedSongs={selectedSongs}
          onComplete={() => {
            setShowBulkModal(false);
            setSelectedSongs([]);
            // Clear cache to force fresh data fetch
            refreshSongs();
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
            refreshSongs();
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

      {/* Make All Public Confirmation Modal */}
      <CustomAlert
        isOpen={showMakeAllPublicConfirm}
        title="Make All Future Plans Public"
        message={`Are you sure you want to make ALL your Future Plans songs public? This will make them visible to other users in the Community section. You can still make individual songs private afterward if needed.`}
        type="warning"
        confirmText="Yes, Make All Public"
        cancelText="Cancel"
        onConfirm={confirmMakeAllPublic}
        onClose={() => setShowMakeAllPublicConfirm(false)}
      />

      <Fireworks />
    </div>
  );
}

export default SongPage;
