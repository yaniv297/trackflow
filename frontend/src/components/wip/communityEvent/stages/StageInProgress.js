import React from "react";
import WipSongCard from "../../../pages/WipSongCard";

const StageInProgress = ({ 
  song, 
  onSwapSong, 
  onRemoveSong,
  onSongUpdate,
  onAuthoringUpdate,
  authoringFields,
}) => {
  if (!song) return null;

  return (
    <div className="stage-in-progress">
      {/* Embed the actual WIP song card with all workflow functionality */}
      <div className="event-song-card-wrapper">
        <WipSongCard
          song={song}
          onAuthoringUpdate={onAuthoringUpdate}
          onSongUpdate={onSongUpdate}
          defaultExpanded={true}
          authoringFields={authoringFields}
        />
      </div>
      
      <div className="stage-actions">
        <button className="action-button" onClick={onSwapSong}>
          🔄 Swap Song
        </button>
        <button className="action-button danger" onClick={onRemoveSong}>
          🗑️ Remove from Event
        </button>
      </div>
    </div>
  );
};

export default StageInProgress;
