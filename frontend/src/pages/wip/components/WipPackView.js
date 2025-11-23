import React from "react";
import WipPackCard from "../../../components/pages/WipPackCard";

/**
 * Component for rendering the pack view of WIP page
 */
const WipPackView = ({
  grouped,
  filteredGrouped,
  searchQuery,
  collapsedPacks,
  user,
  showAddForm,
  newSongData,
  setNewSongData,
  authoringFields,
  getPackCollaborators,
  selectedSongs,
  userCollaborations,
  // Action handlers
  onTogglePack,
  onSetShowAddForm,
  onAddSongToPack,
  onSetShowCollaborationModal,
  onSetSelectedItemForCollaboration,
  onSetCollaborationType,
  onUpdateAuthoringField,
  onToggleOptional,
  onDeleteSong,
  onReleasePack,
  onReleaseSong,
  onHandleCreateAlbumSeries,
  onHandleMakeDoubleAlbumSeries,
  onSetSelectedSongs,
  onSongUpdate,
  // Pack settings handlers
  onRenamePack,
  onMovePackToFuturePlans,
  onCreateAlbumSeries,
  onShowAlbumSeriesModal,
  onDeletePack,
  onUpdatePackPriority,
}) => {
  const packsToRender = searchQuery ? filteredGrouped : grouped;

  return packsToRender.map((packData) => (
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
      onTogglePack={onTogglePack}
      onSetShowAddForm={onSetShowAddForm}
      onAddSongToPack={onAddSongToPack}
      onSetShowCollaborationModal={onSetShowCollaborationModal}
      onSetSelectedItemForCollaboration={onSetSelectedItemForCollaboration}
      onSetCollaborationType={onSetCollaborationType}
      onUpdateAuthoringField={onUpdateAuthoringField}
      onToggleOptional={onToggleOptional}
      onDeleteSong={onDeleteSong}
      onReleasePack={onReleasePack}
      onReleaseSong={onReleaseSong}
      onHandleCreateAlbumSeries={onHandleCreateAlbumSeries}
      onHandleMakeDoubleAlbumSeries={onHandleMakeDoubleAlbumSeries}
      onSetSelectedSongs={onSetSelectedSongs}
      onSongUpdate={onSongUpdate}
      // Pack settings handlers
      onRenamePack={onRenamePack}
      onMovePackToFuturePlans={onMovePackToFuturePlans}
      onCreateAlbumSeries={onCreateAlbumSeries}
      onShowAlbumSeriesModal={onShowAlbumSeriesModal}
      onDeletePack={onDeletePack}
      onUpdatePackPriority={onUpdatePackPriority}
      userCollaborations={userCollaborations}
    />
  ));
};

export default WipPackView;
