import React from "react";
import CompletionGroupCard from "../../../components/pages/CompletionGroupCard";

/**
 * Component for rendering the completion view of WIP page
 */
const WipCompletionView = ({
  completionGroups,
  collapsedPacks,
  user,
  authoringFields,
  selectedSongs,
  onToggleCategory,
  onUpdateAuthoringField,
  onToggleOptional,
  onDeleteSong,
  onSongUpdate,
}) => {
  return (
    <>
      <CompletionGroupCard
        categoryName="Completed Songs"
        categoryIcon="✅"
        songs={completionGroups.completed}
        isCollapsed={collapsedPacks.completed !== false}
        onToggle={() => onToggleCategory("completed")}
        user={user}
        authoringFields={authoringFields}
        selectedSongs={selectedSongs}
        onUpdateAuthoringField={onUpdateAuthoringField}
        onToggleOptional={onToggleOptional}
        onDeleteSong={onDeleteSong}
        onSongUpdate={onSongUpdate}
      />

      <CompletionGroupCard
        categoryName="In Progress"
        categoryIcon="🚧"
        songs={completionGroups.inProgress}
        isCollapsed={collapsedPacks.inProgress !== false}
        onToggle={() => onToggleCategory("inProgress")}
        user={user}
        authoringFields={authoringFields}
        selectedSongs={selectedSongs}
        onUpdateAuthoringField={onUpdateAuthoringField}
        onToggleOptional={onToggleOptional}
        onDeleteSong={onDeleteSong}
        onSongUpdate={onSongUpdate}
      />

      <CompletionGroupCard
        categoryName="Optional Songs"
        categoryIcon="⭐"
        songs={completionGroups.optional}
        isCollapsed={collapsedPacks.optional !== false}
        onToggle={() => onToggleCategory("optional")}
        user={user}
        authoringFields={authoringFields}
        selectedSongs={selectedSongs}
        onUpdateAuthoringField={onUpdateAuthoringField}
        onToggleOptional={onToggleOptional}
        onDeleteSong={onDeleteSong}
        onSongUpdate={onSongUpdate}
      />

      <CompletionGroupCard
        categoryName="Songs by Collaborators"
        categoryIcon="👥"
        songs={completionGroups.collaboratorSongs}
        isCollapsed={collapsedPacks.collaboratorSongs !== false}
        onToggle={() => onToggleCategory("collaboratorSongs")}
        user={user}
        authoringFields={authoringFields}
        selectedSongs={selectedSongs}
        onUpdateAuthoringField={onUpdateAuthoringField}
        onToggleOptional={onToggleOptional}
        onDeleteSong={onDeleteSong}
        onSongUpdate={onSongUpdate}
      />

      <CompletionGroupCard
        categoryName="Optional Songs by Collaborators"
        categoryIcon="⭐👥"
        songs={completionGroups.optionalCollaboratorSongs}
        isCollapsed={collapsedPacks.optionalCollaboratorSongs !== false}
        onToggle={() => onToggleCategory("optionalCollaboratorSongs")}
        user={user}
        authoringFields={authoringFields}
        selectedSongs={selectedSongs}
        onUpdateAuthoringField={onUpdateAuthoringField}
        onToggleOptional={onToggleOptional}
        onDeleteSong={onDeleteSong}
        onSongUpdate={onSongUpdate}
      />
    </>
  );
};

export default WipCompletionView;

