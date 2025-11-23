import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useWipData } from "../../hooks/wip/useWipData";
import { useWorkflowData } from "../../hooks/workflows/useWorkflowData";
import { useWipPageUI } from "../../hooks/wip/useWipPageUI";
import { useWipPageModals } from "../../hooks/wip/useWipPageModals";
import { useWipSongOperations } from "../../hooks/wip/useWipSongOperations";
import { useWipPackOperations } from "../../hooks/wip/useWipPackOperations";
import { useWipAlbumSeriesOperations } from "../../hooks/wip/useWipAlbumSeriesOperations";
import { useWipReleaseOperations } from "../../hooks/wip/useWipReleaseOperations";
import { useWipReleaseHandlers } from "../../hooks/wip/useWipReleaseHandlers";
import { useWipCompletionGroups } from "../../hooks/wip/useWipCompletionGroups";
import { useWipWelcomeNotification } from "../../hooks/wip/useWipWelcomeNotification";
import { useWipPackToggle } from "../../hooks/wip/useWipPackToggle";
import { useWipFilteredGrouped } from "../../hooks/wip/useWipFilteredGrouped";
import { useWipSongAdd } from "../../hooks/wip/useWipSongAdd";
import WipPageHeader from "../../components/navigation/WipPageHeader";
import WorkflowErrorBoundary from "../../components/features/workflows/WorkflowErrorBoundary";
import WorkflowLoadingSpinner from "../../components/features/workflows/WorkflowLoadingSpinner";
import Fireworks from "../../components/ui/Fireworks";
import WipEmptyState from "./components/WipEmptyState";
import WipPackView from "./components/WipPackView";
import WipCompletionView from "./components/WipCompletionView";
import WipModals from "./components/WipModals";

