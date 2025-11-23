import React from "react";
import AlbumSeriesModal from "../../../components/modals/AlbumSeriesModal";
import AlbumSeriesEditModal from "../../../components/modals/AlbumSeriesEditModal";
import DoubleAlbumSeriesModal from "../../../components/modals/DoubleAlbumSeriesModal";
import UnifiedCollaborationModal from "../../../components/modals/UnifiedCollaborationModal";
import ReleaseModal from "../../../components/modals/ReleaseModal";
import CustomAlert from "../../../components/ui/CustomAlert";

/**
 * Component for rendering all modals used in WIP page
 */
const WipModals = ({
  // Album Series Modal
  showAlbumSeriesModal,
  setShowAlbumSeriesModal,
  albumSeriesForm,
  setAlbumSeriesForm,
  handleCreateAlbumSeries,
  selectedSongs,
  songs,
  // Double Album Series Modal
  showDoubleAlbumSeriesModal,
  setShowDoubleAlbumSeriesModal,
  doubleAlbumSeriesData,
  setDoubleAlbumSeriesData,
  executeDoubleAlbumSeries,
  isExecutingDoubleAlbumSeries,
  // Edit Album Series Modal
  editSeriesModal,
  setEditSeriesModal,
  refreshSongs,
  // Collaboration Modal
  showCollaborationModal,
  setShowCollaborationModal,
  selectedItemForCollaboration,
  setSelectedItemForCollaboration,
  collaborationType,
  user,
  handleCollaborationSaved,
  // Release Modal
  showReleaseModal,
  setShowReleaseModal,
  releaseModalData,
  setReleaseModalData,
  handlePackReleaseComplete,
  handleSongReleaseComplete,
  // Alert
  alertConfig,
  setAlertConfig,
}) => {
  return (
    <>
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
          collaborationType === "song" ? selectedItemForCollaboration?.id : null
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
    </>
  );
};

export default WipModals;
