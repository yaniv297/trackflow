import React from "react";
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
  onBulkEnhancePack,
  onReleasePack,
  onHandleCreateAlbumSeries,
  onHandleMakeDoubleAlbumSeries,
  onSetSelectedSongs,
  selectedSongs,
}) => {
  // Sort core and optional songs by completion (filledCount) descending
  const sortedCoreSongs = coreSongs
    .slice()
    .sort((a, b) => b.filledCount - a.filledCount);
  const optionalSongs = allSongs
    .filter((s) => s.optional)
    .sort((a, b) => b.filledCount - a.filledCount);

  // Only count core songs for header
  const mainSongs = sortedCoreSongs;
  const totalSongs = mainSongs.length;

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

  const handleCollaborationClick = () => {
    if (packId) {
      onSetSelectedItemForCollaboration({
        id: packId,
        name: packName,
      });
      onSetCollaborationType("pack");
      onSetShowCollaborationModal(true);
    }
  };

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
          {/* Manage Collaborations Button - Only show for pack owners */}
          {grouped.find((p) => p.pack === packName)?.allSongs[0]
            ?.pack_owner_id === user?.id && (
            <button
              onClick={handleCollaborationClick}
              style={{
                background: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "0.25rem 0.5rem",
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                fontWeight: 500,
              }}
              title="Manage collaborations for this pack"
            >
              👥 Manage Collaborations
            </button>
          )}

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
            <input
              type="text"
              placeholder="Artist"
              value={newSongData.artist || ""}
              onChange={(e) =>
                setNewSongData((prev) => ({ ...prev, artist: e.target.value }))
              }
              style={{
                padding: "0.5rem",
                border: "1px solid #ced4da",
                borderRadius: "4px",
                fontSize: "0.9rem",
                flex: 1,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => onAddSongToPack(packName, newSongData)}
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
            <button
              onClick={() => onBulkEnhancePack(allSongs)}
              style={{
                background: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "0.5rem 1rem",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              🎵 Bulk Enhance Pack
            </button>

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

          {/* Core Songs */}
          {sortedCoreSongs.map((song) => {
            // Calculate if song is finished (100% authoring complete)
            const songFilledParts = authoringFields.reduce((count, field) => {
              return count + (song.authoring?.[field] === true ? 1 : 0);
            }, 0);
            const songPercent =
              authoringFields.length > 0
                ? Math.round((songFilledParts / authoringFields.length) * 100)
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

          {/* Optional Songs */}
          {optionalSongs.length > 0 && (
            <>
              <h4
                style={{
                  marginTop: "1.5rem",
                  marginBottom: "1rem",
                  color: "#6c757d",
                }}
              >
                Optional Songs
              </h4>
              {optionalSongs.map((song) => {
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
        </div>
      )}
    </div>
  );
};

export default WipPackCard;
