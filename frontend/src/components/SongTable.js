import React, { useState } from "react";
import SongRow from "./SongRow";
import PackHeader from "./PackHeader";
import BulkActions from "./BulkActions";
import ColumnHeaders from "./ColumnHeaders";
import { apiPost } from "../utils/api";

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
  onPackNameUpdate,
  onDeletePack,
  onShowAlbumSeriesModal,
  onMakeDoubleAlbumSeries,
}) => {
  const [localSortStates, setLocalSortStates] = useState({});
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [albumSeriesModal, setAlbumSeriesModal] = useState({
    open: false,
    packName: "",
    albumsWithEnoughSongs: [], // [albumName, count][]
    songsByAlbum: {}, // albumName -> song objects array
  });

  const openAlbumSeriesModal = (packName, packSongs) => {
    const songsInPack = packSongs.filter((s) => s && typeof s === "object");
    const songsByAlbum = {};
    songsInPack.forEach((s) => {
      if (s.album && !s.optional) {
        if (!songsByAlbum[s.album]) songsByAlbum[s.album] = [];
        songsByAlbum[s.album].push(s);
      }
    });
    const albumsWithEnoughSongs = Object.entries(songsByAlbum)
      .filter(([, list]) => list.length >= 4)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([album, list]) => [album, list.length]);

    setAlbumSeriesModal({
      open: true,
      packName,
      albumsWithEnoughSongs,
      songsByAlbum,
    });
  };

  const closeAlbumSeriesModal = () =>
    setAlbumSeriesModal({
      open: false,
      packName: "",
      albumsWithEnoughSongs: [],
      songsByAlbum: {},
    });

  // Handle local sorting for a specific group
  const handleLocalSort = (groupKey, key) => {
    setLocalSortStates((prev) => {
      const currentState = prev[groupKey] || { key: null, direction: "asc" };
      const newDirection =
        currentState.key === key && currentState.direction === "asc"
          ? "desc"
          : "asc";
      return {
        ...prev,
        [groupKey]: { key, direction: newDirection },
      };
    });
  };

  // Sort songs within a group
  const sortSongsInGroup = (songs, groupKey) => {
    const sortState = localSortStates[groupKey];
    if (!sortState || !sortState.key) return songs;

    return [...songs].sort((a, b) => {
      let aValue = a[sortState.key] || "";
      let bValue = b[sortState.key] || "";

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortState.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortState.direction === "asc" ? 1 : -1;
      return 0;
    });
  };

  // Render header + rows for a given group key
  const renderRowsForGroup = (packName, groupSongs) => (
    <>
      <ColumnHeaders
        groupBy={groupBy}
        handleSort={(key) => handleLocalSort(packName, key)}
        sortKey={localSortStates[packName]?.key}
        sortDirection={localSortStates[packName]?.direction}
        packName={packName}
      />
      {sortSongsInGroup(groupSongs, packName).map((song) => (
        <SongRow
          key={song.id}
          song={song}
          selected={selectedSongs.includes(song.id)}
          onSelect={(e) => {
            if (e.target.checked) {
              setSelectedSongs((prev) => [...prev, song.id]);
            } else {
              setSelectedSongs((prev) => prev.filter((id) => id !== song.id));
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
          packName={packName}
        />
      ))}
    </>
  );

  const renderPackGroup = (packName, songsInPack) => {
    const validSongsInPack = songsInPack.filter(
      (song) => song && typeof song === "object"
    );

    if (validSongsInPack.length === 0) return null;

    // Album series logic: use only song-level ids (source of truth)
    const seriesIdsForPack = Array.from(
      new Set(
        validSongsInPack
          .map((s) => s && s.album_series_id)
          .filter((id) => id !== null && id !== undefined && id !== "")
          .map((id) => (typeof id === "string" ? parseInt(id, 10) : id))
          .filter((id) => Number.isInteger(id))
      )
    );

    const seriesInfo = seriesIdsForPack.map((seriesId) => {
      const s =
        validSongsInPack.find((song) => song.album_series_id === seriesId) ||
        {};
      const num =
        typeof s.album_series_number === "string"
          ? parseInt(s.album_series_number, 10)
          : s.album_series_number;
      return {
        id: typeof seriesId === "string" ? parseInt(seriesId, 10) : seriesId,
        number: Number.isFinite(num) ? num : null,
        name: s.album_series_name,
      };
    });

    const sortedSeriesInfo = [...seriesInfo].sort((a, b) => {
      const an = Number.isFinite(a.number)
        ? a.number
        : Number.POSITIVE_INFINITY;
      const bn = Number.isFinite(b.number)
        ? b.number
        : Number.POSITIVE_INFINITY;
      if (an !== bn) return an - bn;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    const seriesIdsForPackSorted = sortedSeriesInfo.map((i) => i.id);

    // Compute album counts for action buttons
    const albumsCountMap = validSongsInPack.reduce((acc, s) => {
      if (s.album && !s.optional) acc[s.album] = (acc[s.album] || 0) + 1;
      return acc;
    }, {});
    const albumsWithEnoughSongs = Object.entries(albumsCountMap).filter(
      ([, c]) => c >= 4
    );
    const canMakeDoubleAlbumSeries = albumsWithEnoughSongs.length >= 2;

    return (
      <React.Fragment key={packName}>
        <PackHeader
          packName={packName}
          validSongsInPack={validSongsInPack}
          selectedSongs={selectedSongs}
          setSelectedSongs={setSelectedSongs}
          collapsedGroups={collapsedGroups}
          toggleGroup={toggleGroup}
          seriesInfo={sortedSeriesInfo}
          validSeries={seriesIdsForPackSorted}
          canMakeDoubleAlbumSeries={canMakeDoubleAlbumSeries}
          albumsWithEnoughSongs={albumsWithEnoughSongs}
          onMakeDoubleAlbumSeries={() =>
            onMakeDoubleAlbumSeries &&
            onMakeDoubleAlbumSeries(packName, albumsWithEnoughSongs)
          }
          onShowAlbumSeriesModal={() =>
            onShowAlbumSeriesModal &&
            onShowAlbumSeriesModal(packName, albumsWithEnoughSongs)
          }
          onBulkEdit={onBulkEdit || (() => {})}
          onBulkDelete={onBulkDelete || (() => {})}
          onBulkEnhance={onBulkEnhance || (() => {})}
          onStartWork={onStartWork || (() => {})}
          onCleanTitles={onCleanTitles || (() => {})}
          artistImageUrl=""
          mostCommonArtist=""
          user={user}
          status={status}
          setShowCollaborationModal={setShowCollaborationModal}
          setSelectedItemForCollaboration={setSelectedItemForCollaboration}
          setCollaborationType={setCollaborationType}
          onSongAdded={onSongAdded}
          onPackNameUpdate={onPackNameUpdate}
          onDeletePack={onDeletePack}
        />
        {!collapsedGroups[packName] &&
          renderRowsForGroup(packName, validSongsInPack)}
      </React.Fragment>
    );
  };

  // Group songs by pack (or artist/album) and render
  const groupedKeys = Object.keys(groupedSongs || {});

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <table className="song-table">
          <tbody>
            {groupedKeys.map((groupKey) => {
              const group = groupedSongs[groupKey] || [];
              if (groupBy === "pack") {
                return renderPackGroup(groupKey, group);
              }
              // For other groupings, reuse pack rendering per group
              return renderPackGroup(groupKey, group);
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions Modal Placeholder */}
      {showBulkModal && (
        <BulkActions
          onClose={() => setShowBulkModal(false)}
          onApply={(action) => {
            // This is a placeholder. Integrate selection logic if needed.
            setShowBulkModal(false);
          }}
        />
      )}

      {/* Album Series Modal Placeholder */}
      {albumSeriesModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={closeAlbumSeriesModal}
        >
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 8,
              minWidth: 360,
              maxWidth: 720,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>
              Create/Edit Album Series for {albumSeriesModal.packName}
            </h3>
            {/* Content to be implemented */}
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button onClick={closeAlbumSeriesModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SongTable;
