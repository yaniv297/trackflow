import React from "react";
import SongRow from "./SongRow";
import PackHeader from "./PackHeader";
import BulkActions from "./BulkActions";

const SongTable = ({
  songs,
  selectedSongs,
  setSelectedSongs,
  editing,
  setEditing,
  editValues,
  setEditValues,
  saveEdit,
  fetchSpotifyOptions,
  handleDelete,
  spotifyOptions,
  setSpotifyOptions,
  applySpotifyEnhancement,
  sortKey,
  sortDirection,
  handleSort,
  groupBy,
  groupedSongs,
  collapsedGroups,
  toggleGroup,
  user,
  getPackCollaborators,
  setShowCollaborationModal,
  setSelectedItemForCollaboration,
  setCollaborationType,
  status,
  onBulkEdit,
  onStartWork,
  onBulkDelete,
  onBulkEnhance,
  onCleanTitles,
  onSongAdded,
}) => {
  const renderPackGroup = (packName, songsInPack) => {
    const validSongsInPack = songsInPack.filter(
      (song) => song && typeof song === "object"
    );

    if (validSongsInPack.length === 0) return null;

    // Album series logic - extract unique series from songs
    const uniqueSeries = [
      ...new Set(
        validSongsInPack
          .filter((song) => song.album_series_id)
          .map((song) => song.album_series_id)
      ),
    ];

    const seriesSongCounts = {};
    validSongsInPack.forEach((song) => {
      if (song.album_series_id) {
        seriesSongCounts[song.album_series_id] =
          (seriesSongCounts[song.album_series_id] || 0) + 1;
      }
    });

    // Only include series with 4+ songs
    const validSeries = uniqueSeries.filter(
      (seriesId) => seriesSongCounts[seriesId] >= 4
    );

    const seriesInfo = validSeries
      .map((id) => {
        const s = validSongsInPack.find((song) => song.album_series_id === id);
        return s
          ? {
              id,
              number: s.album_series_number,
              name: s.album_series_name,
            }
          : null;
      })
      .filter(Boolean);

    seriesInfo.sort((a, b) => {
      // Handle cases where number might be null/undefined
      const aNum = a?.number ?? 0;
      const bNum = b?.number ?? 0;
      return aNum - bNum;
    });

    return (
      <React.Fragment key={packName}>
        <PackHeader
          packName={packName}
          validSongsInPack={validSongsInPack}
          selectedSongs={selectedSongs}
          setSelectedSongs={setSelectedSongs}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          seriesInfo={seriesInfo}
          validSeries={validSeries}
          // Placeholder props for now - these can be added later if needed
          canMakeDoubleAlbumSeries={false}
          albumsWithEnoughSongs={[]}
          onMakeDoubleAlbumSeries={() => {}}
          onShowAlbumSeriesModal={() => {}}
          onBulkEdit={onBulkEdit || (() => {})}
          onBulkDelete={onBulkDelete || (() => {})}
          onBulkEnhance={onBulkEnhance || (() => {})}
          onStartWork={onStartWork || (() => {})}
          onCleanTitles={onCleanTitles || (() => {})}
          artistImageUrl=""
          mostCommonArtist=""
          showAlbumSeriesButton={false}
          status={status}
          user={user}
          setShowCollaborationModal={setShowCollaborationModal}
          setSelectedItemForCollaboration={setSelectedItemForCollaboration}
          setCollaborationType={setCollaborationType}
          onSongAdded={onSongAdded}
        />

        {!collapsedGroups[packName] &&
          validSongsInPack.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              selected={selectedSongs.includes(song.id)}
              onSelect={(e) => {
                if (e.target.checked) {
                  setSelectedSongs((prev) => [...prev, song.id]);
                } else {
                  setSelectedSongs((prev) =>
                    prev.filter((id) => id !== song.id)
                  );
                }
              }}
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              fetchSpotifyOptions={fetchSpotifyOptions}
              handleDelete={handleDelete}
              spotifyOptions={spotifyOptions}
              setSpotifyOptions={setSpotifyOptions}
              applySpotifyEnhancement={applySpotifyEnhancement}
              status={status}
              groupBy={groupBy}
            />
          ))}
      </React.Fragment>
    );
  };

  const renderArtistGroup = (artist, albums) => {
    const allSongsInArtist = Object.values(albums).flat();
    const artistImageUrl = allSongsInArtist.find(
      (s) => s.artist_image_url
    )?.artist_image_url;

    return (
      <React.Fragment key={artist}>
        {/* Artist Header Row */}
        <tr className="group-header">
          <td colSpan="10">
            <input
              type="checkbox"
              checked={allSongsInArtist.every((s) =>
                selectedSongs.includes(s.id)
              )}
              onChange={(e) => {
                const songIds = allSongsInArtist.map((s) => s.id);
                if (e.target.checked) {
                  setSelectedSongs((prev) => [
                    ...new Set([...prev, ...songIds]),
                  ]);
                } else {
                  setSelectedSongs((prev) =>
                    prev.filter((id) => !songIds.includes(id))
                  );
                }
              }}
              style={{ marginRight: "1rem" }}
              className="pretty-checkbox"
            />
            {artistImageUrl && (
              <img
                src={artistImageUrl}
                alt={artist}
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
              onClick={() => toggleGroup(artist)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {collapsedGroups[artist] ? "▶" : "▼"}
            </button>
            <span
              style={{
                fontWeight: 700,
                fontSize: "1.25rem",
                color: "#222",
              }}
            >
              {artist}
            </span>

            {/* Bulk actions for artist group if any song in the group is selected */}
            {allSongsInArtist.some((s) => selectedSongs.includes(s.id)) && (
              <span style={{ marginLeft: "1rem" }}>
                <BulkActions
                  selectedSongs={selectedSongs}
                  onBulkEdit={onBulkEdit}
                  onBulkDelete={onBulkDelete}
                  onBulkEnhance={onBulkEnhance}
                  onStartWork={onStartWork}
                  onCleanTitles={onCleanTitles}
                  showAlbumSeriesButton={false}
                  showDoubleAlbumSeriesButton={false}
                  status={status}
                />
              </span>
            )}
          </td>
        </tr>

        {!collapsedGroups[artist] &&
          Object.entries(albums).map(([album, songsInAlbum]) => (
            <React.Fragment key={`${artist}-${album}`}>
              {/* Album Header Row */}
              <tr className="group-subheader">
                <td colSpan="9">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      paddingLeft: "2em",
                      fontStyle: "italic",
                      fontSize: "1rem",
                      fontWeight: 500,
                    }}
                  >
                    <div style={{ flex: "0 0 auto" }}>
                      <input
                        type="checkbox"
                        checked={songsInAlbum.every((song) =>
                          selectedSongs.includes(song.id)
                        )}
                        onChange={(e) => {
                          const songIds = songsInAlbum.map((s) => s.id);
                          if (e.target.checked) {
                            setSelectedSongs((prev) => [
                              ...new Set([...prev, ...songIds]),
                            ]);
                          } else {
                            setSelectedSongs((prev) =>
                              prev.filter((id) => !songIds.includes(id))
                            );
                          }
                        }}
                        className="pretty-checkbox"
                      />
                    </div>
                    <div style={{ flex: "1 1 auto" }}>
                      💿 <em>{album || "Unknown Album"}</em> (
                      {songsInAlbum.length})
                    </div>

                    {/* Bulk actions for album group if any song in the album is selected */}
                    {songsInAlbum.some((s) => selectedSongs.includes(s.id)) && (
                      <div style={{ flex: "0 0 auto", marginLeft: "1rem" }}>
                        <BulkActions
                          selectedSongs={selectedSongs}
                          onBulkEdit={onBulkEdit}
                          onBulkDelete={onBulkDelete}
                          onBulkEnhance={onBulkEnhance}
                          onStartWork={onStartWork}
                          onCleanTitles={onCleanTitles}
                          showAlbumSeriesButton={false}
                          showDoubleAlbumSeriesButton={false}
                          status={status}
                        />
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              {/* Song Rows */}
              {songsInAlbum.map((song) => (
                <SongRow
                  key={song.id}
                  song={song}
                  selected={selectedSongs.includes(song.id)}
                  onSelect={(e) => {
                    if (e.target.checked) {
                      setSelectedSongs((prev) => [...prev, song.id]);
                    } else {
                      setSelectedSongs((prev) =>
                        prev.filter((id) => id !== song.id)
                      );
                    }
                  }}
                  editing={editing}
                  editValues={editValues}
                  setEditing={setEditing}
                  setEditValues={setEditValues}
                  saveEdit={saveEdit}
                  fetchSpotifyOptions={fetchSpotifyOptions}
                  handleDelete={handleDelete}
                  spotifyOptions={spotifyOptions}
                  setSpotifyOptions={setSpotifyOptions}
                  applySpotifyEnhancement={applySpotifyEnhancement}
                  status={status}
                  groupBy={groupBy}
                />
              ))}
            </React.Fragment>
          ))}
      </React.Fragment>
    );
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="song-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={
                  selectedSongs.length > 0 &&
                  songs.every((song) => selectedSongs.includes(song.id))
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedSongs(songs.map((song) => song.id));
                  } else {
                    setSelectedSongs([]);
                  }
                }}
                className="pretty-checkbox"
              />
            </th>
            <th>Cover</th>
            <th onClick={() => handleSort("title")} className="sortable">
              Title{" "}
              {sortKey === "title" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            {groupBy !== "artist" && (
              <th onClick={() => handleSort("artist")} className="sortable">
                Artist{" "}
                {sortKey === "artist" && (sortDirection === "asc" ? "▲" : "▼")}
              </th>
            )}
            <th onClick={() => handleSort("album")} className="sortable">
              Album{" "}
              {sortKey === "album" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            {groupBy !== "pack" && <th>Pack</th>}
            <th>Owner</th>
            <th onClick={() => handleSort("year")} className="sortable">
              Year {sortKey === "year" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            <th>Collaborations</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groupBy === "artist"
            ? Object.entries(groupedSongs).map(([artist, albums]) =>
                renderArtistGroup(artist, albums)
              )
            : Object.entries(groupedSongs).map(([packName, songsInPack]) =>
                renderPackGroup(packName, songsInPack)
              )}
        </tbody>
      </table>
    </div>
  );
};

export default SongTable;