function WipPage() {
  const { user } = useAuth();
  const {
    songs,
    setSongs,
    userCollaborations,
    collapsedPacks,
    setCollapsedPacks,
    grouped,
    getPackCollaborators,
    refreshCollaborations,
    refreshSongs,
    updatePackPriorityLocal,
    loading,
    packSortBy,
    setPackSortBy,
  } = useWipData(user);

  // Get dynamic workflow fields for the current user
  const { authoringFields } = useWorkflowData(user);

  // Welcome notification
  useWipWelcomeNotification();

  // UI state
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    newSongData,
    setNewSongData,
    showAddForm,
    setShowAddForm,
    selectedSongs,
    setSelectedSongs,
    fireworksTrigger,
    setFireworksTrigger,
  } = useWipPageUI();

  // Modal state
  const {
    showAlbumSeriesModal,
    setShowAlbumSeriesModal,
    albumSeriesForm,
    setAlbumSeriesForm,
    showCollaborationModal,
    setShowCollaborationModal,
    selectedItemForCollaboration,
    setSelectedItemForCollaboration,
    collaborationType,
    setCollaborationType,
    editSeriesModal,
    setEditSeriesModal,
    showDoubleAlbumSeriesModal,
    setShowDoubleAlbumSeriesModal,
    doubleAlbumSeriesData,
    setDoubleAlbumSeriesData,
    showReleaseModal,
    setShowReleaseModal,
    releaseModalData,
    setReleaseModalData,
    isExecutingDoubleAlbumSeries,
    setIsExecutingDoubleAlbumSeries,
    alertConfig,
    setAlertConfig,
  } = useWipPageModals();

  // Completion groups
  const { completionGroups } = useWipCompletionGroups(
    songs,
    authoringFields,
    user,
    searchQuery
  );

  // Filtered grouped packs
  const { filteredGrouped } = useWipFilteredGrouped(grouped, searchQuery);

  // Pack toggle operations
  const { togglePack, toggleCategory, toggleAll } = useWipPackToggle(
    collapsedPacks,
    setCollapsedPacks,
    grouped,
    viewMode
  );

  // Song operations
  const {
    updateAuthoringField,
    updateSongData,
    toggleOptional,
    createDeleteSongHandler,
  } = useWipSongOperations(
    songs,
    setSongs,
    authoringFields,
    setFireworksTrigger
  );

  const handleDeleteSong = createDeleteSongHandler(setAlertConfig);

  // Pack operations
  const {
    updatePackPriority,
    handleDeletePack,
    handleRenamePack,
    handleMovePackToFuturePlans,
  } = useWipPackOperations(
    songs,
    setSongs,
    updatePackPriorityLocal,
    setAlertConfig,
    refreshSongs
  );

  // Album series operations
  const {
    handleCreateAlbumSeries,
    handleShowAlbumSeriesModal,
    handleMakeDoubleAlbumSeries,
    executeDoubleAlbumSeries: executeDoubleAlbumSeriesBase,
    handleCreateAlbumSeriesFromPack,
  } = useWipAlbumSeriesOperations(
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
  );

  // Wrapper for executeDoubleAlbumSeries to pass doubleAlbumSeriesData
  const executeDoubleAlbumSeries = () => {
    executeDoubleAlbumSeriesBase(doubleAlbumSeriesData);
  };

  // Release handlers
  const { releasePack, releaseSong } = useWipReleaseHandlers(
    songs,
    setReleaseModalData,
    setShowReleaseModal
  );

  // Release operations
  const { handlePackReleaseComplete, handleSongReleaseComplete } =
    useWipReleaseOperations(
      songs,
      setSongs,
      setFireworksTrigger,
      releaseModalData
    );

  // Song add operation
  const { addSongToPack } = useWipSongAdd(
    setSongs,
    setShowAddForm,
    setNewSongData
  );

  // Collaboration saved handler
  const handleCollaborationSaved = async () => {
    try {
      await Promise.all([refreshCollaborations(), refreshSongs()]);
    } catch (error) {
      console.error("Failed to refresh after collaboration saved:", error);
    }
  };

  return (
    <WorkflowErrorBoundary>
      <div style={{ padding: "0.5rem 2rem" }}>
        <Fireworks trigger={fireworksTrigger} />

        <WipPageHeader
          grouped={grouped}
          collapsedPacks={collapsedPacks}
          onToggleAll={toggleAll}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          packSortBy={packSortBy}
          setPackSortBy={setPackSortBy}
        />

        {/* Loading Spinner */}
        {loading && (
          <WorkflowLoadingSpinner message="Loading WIP songs..." size="large" />
        )}

        {/* Empty State */}
        {!loading && songs.length === 0 && <WipEmptyState />}

        {/* Pack View */}
        {!loading && songs.length > 0 && viewMode === "pack" && (
          <WipPackView
            grouped={grouped}
            filteredGrouped={filteredGrouped}
            searchQuery={searchQuery}
            collapsedPacks={collapsedPacks}
            user={user}
            showAddForm={showAddForm}
            newSongData={newSongData}
            setNewSongData={setNewSongData}
            authoringFields={authoringFields}
            getPackCollaborators={getPackCollaborators}
            selectedSongs={selectedSongs}
            userCollaborations={userCollaborations}
            onTogglePack={togglePack}
            onSetShowAddForm={setShowAddForm}
            onAddSongToPack={addSongToPack}
            onSetShowCollaborationModal={setShowCollaborationModal}
            onSetSelectedItemForCollaboration={setSelectedItemForCollaboration}
            onSetCollaborationType={setCollaborationType}
            onUpdateAuthoringField={updateAuthoringField}
            onToggleOptional={toggleOptional}
            onDeleteSong={handleDeleteSong}
            onReleasePack={releasePack}
            onReleaseSong={releaseSong}
            onHandleCreateAlbumSeries={handleCreateAlbumSeries}
            onHandleMakeDoubleAlbumSeries={handleMakeDoubleAlbumSeries}
            onSetSelectedSongs={setSelectedSongs}
            onSongUpdate={updateSongData}
            onRenamePack={handleRenamePack}
            onMovePackToFuturePlans={handleMovePackToFuturePlans}
            onCreateAlbumSeries={handleCreateAlbumSeriesFromPack}
            onShowAlbumSeriesModal={handleShowAlbumSeriesModal}
            onDeletePack={handleDeletePack}
            onUpdatePackPriority={updatePackPriority}
          />
        )}

        {/* Completion View */}
        {!loading && songs.length > 0 && viewMode === "completion" && (
          <WipCompletionView
            completionGroups={completionGroups}
            collapsedPacks={collapsedPacks}
            user={user}
            authoringFields={authoringFields}
            selectedSongs={selectedSongs}
            onToggleCategory={toggleCategory}
            onUpdateAuthoringField={updateAuthoringField}
            onToggleOptional={toggleOptional}
            onDeleteSong={handleDeleteSong}
            onSongUpdate={updateSongData}
          />
        )}

        {/* Modals */}
        <WipModals
          showAlbumSeriesModal={showAlbumSeriesModal}
          setShowAlbumSeriesModal={setShowAlbumSeriesModal}
          albumSeriesForm={albumSeriesForm}
          setAlbumSeriesForm={setAlbumSeriesForm}
          handleCreateAlbumSeries={handleCreateAlbumSeries}
          selectedSongs={selectedSongs}
          songs={songs}
          showDoubleAlbumSeriesModal={showDoubleAlbumSeriesModal}
          setShowDoubleAlbumSeriesModal={setShowDoubleAlbumSeriesModal}
          doubleAlbumSeriesData={doubleAlbumSeriesData}
          setDoubleAlbumSeriesData={setDoubleAlbumSeriesData}
          executeDoubleAlbumSeries={executeDoubleAlbumSeries}
          isExecutingDoubleAlbumSeries={isExecutingDoubleAlbumSeries}
          editSeriesModal={editSeriesModal}
          setEditSeriesModal={setEditSeriesModal}
          refreshSongs={refreshSongs}
          showCollaborationModal={showCollaborationModal}
          setShowCollaborationModal={setShowCollaborationModal}
          selectedItemForCollaboration={selectedItemForCollaboration}
          setSelectedItemForCollaboration={setSelectedItemForCollaboration}
          collaborationType={collaborationType}
          user={user}
          handleCollaborationSaved={handleCollaborationSaved}
          showReleaseModal={showReleaseModal}
          setShowReleaseModal={setShowReleaseModal}
          releaseModalData={releaseModalData}
          setReleaseModalData={setReleaseModalData}
          handlePackReleaseComplete={handlePackReleaseComplete}
          handleSongReleaseComplete={handleSongReleaseComplete}
          alertConfig={alertConfig}
          setAlertConfig={setAlertConfig}
        />
      </div>
    </WorkflowErrorBoundary>
  );
}

export default WipPage;
