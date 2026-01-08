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
import { usePackRandomizer } from "../hooks/songs/usePackRandomizer";
import PackRandomizerModal from "../components/modals/PackRandomizerModal";

function SongPage({ status }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [publicFilter, setPublicFilter] = useState("all");
  const [showMakeAllPublicConfirm, setShowMakeAllPublicConfirm] =
    useState(false);
  const [makeAllPublicOperation, setMakeAllPublicOperation] =
    useState("public"); // "public" or "private"
  const [showPackRandomizer, setShowPackRandomizer] = useState(false);
  const [showMakeAllPublicWorking, setShowMakeAllPublicWorking] =
    useState(false);
  const [makeAllPublicStatus, setMakeAllPublicStatus] = useState("working"); // "working" or "success"
  const [makeAllPublicMessage, setMakeAllPublicMessage] = useState("");

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

  // Listen for Future Plans refresh events (when songs are marked as needs update from Released page)
  useEffect(() => {
    const handleRefreshFuturePlans = () => {
      // Only refresh if we're on the Future Plans page
      if (status === "Future Plans") {
        refreshSongs();
      }
    };
    window.addEventListener("refresh-future-plans", handleRefreshFuturePlans);
    return () => {
      window.removeEventListener("refresh-future-plans", handleRefreshFuturePlans);
    };
  }, [status, refreshSongs]);

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
  const [packSortBy, setPackSortBy] = useState(
    status === "Released" ? "alphabetical" : "priority"
  );
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
    if (publicFilter === "public")
      return songs.filter((song) => song.is_public === true);
    if (publicFilter === "private")
      return songs.filter((song) => song.is_public !== true);
    return songs;
  }, [songs, publicFilter]);

  // Check if all Future Plans songs are public (for button text)
  const allFuturePlansPublic = useMemo(() => {
    if (status !== "Future Plans" || !user) return false;
    const futurePlansSongs = songs.filter(
      (song) => song.user_id === user.id && song.status === "Future Plans"
    );
    if (futurePlansSongs.length === 0) return false;
    return futurePlansSongs.every((song) => song.is_public === true);
  }, [songs, status, user]);

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
    setSongs((prevSongs) =>
      prevSongs.map((song) =>
        song.id === songId ? { ...song, ...updates } : song
      )
    );
  };

  // Handle bulk public status toggle
  const handleBulkTogglePublic = async (makePublic) => {
    try {
      // Filter to only songs that actually need a change
      const songIdsToUpdate = selectedSongs.filter((songId) => {
        const song = songs.find((s) => s.id === songId);
        return song && song.is_public !== makePublic;
      });

      if (songIdsToUpdate.length === 0) {
        if (window.showNotification) {
          window.showNotification(
            `Selected songs are already ${makePublic ? "public" : "private"}`,
            "info",
            3000
          );
        }
        return;
      }

      const result = await publicSongsService.bulkToggleSongsPublic(
        songIdsToUpdate,
        makePublic
      );

      if (!result.success) {
        if (window.showNotification) {
          window.showNotification(
            result.error || "Failed to update some songs",
            "error",
            5000
          );
        }
        return;
      }

      const {
        success_count: successCount = 0,
        failed_song_ids: failedSongIds = [],
      } = result.data || {};

      const failedSet = new Set(failedSongIds || []);
      const successfulIds = songIdsToUpdate.filter((id) => !failedSet.has(id));

      if (successfulIds.length > 0) {
        setSongs((prevSongs) =>
          prevSongs.map((song) =>
            successfulIds.includes(song.id)
              ? { ...song, is_public: makePublic }
              : song
          )
        );
      }

      // Show success notification
      if (window.showNotification) {
        window.showNotification(
          failedSongIds && failedSongIds.length > 0
            ? `Updated ${successCount} songs, ${failedSongIds.length} failed`
            : `Successfully made ${successCount} songs ${
                makePublic ? "public" : "private"
              }`,
          "success",
          3000
        );
      }

      // Clear selection
      setSelectedSongs([]);
    } catch (error) {
      console.error("Error toggling bulk public status:", error);
      if (window.showNotification) {
        window.showNotification("Failed to update some songs", "error", 5000);
      }
    }
  };

  // Handle making all Future Plans songs public or private
  const handleMakeAllPublic = () => {
    setMakeAllPublicOperation(allFuturePlansPublic ? "private" : "public");
    setShowMakeAllPublicConfirm(true);
  };

  const confirmMakeAllPublic = async () => {
    const isMakingPublic = makeAllPublicOperation === "public";

    try {
      // Use all songs, not filtered songs, to get accurate count
      const futurePlansSongsToUpdate = songs.filter(
        (song) =>
          song.user_id === user?.id &&
          song.status === "Future Plans" &&
          song.is_public === !isMakingPublic
      );

      if (futurePlansSongsToUpdate.length === 0) {
        setShowMakeAllPublicConfirm(false);
        return;
      }

      setShowMakeAllPublicConfirm(false);

      // Show working modal
      setShowMakeAllPublicWorking(true);
      setMakeAllPublicStatus("working");
      setMakeAllPublicMessage(
        `Making all Future Plans songs ${
          isMakingPublic ? "public" : "private"
        }...`
      );

      // Use the new efficient endpoint
      const result = isMakingPublic
        ? await publicSongsService.makeAllFuturePlansPublic()
        : await publicSongsService.makeAllFuturePlansPrivate();

      if (!result.success) {
        console.error(
          `Error making all songs ${isMakingPublic ? "public" : "private"}:`,
          result.error
        );
        setShowMakeAllPublicWorking(false);
        if (window.showNotification) {
          window.showNotification(
            result.error ||
              `Failed to make some songs ${
                isMakingPublic ? "public" : "private"
              }`,
            "error",
            5000
          );
        }
        return;
      }

      const { success_count: successCount = 0 } = result.data || {};

      // Update all Future Plans songs in the UI
      setSongs((prevSongs) =>
        prevSongs.map((song) =>
          song.user_id === user?.id &&
          song.status === "Future Plans" &&
          song.is_public === !isMakingPublic
            ? { ...song, is_public: isMakingPublic }
            : song
        )
      );

      // Show success message
      setMakeAllPublicStatus("success");
      setMakeAllPublicMessage(
        `Successfully made ${successCount} Future Plans songs ${
          isMakingPublic ? "public" : "private"
        }!`
      );
    } catch (error) {
      console.error(
        `Error making all songs ${isMakingPublic ? "public" : "private"}:`,
        error
      );
      setShowMakeAllPublicWorking(false);
      if (window.showNotification) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.message ||
          `Failed to make some songs ${isMakingPublic ? "public" : "private"}`;
        window.showNotification(errorMessage, "error", 5000);
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

  // Pack randomizer - extract packs from grouped songs for Future Plans
  const randomizerPacks = useMemo(() => {
    if (status !== "Future Plans" || !groupedSongs || groupBy !== "pack") {
      return [];
    }

    return Object.keys(groupedSongs)
      .map((packName) => {
        const packSongs = groupedSongs[packName] || [];
        const firstSong = packSongs[0];
        return {
          id: firstSong?.pack_id,
          name: packName,
          songCount: packSongs.length,
        };
      })
      .filter((pack) => pack.id && pack.name !== "(no pack)");
  }, [groupedSongs, groupBy, status]);

  // Pack randomizer hook
  const packRandomizer = usePackRandomizer(randomizerPacks, refreshSongs);

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
        onMakeAllPublic={
          status === "Future Plans" ? handleMakeAllPublic : undefined
        }
        allFuturePlansPublic={
          status === "Future Plans" ? allFuturePlansPublic : undefined
        }
        onRandomizerClick={
          status === "Future Plans"
            ? () => setShowPackRandomizer(true)
            : undefined
        }
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
          search={search}
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
          status={status}
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

      {/* Make All Public/Private Confirmation Modal */}
      <CustomAlert
        isOpen={showMakeAllPublicConfirm}
        title={
          makeAllPublicOperation === "public"
            ? "Make All Future Plans Public"
            : "Make All Future Plans Private"
        }
        message={
          makeAllPublicOperation === "public"
            ? `Are you sure you want to make ALL your Future Plans songs public? This will make them visible to other users in the Community section. This will also enable default public sharing for new songs. You can still make individual songs private afterward if needed.`
            : `Are you sure you want to make ALL your Future Plans songs private? This will hide them from other users in the Community section. This will also disable default public sharing for new songs. You can still make individual songs public afterward if needed.`
        }
        type="warning"
        confirmText={
          makeAllPublicOperation === "public"
            ? "Yes, Make All Public"
            : "Yes, Make All Private"
        }
        cancelText="Cancel"
        onConfirm={confirmMakeAllPublic}
        onClose={() => setShowMakeAllPublicConfirm(false)}
      />

      {/* Pack Randomizer Modal */}
      {status === "Future Plans" && (
        <PackRandomizerModal
          isOpen={showPackRandomizer}
          onClose={() => setShowPackRandomizer(false)}
          randomizer={packRandomizer}
        />
      )}

      {/* Make All Public/Private Working/Success Modal */}
      {status === "Future Plans" && showMakeAllPublicWorking && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "24px 28px",
              minWidth: "360px",
              maxWidth: "440px",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              position: "relative",
            }}
          >
            <div style={{ textAlign: "center" }}>
              {makeAllPublicStatus === "working" ? (
                <>
                  <div
                    style={{
                      fontSize: "48px",
                      marginBottom: "16px",
                      animation: "spin 1s linear infinite",
                    }}
                  >
                    ⏳
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    Working...
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      color: "#4b5563",
                    }}
                  >
                    {makeAllPublicMessage}
                  </p>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: "48px",
                      marginBottom: "16px",
                    }}
                  >
                    ✅
                  </div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    Operation Completed Successfully
                  </h3>
                  <p
                    style={{
                      margin: "0 0 20px 0",
                      fontSize: "14px",
                      color: "#4b5563",
                    }}
                  >
                    {makeAllPublicMessage}
                  </p>
                  <button
                    onClick={() => setShowMakeAllPublicWorking(false)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "999px",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      backgroundColor: "#111827",
                      color: "white",
                    }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
            <style>
              {`
                @keyframes spin {
                  from {
                    transform: rotate(0deg);
                  }
                  to {
                    transform: rotate(360deg);
                  }
                }
              `}
            </style>
          </div>
        </div>
      )}

      <Fireworks />
    </div>
  );
}

export default SongPage;
