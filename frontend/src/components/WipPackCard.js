import React, { useState } from "react";
import SmartDropdown from "./SmartDropdown";
import WipSongCard from "./WipSongCard";

const WipPackCard = ({
  packName,
  percent,
  coreSongs,
  allSongs,
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

  // State for collapsing sections
  const [optionalCollapsed, setOptionalCollapsed] = React.useState(true);
  const [collaborationSongsCollapsed, setCollaborationSongsCollapsed] =
    React.useState(false); // Expanded by default for collaboration songs
  const [collaboratorSongsCollapsed, setCollaboratorSongsCollapsed] =
    React.useState(true);
  const [completedSongsCollapsed, setCompletedSongsCollapsed] =
    React.useState(true); // Collapsed by default

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
  const sortedCollaboratorSongs = collaboratorOwnedSongs
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

  const seriesInfo = seriesWithThreshold
    .map((id) => {
      const s = allSongs.find((song) => song.album_series_id === id);
      return s
        ? { id, number: s.album_series_number, name: s.album_series_name }
        : null;
    })
    .filter(Boolean);

  seriesInfo.sort((a, b) => a.number - b.number);

  // Check for double album series opportunity
  const albumCounts = {};
  allSongs.forEach((song) => {
    if (song.album && !song.optional) {
      albumCounts[song.album] = (albumCounts[song.album] || 0) + 1;
    }
  });

  // Find albums with 5+ songs
  const albumsWithEnoughSongs = Object.entries(albumCounts)
    .filter(([album, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1]); // Sort by count descending

  // Check if we have an existing album series AND another album with 5+ songs
  const hasExistingSeries = seriesWithThreshold.length > 0;
  const hasSecondAlbum = albumsWithEnoughSongs.length >= 2;
  // eslint-disable-next-line no-unused-vars
  const canMakeDoubleAlbumSeries = hasExistingSeries && hasSecondAlbum;

  // Get pack collaboration info
  let packId = grouped.find((p) => p.pack === packName)?.allSongs[0]?.pack_id;

  if (
    grouped.find((p) => p.pack === packName)?.allSongs[0]?.album_series_id &&
    !packId
  ) {
    // If we have an album series but no pack_id, try to get it from the album series
    const albumSeriesSong = grouped
      .find((p) => p.pack === packName)
      ?.allSongs.find((s) => s.album_series_id);
    if (albumSeriesSong) {
      packId = albumSeriesSong.pack_id;
    }
  }

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
            const activeCoreSongs = sortedUserCoreSongs.filter((song) => {
              const songFilledParts = authoringFields.reduce((count, field) => {
                return count + (song.authoring?.[field] === true ? 1 : 0);
              }, 0);
              const songPercent =
                authoringFields.length > 0
                  ? Math.round((songFilledParts / authoringFields.length) * 100)
                  : 0;
              return songPercent < 100; // Not finished
            });

            const completedCoreSongs = sortedUserCoreSongs.filter((song) => {
              const songFilledParts = authoringFields.reduce((count, field) => {
                return count + (song.authoring?.[field] === true ? 1 : 0);
              }, 0);
              const songPercent =
                authoringFields.length > 0
                  ? Math.round((songFilledParts / authoringFields.length) * 100)
                  : 0;
              return songPercent === 100; // Finished
            });

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
                          />
                        );
                      })}
                  </>
                )}

                {/* Active Core Songs - IN THE MIDDLE */}
                {activeCoreSongs.map((song) => {
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
                    />
                  );
                })}
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
                Songs by Collaborators ({collaboratorOwnedSongs.length})
              </h4>
              {!collaboratorSongsCollapsed &&
                sortedCollaboratorSongs.map((song) => {
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
                    />
                  );
                })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default WipPackCard;
