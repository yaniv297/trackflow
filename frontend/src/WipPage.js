import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useWipData } from "./hooks/wip/useWipData";
import { useWorkflowData } from "./hooks/workflows/useWorkflowData";
import { useWipPageUI } from "./hooks/wip/useWipPageUI";
import { useWipPageModals } from "./hooks/wip/useWipPageModals";
import { useWipSongOperations } from "./hooks/wip/useWipSongOperations";
import { useWipPackOperations } from "./hooks/wip/useWipPackOperations";
import { useWipAlbumSeriesOperations } from "./hooks/wip/useWipAlbumSeriesOperations";
import { useWipReleaseOperations } from "./hooks/wip/useWipReleaseOperations";
import { useWipReleaseHandlers } from "./hooks/wip/useWipReleaseHandlers";
import { useWipCompletionGroups } from "./hooks/wip/useWipCompletionGroups";
import { useWipWelcomeNotification } from "./hooks/wip/useWipWelcomeNotification";
import { useWipPackToggle } from "./hooks/wip/useWipPackToggle";
import { useWipFilteredGrouped } from "./hooks/wip/useWipFilteredGrouped";
import { useWipSongAdd } from "./hooks/wip/useWipSongAdd";
import WipPageHeader from "./components/navigation/WipPageHeader";
import WipPackCard from "./components/pages/WipPackCard";
import CompletionGroupCard from "./components/pages/CompletionGroupCard";
import Fireworks from "./components/ui/Fireworks";
import CustomAlert from "./components/ui/CustomAlert";
import UnifiedCollaborationModal from "./components/modals/UnifiedCollaborationModal";
import WorkflowErrorBoundary from "./components/features/workflows/WorkflowErrorBoundary";
import WorkflowLoadingSpinner from "./components/features/workflows/WorkflowLoadingSpinner";
import AlbumSeriesModal from "./components/modals/AlbumSeriesModal";
import AlbumSeriesEditModal from "./components/modals/AlbumSeriesEditModal";
import DoubleAlbumSeriesModal from "./components/modals/DoubleAlbumSeriesModal";
import ReleaseModal from "./components/modals/ReleaseModal";

