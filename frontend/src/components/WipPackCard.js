import React, { useState } from "react";
import SmartDropdown from "./SmartDropdown";
import WipSongCard from "./WipSongCard";
import DLCWarning from "./DLCWarning";

const WipPackCard = ({
  packName,
  percent,
  coreSongs,
  allSongs,
  completedSongs,
  inProgressSongs,
  optionalSongs,
  collapsedPacks,
  user,
  grouped,
  showAddForm,
  newSongData,
  setNewSongData,
  authoringFields,
  getPackCollaborators,
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
  onHandleCreateAlbumSeries,
  onHandleMakeDoubleAlbumSeries,
  onSetSelectedSongs,
  selectedSongs,
  onSongUpdate,
  // Pack settings handlers
  onRenamePack,
  onMovePackToFuturePlans,
  onCreateAlbumSeries,
  onShowAlbumSeriesModal,
  onDeletePack,
  // Collaboration data
  userCollaborations,
}) => {
  // Separate songs by ownership and collaboration status
  const userOwnedSongs = allSongs.filter((song) => song.user_id === user?.id);

  // Songs owned by others that the current user is a collaborator on
  const collaborationSongs = allSongs.filter(
    (song) =>
      song.user_id !== user?.id &&
      song.collaborations &&
      song.collaborations.some(
        (collab) =>
          collab.username === user?.username &&
          collab.collaboration_type === "song_edit"
      )
  );

  // Songs owned by others that the current user has NO collaboration on (read-only)
  const collaboratorOwnedSongs = allSongs.filter(
    (song) =>
      song.user_id !== user?.id &&
      (!song.collaborations ||
        !song.collaborations.some(
          (collab) =>
            collab.username === user?.username &&
            collab.collaboration_type === "song_edit"
        ))
  );

  // Further separate user's songs into core and optional
  const userCoreSongs = userOwnedSongs.filter((song) => !song.optional);
  const userOptionalSongs = userOwnedSongs.filter((song) => song.optional);

  // Separate collaborator songs into core and optional
  const collaboratorCoreSongs = collaboratorOwnedSongs.filter(
    (song) => !song.optional
  );
  const collaboratorOptionalSongs = collaboratorOwnedSongs.filter(
    (song) => song.optional
  );

  // State for collapsing sections
  const [optionalCollapsed, setOptionalCollapsed] = React.useState(true);
  const [collaborationSongsCollapsed, setCollaborationSongsCollapsed] =
    React.useState(false); // Expanded by default for collaboration songs
  const [collaboratorSongsCollapsed, setCollaboratorSongsCollapsed] =
    React.useState(true);
  const [collaboratorOptionalCollapsed, setCollaboratorOptionalCollapsed] =
    React.useState(true);
  const [completedSongsCollapsed, setCompletedSongsCollapsed] =
    React.useState(true); // Collapsed by default
  const [activeSongsCollapsed, setActiveSongsCollapsed] = React.useState(false); // Expanded by default for active songs

  // State for pack settings modal
  const [showPackSettings, setShowPackSettings] = React.useState(false);
  const [packSettingsMode, setPackSettingsMode] = React.useState(null); // 'rename', 'status'
  const [newPackName, setNewPackName] = React.useState(packName);

  // State for pack dropdown
  const [showPackDropdown, setShowPackDropdown] = React.useState(false);

  // Sort songs by completion (filledCount) descending
  const sortedUserCoreSongs = userCoreSongs
    .slice()
    .sort((a, b) => b.filledCount - a.filledCount);
  const sortedUserOptionalSongs = userOptionalSongs
    .slice()
    .sort((a, b) => b.filledCount - a.filledCount);
  const sortedCollaborationSongs = collaborationSongs
    .slice()
    .sort((a, b) => b.filledCount - a.filledCount);
  const sortedCollaboratorCoreSongs = collaboratorCoreSongs
    .slice()
    .sort((a, b) => b.filledCount - a.filledCount);
  const sortedCollaboratorOptionalSongs = collaboratorOptionalSongs
    .slice()
    .sort((a, b) => b.filledCount - a.filledCount);

  // Count ALL non-optional songs in the pack (by any author) for header
  const allNonOptionalSongs = allSongs.filter((song) => !song.optional);
  const totalSongs = allNonOptionalSongs.length;

  // Before rendering the pack header, find the most common artist and their image URL
  const artistCounts = {};
  allSongs.forEach((song) => {
    if (!song.artist) return;
    artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
  });
  const mostCommonArtist = Object.entries(artistCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];
  const artistImageUrl = allSongs.find(
    (s) => s.artist === mostCommonArtist
  )?.artist_image_url;

  const uniqueSeries = Array.from(
    new Set(allSongs.map((s) => s.album_series_id).filter(Boolean))
  );

  // Filter series to only include those with at least 4 songs
  const seriesWithThreshold = uniqueSeries.filter((seriesId) => {
    const songsInThisSeries = allSongs.filter(
      (song) => song.album_series_id === seriesId
    );
    return songsInThisSeries.length >= 4;
  });

  // Check for double album series opportunity
  const albumCounts = {};
  allSongs.forEach((song) => {
    if (song.album && !song.optional) {
      albumCounts[song.album] = (albumCounts[song.album] || 0) + 1;
    }
  });

  // Find albums with 4+ songs (for creation actions)
  const albumsWithEnoughSongs = Object.entries(albumCounts)
    .filter(([album, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1]);

  // Pack-level album series detection for styling/badges
  const packSeriesId =
    allSongs.find((s) => s.album_series_id)?.album_series_id || null;
  const seriesInfo = packSeriesId
    ? (() => {
        const s = allSongs.find(
          (song) => song.album_series_id === packSeriesId
        );
        return s
          ? [
              {
                id: packSeriesId,
                number: s.album_series_number,
                name: s.album_series_name,
              },
            ]
          : [];
      })()
    : [];
  const hasExistingSeries = seriesInfo.length > 0;
  const hasSecondAlbum = albumsWithEnoughSongs.length >= 2;
  const canMakeDoubleAlbumSeries = hasExistingSeries && hasSecondAlbum;

  // Get pack collaboration info
  let packId = grouped.find((p) => p.pack === packName)?.allSongs[0]?.pack_id;

  if (
    grouped.find((p) => p.pack === packName)?.allSongs[0]?.album_series_id &&
    !packId
  ) {
    // If we have an album series but no pack_id, try to get it from the series song
    const albumSeriesSong = grouped
      .find((p) => p.pack === packName)
      ?.allSongs.find((s) => s.album_series_id);
    if (albumSeriesSong) {
      packId = albumSeriesSong.pack_id;
    }
  }

  // Handle pack deletion
  const handleDeletePack = () => {
    onDeletePack(packName, packId);
  };

  const validSongsInPack =
    grouped.find((p) => p.pack === packName)?.allSongs || [];
  const collaborators = getPackCollaborators(packId, validSongsInPack);

  return (
    <div
      key={packName}
      style={{
        marginBottom: "2rem",
        borderBottom: "1px solid #ccc",
        paddingBottom: "1rem",
      }}
    >
      <h3
        style={{
          marginBottom: "0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {artistImageUrl && (
          <img
            src={artistImageUrl}
            alt={mostCommonArtist}
            style={{
              width: 54,
              height: 54,
              objectFit: "cover",
              borderRadius: "50%",
              marginRight: 16,
              boxShadow: "0 1px 6px rgba(0,0,0,0.13)",
            }}
          />
        )}
        <button
          onClick={() => onTogglePack(packName)}
          style={{
            background: "none",
            border: "none",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: "pointer",
            padding: 0,
            marginRight: "0.5rem",
          }}
        >
          {collapsedPacks[packName] ? "▶" : "▼"}
        </button>

        {/* Album Series Display */}
        {seriesWithThreshold.length === 1 ? (
          <a
            href={`/album-series/${seriesInfo[0].id}`}
            style={{
              textDecoration: "none",
              color: "#1a237e",
              display: "inline-flex",
              alignItems: "center",
              background: "#e3eaff",
              borderRadius: "12px",
              padding: "0.15rem 0.7rem 0.15rem 0.5rem",
              fontWeight: 600,
              fontSize: "1.08em",
              boxShadow: "0 1px 4px rgba(26,35,126,0.07)",
              transition: "background 0.2s",
              marginRight: 8,
            }}
            title={`Album Series #${seriesInfo[0].number}: ${seriesInfo[0].name}`}
          >
            <span style={{ fontSize: "1.1em", marginRight: 4 }}>📀</span>
            Album Series #{seriesInfo[0].number}: {seriesInfo[0].name}
          </a>
        ) : seriesWithThreshold.length === 2 ? (
          <>
            {seriesInfo.map((info, idx) => (
              <a
                key={info.id}
                href={`/album-series/${info.id}`}
                style={{
                  textDecoration: "none",
                  color: "#1a237e",
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#e3eaff",
                  borderRadius: "12px",
                  padding: "0.15rem 0.7rem 0.15rem 0.5rem",
                  fontWeight: 600,
                  fontSize: "1.08em",
                  boxShadow: "0 1px 4px rgba(26,35,126,0.07)",
                  transition: "background 0.2s",
                  marginRight: idx === 0 ? 8 : 0,
                }}
                title={`Album Series #${info.number}: ${info.name}`}
              >
                <span style={{ fontSize: "1.1em", marginRight: 4 }}>📀</span>
                Album Series #{info.number}: {info.name}
              </a>
            ))}
          </>
        ) : (
          <div>
            <span>
              {`${packName} (${totalSongs} song${totalSongs !== 1 ? "s" : ""})`}
            </span>
            {collaborators && collaborators.length > 0 && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#666",
                  fontStyle: "italic",
                  marginTop: "0.15rem",
                }}
              >
                Collaboration with: {collaborators.join(", ")}
              </div>
            )}
          </div>
        )}

        {/* Progress bar and percent */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            minWidth: 120,
          }}
        >
          <div
            style={{
              background: "#ddd",
              height: 10,
              borderRadius: 5,
              overflow: "hidden",
              width: 80,
            }}
          >
            <div
              style={{
                background: percent === 100 ? "#4caf50" : "#3498db",
                width: `${percent}%`,
                height: "100%",
                transition: "width 0.3s",
              }}
            />
          </div>
          <span
            style={{
              fontSize: "0.95em",
              color: percent === 100 ? "#4caf50" : "#3498db",
              fontWeight: 600,
            }}
          >
            {percent}%
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
          {/* Share Pack Button */}
          <button
            onClick={() => {
              // Get pack_id from the first song in the pack
              let packId = grouped.find((p) => p.pack === packName)?.allSongs[0]
                ?.pack_id;

              if (packId) {
                onSetSelectedItemForCollaboration({
                  id: packId,
                  name: packName,
                });
                onSetCollaborationType("pack_share");
                onSetShowCollaborationModal(true);
              }
            }}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Make Pack a Collaboration"
          >
            📤
          </button>

          {/* Add Song Button */}
          <button
            onClick={() =>
              onSetShowAddForm(showAddForm === packName ? null : packName)
            }
            style={{
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "24px",
              height: "24px",
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Add song to this pack"
          >
            +
          </button>

          {/* Pack Settings Button - Only show for pack owners or PACK_EDIT collaborators */}
          {(() => {
            // Get pack_id from the first song in the pack
            const packId = allSongs[0]?.pack_id;
            if (!packId) return false;

            // Check if user is the pack owner (pack_owner_id should be in song data)
            const isPackOwner = allSongs.some(
              (song) => song.pack_owner_id === user?.id
            );

            // Check if user has PACK_EDIT permissions on this pack
            const hasPackEditPermission = userCollaborations?.some(
              (collab) =>
                collab.pack_id === packId &&
                collab.collaboration_type === "pack_edit"
            );

            return isPackOwner || hasPackEditPermission;
          })() && (
            <div style={{ position: "relative" }} data-pack-dropdown>
              <button
                onClick={() => setShowPackDropdown(!showPackDropdown)}
                style={{
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#0056b3";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#007bff";
                }}
                title="Pack settings"
              >
                ⚙️
              </button>

              {showPackDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    minWidth: "200px",
                    padding: "0.5rem 0",
                  }}
                >
                  <button
                    onClick={() => {
                      setPackSettingsMode("rename");
                      setShowPackSettings(true);
                      setShowPackDropdown(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: "#5a8fcf",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    ✏️ Change Pack Name
                  </button>

                  <button
                    onClick={() => {
                      onMovePackToFuturePlans(packName);
                      setShowPackDropdown(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: "#5a8fcf",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    📋 Move back to Future Plans
                  </button>

                  {/* Only show Make Album Series if this pack has >=4 songs from the same album and pack is not already an album series */}
                  {albumsWithEnoughSongs.length >= 1 &&
                    seriesWithThreshold.length === 0 && (
                      <button
                        onClick={() => {
                          onShowAlbumSeriesModal &&
                            onShowAlbumSeriesModal(
                              packName,
                              albumsWithEnoughSongs
                            );
                          setShowPackDropdown(false);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "block",
                          width: "100%",
                          padding: "0.5rem 1rem",
                          textAlign: "left",
                          color: "#5a8fcf",
                          fontSize: "0.9rem",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#f8f9fa";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "transparent";
                        }}
                      >
                        🎵 Make Album Series
                      </button>
                    )}

                  {/* Make Double Album Series if conditions are met */}
                  {canMakeDoubleAlbumSeries && (
                    <button
                      onClick={() => {
                        onHandleMakeDoubleAlbumSeries &&
                          onHandleMakeDoubleAlbumSeries(
                            packName,
                            albumsWithEnoughSongs
                          );
                        setShowPackDropdown(false);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                        width: "100%",
                        padding: "0.5rem 1rem",
                        textAlign: "left",
                        color: "#5a8fcf",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      🎵🎵 Make Double Album Series
                    </button>
                  )}

                  {/* Edit Album Series if any exists */}
                  {seriesInfo && seriesInfo.length > 0 && packId && (
                    <button
                      onClick={() => {
                        const event = new CustomEvent(
                          "open-edit-album-series",
                          {
                            detail: {
                              packName,
                              packId,
                              series: seriesInfo,
                            },
                          }
                        );
                        window.dispatchEvent(event);
                        setShowPackDropdown(false);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "block",
                        width: "100%",
                        padding: "0.5rem 1rem",
                        textAlign: "left",
                        color: "#5a8fcf",
                        fontSize: "0.9rem",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = "transparent";
                      }}
                    >
                      ✏️ Edit Album Series
                    </button>
                  )}

                  {/* Delete Pack option */}
                  <div
                    style={{ borderTop: "1px solid #eee", margin: "0.5rem 0" }}
                  ></div>
                  <button
                    onClick={() => {
                      const confirmDelete = window.confirm(
                        `Are you sure you want to delete the pack "${packName}"?\n\nThis will:\n• Delete all ${allSongs.length} songs in the pack\n• Delete the pack itself\n• Delete any associated album series\n\nThis action cannot be undone.`
                      );
                      if (confirmDelete) {
                        handleDeletePack();
                      }
                      setShowPackDropdown(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "block",
                      width: "100%",
                      padding: "0.5rem 1rem",
                      textAlign: "left",
                      color: "#dc3545",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#fff5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    🗑️ Delete Pack
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </h3>

      {/* Add Song Form */}
      {showAddForm === packName && (
        <div
          style={{
            background: "#f8f9fa",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            border: "1px solid #dee2e6",
          }}
        >
          <h4 style={{ marginBottom: "0.75rem", color: "#495057" }}>
            Add New Song to {packName}
          </h4>
          <div
            style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}
          >
            <input
              type="text"
              placeholder="Song title"
              value={newSongData.title || ""}
              onChange={(e) =>
                setNewSongData((prev) => ({ ...prev, title: e.target.value }))
              }
              style={{
                padding: "0.5rem",
                border: "1px solid #ced4da",
                borderRadius: "4px",
                fontSize: "0.9rem",
                flex: 1,
              }}
            />
            <SmartDropdown
              type="artist"
              value={newSongData.artist || ""}
              onChange={(value) =>
                setNewSongData((prev) => ({ ...prev, artist: value }))
              }
              placeholder="Artist"
              style={{
                flex: 1,
              }}
              inputStyle={{
                padding: "0.5rem",
                border: "1px solid #ced4da",
                borderRadius: "4px",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {/* DLC Warning */}
          <DLCWarning
            title={newSongData.title || ""}
            artist={newSongData.artist || ""}
          />

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => onAddSongToPack(packId, newSongData)}
              disabled={!newSongData.title || !newSongData.artist}
              style={{
                background:
                  newSongData.title && newSongData.artist
                    ? "#007bff"
                    : "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                cursor:
                  newSongData.title && newSongData.artist
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Add Song
            </button>
            <button
              onClick={() => onSetShowAddForm(null)}
              style={{
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Songs List */}
      {!collapsedPacks[packName] && (
        <div>
          {/* Action buttons when pack is expanded */}
          <div
            style={{
              marginBottom: "1rem",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            {percent === 100 && (
              <button
                onClick={() => onReleasePack(packName)}
                style={{
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                🚀 Release Pack
              </button>
            )}
          </div>

          {/* Core Songs - Active (In Progress) */}
          {(() => {
            // Separate core songs into active and completed
            // Use inProgressSongs from pack data instead of calculating
            const activeCoreSongs = inProgressSongs || [];

            // Use completedSongs from pack data instead of calculating
            const completedCoreSongs = completedSongs || [];

            return (
              <>
                {/* Completed Core Songs - AT THE TOP */}
                {completedCoreSongs.length > 0 && (
                  <>
                    <h4
                      style={{
                        marginTop: "0",
                        marginBottom: "1rem",
                        color: "#6c757d",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                      onClick={() =>
                        setCompletedSongsCollapsed(!completedSongsCollapsed)
                      }
                    >
                      <span>{completedSongsCollapsed ? "▶" : "▼"}</span>
                      Completed Songs ({completedCoreSongs.length})
                    </h4>
                    {!completedSongsCollapsed &&
                      completedCoreSongs.map((song) => {
                        const songFilledParts = authoringFields.reduce(
                          (count, field) => {
                            return (
                              count + (song.authoring?.[field] === true ? 1 : 0)
                            );
                          },
                          0
                        );
                        const songPercent =
                          authoringFields.length > 0
                            ? Math.round(
                                (songFilledParts / authoringFields.length) * 100
                              )
                            : 0;
                        const isFinished = songPercent === 100;

                        return (
                          <WipSongCard
                            key={song.id}
                            song={song}
                            authoringFields={authoringFields}
                            onAuthoringUpdate={onUpdateAuthoringField}
                            onToggleOptional={onToggleOptional}
                            onDelete={onDeleteSong}
                            selectedSongs={selectedSongs}
                            setSelectedSongs={onSetSelectedSongs}
                            defaultExpanded={false} // Keep completed songs collapsed
                            onSongUpdate={onSongUpdate}
                          />
                        );
                      })}
                  </>
                )}

                {/* Active Core Songs - IN THE MIDDLE */}
                {activeCoreSongs.length > 0 && (
                  <>
                    <h4
                      style={{
                        marginTop: "0",
                        marginBottom: "1rem",
                        color: "#007bff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                      onClick={() =>
                        setActiveSongsCollapsed(!activeSongsCollapsed)
                      }
                    >
                      <span>{activeSongsCollapsed ? "▶" : "▼"}</span>
                      In Progress Songs ({activeCoreSongs.length})
                    </h4>
                    {!activeSongsCollapsed &&
                      activeCoreSongs.map((song) => {
                        const songFilledParts = authoringFields.reduce(
                          (count, field) => {
                            return (
                              count + (song.authoring?.[field] === true ? 1 : 0)
                            );
                          },
                          0
                        );
                        const songPercent =
                          authoringFields.length > 0
                            ? Math.round(
                                (songFilledParts / authoringFields.length) * 100
                              )
                            : 0;
                        const isFinished = songPercent === 100;

                        return (
                          <WipSongCard
                            key={song.id}
                            song={song}
                            authoringFields={authoringFields}
                            onAuthoringUpdate={onUpdateAuthoringField}
                            onToggleOptional={onToggleOptional}
                            onDelete={onDeleteSong}
                            selectedSongs={selectedSongs}
                            setSelectedSongs={onSetSelectedSongs}
                            defaultExpanded={!isFinished} // Finished songs collapsed, unfinished expanded
                            onSongUpdate={onSongUpdate}
                          />
                        );
                      })}
                  </>
                )}
              </>
            );
          })()}

          {/* Collaboration Songs - Songs where current user is a collaborator */}
          {collaborationSongs.length > 0 && (
            <>
              <h4
                style={{
                  marginTop: "1.5rem",
                  marginBottom: "1rem",
                  color: "#28a745",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onClick={() =>
                  setCollaborationSongsCollapsed(!collaborationSongsCollapsed)
                }
              >
                <span>{collaborationSongsCollapsed ? "▶" : "▼"}</span>
                Collaboration Songs ({collaborationSongs.length})
              </h4>
              {!collaborationSongsCollapsed &&
                sortedCollaborationSongs.map((song) => {
                  // Calculate if collaboration song is finished (100% authoring complete)
                  const songFilledParts = authoringFields.reduce(
                    (count, field) => {
                      return count + (song.authoring?.[field] === true ? 1 : 0);
                    },
                    0
                  );
                  const songPercent =
                    authoringFields.length > 0
                      ? Math.round(
                          (songFilledParts / authoringFields.length) * 100
                        )
                      : 0;
                  const isFinished = songPercent === 100;

                  return (
                    <WipSongCard
                      key={song.id}
                      song={song}
                      authoringFields={authoringFields}
                      onAuthoringUpdate={onUpdateAuthoringField}
                      onToggleOptional={onToggleOptional}
                      onDelete={onDeleteSong}
                      selectedSongs={selectedSongs}
                      setSelectedSongs={onSetSelectedSongs}
                      defaultExpanded={!isFinished} // Finished songs collapsed, unfinished expanded
                      onSongUpdate={onSongUpdate}
                    />
                  );
                })}
            </>
          )}

          {/* Optional Songs */}
          {userOptionalSongs.length > 0 && (
            <>
              <h4
                style={{
                  marginTop: "1.5rem",
                  marginBottom: "1rem",
                  color: "#6c757d",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onClick={() => setOptionalCollapsed(!optionalCollapsed)}
              >
                <span>{optionalCollapsed ? "▶" : "▼"}</span>
                Optional Songs ({userOptionalSongs.length})
              </h4>
              {!optionalCollapsed &&
                sortedUserOptionalSongs.map((song) => {
                  // Calculate if optional song is finished (100% authoring complete)
                  const songFilledParts = authoringFields.reduce(
                    (count, field) => {
                      return count + (song.authoring?.[field] === true ? 1 : 0);
                    },
                    0
                  );
                  const songPercent =
                    authoringFields.length > 0
                      ? Math.round(
                          (songFilledParts / authoringFields.length) * 100
                        )
                      : 0;
                  const isFinished = songPercent === 100;

                  return (
                    <WipSongCard
                      key={song.id}
                      song={song}
                      authoringFields={authoringFields}
                      onAuthoringUpdate={onUpdateAuthoringField}
                      onToggleOptional={onToggleOptional}
                      onDelete={onDeleteSong}
                      selectedSongs={selectedSongs}
                      setSelectedSongs={onSetSelectedSongs}
                      defaultExpanded={!isFinished} // Finished songs collapsed, unfinished expanded
                      onSongUpdate={onSongUpdate}
                    />
                  );
                })}
            </>
          )}

          {/* Collaborator Songs */}
          {collaborators && collaborators.length > 0 && (
            <>
              <h4
                style={{
                  marginTop: "1.5rem",
                  marginBottom: "1rem",
                  color: "#6c757d",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onClick={() =>
                  setCollaboratorSongsCollapsed(!collaboratorSongsCollapsed)
                }
              >
                <span>{collaboratorSongsCollapsed ? "▶" : "▼"}</span>
                Songs by Collaborators ({collaboratorCoreSongs.length})
              </h4>
              {!collaboratorSongsCollapsed &&
                sortedCollaboratorCoreSongs.map((song) => {
                  // Calculate if collaborator song is finished (100% authoring complete)
                  const songFilledParts = authoringFields.reduce(
                    (count, field) => {
                      return count + (song.authoring?.[field] === true ? 1 : 0);
                    },
                    0
                  );
                  const songPercent =
                    authoringFields.length > 0
                      ? Math.round(
                          (songFilledParts / authoringFields.length) * 100
                        )
                      : 0;
                  const isFinished = songPercent === 100;

                  return (
                    <WipSongCard
                      key={song.id}
                      song={song}
                      authoringFields={authoringFields}
                      onAuthoringUpdate={onUpdateAuthoringField}
                      onToggleOptional={onToggleOptional}
                      onDelete={onDeleteSong}
                      selectedSongs={selectedSongs}
                      setSelectedSongs={onSetSelectedSongs}
                      defaultExpanded={!isFinished} // Finished songs collapsed, unfinished expanded
                      readOnly={true} // Songs by collaborators are read-only
                      onSongUpdate={onSongUpdate}
                    />
                  );
                })}
            </>
          )}

          {/* Collaborator Optional Songs */}
          {collaboratorOptionalSongs.length > 0 && (
            <>
              <h4
                style={{
                  marginTop: "1.5rem",
                  marginBottom: "1rem",
                  color: "#6c757d",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onClick={() =>
                  setCollaboratorOptionalCollapsed(
                    !collaboratorOptionalCollapsed
                  )
                }
              >
                <span>{collaboratorOptionalCollapsed ? "▶" : "▼"}</span>
                Optional Songs by Collaborators (
                {collaboratorOptionalSongs.length})
              </h4>
              {!collaboratorOptionalCollapsed &&
                sortedCollaboratorOptionalSongs.map((song) => {
                  // Calculate if collaborator optional song is finished (100% authoring complete)
                  const songFilledParts = authoringFields.reduce(
                    (count, field) => {
                      return count + (song.authoring?.[field] === true ? 1 : 0);
                    },
                    0
                  );
                  const songPercent =
                    authoringFields.length > 0
                      ? Math.round(
                          (songFilledParts / authoringFields.length) * 100
                        )
                      : 0;
                  const isFinished = songPercent === 100;

                  return (
                    <WipSongCard
                      key={song.id}
                      song={song}
                      authoringFields={authoringFields}
                      onAuthoringUpdate={onUpdateAuthoringField}
                      onToggleOptional={onToggleOptional}
                      onDelete={onDeleteSong}
                      selectedSongs={selectedSongs}
                      setSelectedSongs={onSetSelectedSongs}
                      defaultExpanded={!isFinished} // Finished songs collapsed, unfinished expanded
                      readOnly={true} // Songs by collaborators are read-only
                      onSongUpdate={onSongUpdate}
                    />
                  );
                })}
            </>
          )}
        </div>
      )}

      {/* Pack Settings Modal */}
      {showPackSettings && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "8px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>Pack Settings: {packName}</h3>
              <button
                onClick={() => {
                  setShowPackSettings(false);
                  setPackSettingsMode(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>

            {!packSettingsMode && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <button
                  onClick={() => setPackSettingsMode("rename")}
                  style={{
                    padding: "0.75rem 1rem",
                    background: "#f8f9fa",
                    color: "#495057",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#e9ecef";
                    e.target.style.borderColor = "#adb5bd";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#f8f9fa";
                    e.target.style.borderColor = "#dee2e6";
                  }}
                >
                  ✏️ Change Pack Name
                </button>
                <button
                  onClick={() => setPackSettingsMode("status")}
                  style={{
                    padding: "0.75rem 1rem",
                    background: "#f8f9fa",
                    color: "#495057",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#e9ecef";
                    e.target.style.borderColor = "#adb5bd";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#f8f9fa";
                    e.target.style.borderColor = "#dee2e6";
                  }}
                >
                  📋 Move back to Future Plans
                </button>
                {albumsWithEnoughSongs.length >= 1 && (
                  <button
                    onClick={() => {
                      onShowAlbumSeriesModal &&
                        onShowAlbumSeriesModal(packName, albumsWithEnoughSongs);
                      setShowPackSettings(false);
                    }}
                    style={{
                      padding: "0.75rem 1rem",
                      background: "#f8f9fa",
                      color: "#495057",
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = "#e9ecef";
                      e.target.style.borderColor = "#adb5bd";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "#f8f9fa";
                      e.target.style.borderColor = "#dee2e6";
                    }}
                  >
                    🎵 Make Album Series
                  </button>
                )}
              </div>
            )}

            {packSettingsMode === "rename" && (
              <div>
                <h4 style={{ marginBottom: "1rem" }}>Change Pack Name</h4>
                <input
                  type="text"
                  value={newPackName}
                  onChange={(e) => setNewPackName(e.target.value)}
                  placeholder="New pack name"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    marginBottom: "1rem",
                  }}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      onRenamePack(packName, newPackName);
                      setShowPackSettings(false);
                      setPackSettingsMode(null);
                    }}
                    disabled={
                      !newPackName.trim() || newPackName.trim() === packName
                    }
                    style={{
                      padding: "0.5rem 1rem",
                      background:
                        newPackName.trim() && newPackName.trim() !== packName
                          ? "#007bff"
                          : "#e9ecef",
                      color:
                        newPackName.trim() && newPackName.trim() !== packName
                          ? "white"
                          : "#6c757d",
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      cursor:
                        newPackName.trim() && newPackName.trim() !== packName
                          ? "pointer"
                          : "not-allowed",
                      fontSize: "0.9rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setPackSettingsMode(null);
                      setNewPackName(packName);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#f8f9fa",
                      color: "#495057",
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {packSettingsMode === "status" && (
              <div>
                <h4 style={{ marginBottom: "1rem" }}>
                  Move Pack back to Future Plans
                </h4>
                <p style={{ marginBottom: "1rem", color: "#666" }}>
                  This will change all songs in "{packName}" from "In Progress"
                  to "Future Plans" status.
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      onMovePackToFuturePlans(packName);
                      setShowPackSettings(false);
                      setPackSettingsMode(null);
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#28a745",
                      color: "white",
                      border: "1px solid #28a745",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setPackSettingsMode(null)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#f8f9fa",
                      color: "#495057",
                      border: "1px solid #dee2e6",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WipPackCard;