// Utility function to capitalize artist and album names (keeping for compatibility)
// eslint-disable-next-line no-unused-vars
const capitalizeName = (name) => {
  if (!name) return name;
  const words = name.split(" ");

  return words
    .map((word, index) => {
      // Handle special cases like "the", "of", "and", etc.
      const lowerWords = [
        "the",
        "of",
        "and",
        "in",
        "on",
        "at",
        "to",
        "for",
        "with",
        "by",
        "from",
        "up",
        "about",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "between",
        "among",
        "within",
        "without",
        "against",
        "toward",
        "towards",
        "upon",
        "across",
        "behind",
        "beneath",
        "beside",
        "beyond",
        "inside",
        "outside",
        "over",
        "under",
        "around",
        "near",
        "off",
        "out",
        "away",
        "down",
        "since",
        "until",
        "while",
        "although",
        "though",
        "if",
        "unless",
        "because",
        "as",
        "like",
        "than",
        "except",
        "but",
        "or",
        "nor",
        "so",
        "yet",
        "neither",
        "either",
        "both",
        "not",
        "no",
        "any",
        "some",
        "all",
        "each",
        "every",
        "most",
        "few",
        "many",
        "much",
        "more",
        "less",
        "little",
        "big",
        "small",
        "large",
        "great",
        "good",
        "bad",
        "new",
        "old",
        "young",
        "long",
        "short",
        "high",
        "low",
        "wide",
        "narrow",
      ];

      // Only lowercase these words if they're NOT the first word
      if (index > 0 && lowerWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

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
        {!loading && songs.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              color: "#666",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
                opacity: 0.5,
              }}
            >
              🎬
            </div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                color: "#333",
              }}
            >
              No songs in progress yet
            </h2>
            <p
              style={{
                fontSize: "1rem",
                marginBottom: "2rem",
                color: "#666",
              }}
            >
              Start working on a song to see it here!
            </p>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/new"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.5rem",
                  background: "#007bff",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: 500,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#0056b3")}
                onMouseLeave={(e) => (e.target.style.background = "#007bff")}
              >
                ➕ Add Song
              </Link>
              <Link
                to="/pack"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.5rem",
                  background: "#28a745",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: 500,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#218838")}
                onMouseLeave={(e) => (e.target.style.background = "#28a745")}
              >
                📦 Create Pack
              </Link>
              <Link
                to="/import-spotify"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 1.5rem",
                  background: "#6f42c1",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontWeight: 500,
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#5a32a3")}
                onMouseLeave={(e) => (e.target.style.background = "#6f42c1")}
              >
                🎧 Import from Spotify
              </Link>
            </div>
          </div>
        )}

        {/* Pack View */}
        {!loading &&
          songs.length > 0 &&
          viewMode === "pack" &&
          (searchQuery ? filteredGrouped : grouped).map((packData) => (
            <WipPackCard
              key={packData.pack}
              packName={packData.pack}
              percent={packData.percent}
              priority={packData.priority}
              coreSongs={packData.coreSongs}
              allSongs={packData.allSongs}
              completedSongs={packData.completedSongs}
              inProgressSongs={packData.inProgressSongs}
              optionalSongs={packData.optionalSongs}
              collaboratorSongs={packData.collaboratorSongs}
              collaboratorOptionalSongs={packData.collaboratorOptionalSongs}
              collapsedPacks={collapsedPacks}
              user={user}
              grouped={grouped}
              showAddForm={showAddForm}
              newSongData={newSongData}
              setNewSongData={setNewSongData}
              authoringFields={authoringFields}
              getPackCollaborators={getPackCollaborators}
              selectedSongs={selectedSongs}
              // Action handlers
              onTogglePack={togglePack}
              onSetShowAddForm={setShowAddForm}
              onAddSongToPack={addSongToPack}
              onSetShowCollaborationModal={setShowCollaborationModal}
              onSetSelectedItemForCollaboration={
                setSelectedItemForCollaboration
              }
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
              // Pack settings handlers
              onRenamePack={handleRenamePack}
              onMovePackToFuturePlans={handleMovePackToFuturePlans}
              onCreateAlbumSeries={handleCreateAlbumSeriesFromPack}
              onShowAlbumSeriesModal={handleShowAlbumSeriesModal}
              onDeletePack={handleDeletePack}
              onUpdatePackPriority={updatePackPriority}
              userCollaborations={userCollaborations}
            />
          ))}

        {/* Completion View */}
        {!loading && songs.length > 0 && viewMode === "completion" && (
          <>
            <CompletionGroupCard
              categoryName="Completed Songs"
              categoryIcon="✅"
              songs={completionGroups.completed}
              isCollapsed={collapsedPacks.completed !== false}
              onToggle={() => toggleCategory("completed")}
              user={user}
              authoringFields={authoringFields}
              selectedSongs={selectedSongs}
              onUpdateAuthoringField={updateAuthoringField}
              onToggleOptional={toggleOptional}
              onDeleteSong={handleDeleteSong}
              onSongUpdate={updateSongData}
            />

            <CompletionGroupCard
              categoryName="In Progress"
              categoryIcon="🚧"
              songs={completionGroups.inProgress}
              isCollapsed={collapsedPacks.inProgress !== false}
              onToggle={() => toggleCategory("inProgress")}
              user={user}
              authoringFields={authoringFields}
              selectedSongs={selectedSongs}
              onUpdateAuthoringField={updateAuthoringField}
              onToggleOptional={toggleOptional}
              onDeleteSong={handleDeleteSong}
              onSongUpdate={updateSongData}
            />

            <CompletionGroupCard
              categoryName="Optional Songs"
              categoryIcon="⭐"
              songs={completionGroups.optional}
              isCollapsed={collapsedPacks.optional !== false}
              onToggle={() => toggleCategory("optional")}
              user={user}
              authoringFields={authoringFields}
              selectedSongs={selectedSongs}
              onUpdateAuthoringField={updateAuthoringField}
              onToggleOptional={toggleOptional}
              onDeleteSong={handleDeleteSong}
              onSongUpdate={updateSongData}
            />

            <CompletionGroupCard
              categoryName="Songs by Collaborators"
              categoryIcon="👥"
              songs={completionGroups.collaboratorSongs}
              isCollapsed={collapsedPacks.collaboratorSongs !== false}
              onToggle={() => toggleCategory("collaboratorSongs")}
              user={user}
              authoringFields={authoringFields}
              selectedSongs={selectedSongs}
              onUpdateAuthoringField={updateAuthoringField}
              onToggleOptional={toggleOptional}
              onDeleteSong={handleDeleteSong}
              onSongUpdate={updateSongData}
            />

            <CompletionGroupCard
              categoryName="Optional Songs by Collaborators"
              categoryIcon="⭐👥"
              songs={completionGroups.optionalCollaboratorSongs}
              isCollapsed={collapsedPacks.optionalCollaboratorSongs !== false}
              onToggle={() => toggleCategory("optionalCollaboratorSongs")}
              user={user}
              authoringFields={authoringFields}
              selectedSongs={selectedSongs}
              onUpdateAuthoringField={updateAuthoringField}
              onToggleOptional={toggleOptional}
              onDeleteSong={handleDeleteSong}
              onSongUpdate={updateSongData}
            />
          </>
        )}

        {/* Album Series Modal */}
        {showAlbumSeriesModal && (
          <AlbumSeriesModal
            showModal={showAlbumSeriesModal}
            onClose={() => setShowAlbumSeriesModal(false)}
            formData={albumSeriesForm}
            setFormData={setAlbumSeriesForm}
            onSubmit={handleCreateAlbumSeries}
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
              createMode: false,
              createData: null,
            })
          }
          packId={editSeriesModal.packId}
          seriesList={editSeriesModal.series}
          defaultSeriesId={editSeriesModal.defaultSeriesId}
          createMode={editSeriesModal.createMode || false}
          createData={editSeriesModal.createData || null}
          onChanged={() => {
            // Invalidate and refresh WIP data
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("songs-invalidate-cache"));
            }
            // Re-fetch page data
            refreshSongs();
          }}
        />

        {/* Unified Collaboration Modal */}
        <UnifiedCollaborationModal
          packId={
            collaborationType === "pack" || collaborationType === "pack_share"
              ? selectedItemForCollaboration?.id
              : null
          }
          packName={
            collaborationType === "pack" || collaborationType === "pack_share"
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
          collaborationType={collaborationType}
          isOpen={showCollaborationModal}
          onClose={() => {
            setShowCollaborationModal(false);
            setSelectedItemForCollaboration(null);
          }}
          currentUser={user}
          onCollaborationSaved={handleCollaborationSaved}
        />

        {/* Release Modal */}
        {releaseModalData && (
          <ReleaseModal
            isOpen={showReleaseModal}
            onClose={() => {
              setShowReleaseModal(false);
              setReleaseModalData(null);
            }}
            title={releaseModalData.title}
            type={releaseModalData.type}
            itemId={releaseModalData.itemId}
            itemName={releaseModalData.itemName}
            onReleaseComplete={
              releaseModalData.type === "song"
                ? handleSongReleaseComplete
                : handlePackReleaseComplete
            }
            packSongs={releaseModalData.packSongs}
          />
        )}

        {/* Custom Alert */}
        <CustomAlert
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={alertConfig.onConfirm}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
        />
      </div>
    </WorkflowErrorBoundary>
  );
}

export default WipPage;
