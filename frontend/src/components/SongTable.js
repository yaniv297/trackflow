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

  const renderPackGroup = (packName, songsInPack) => {
    const validSongsInPack = songsInPack.filter(
      (song) => song && typeof song === "object"
    );

    if (validSongsInPack.length === 0) return null;

    // Album series logic - extract unique series from songs
    // Pack-level series: if the pack has an album series, there will be a single series id on all songs in the pack
    const packSeriesId =
      validSongsInPack.find((s) => s.album_series_id)?.album_series_id || null;
    const validSeries = packSeriesId ? [packSeriesId] : [];

    const seriesInfo = packSeriesId
      ? (() => {
          const s = validSongsInPack.find(
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
          seriesInfo={seriesInfo}
          validSeries={validSeries}
          canMakeDoubleAlbumSeries={canMakeDoubleAlbumSeries}
          albumsWithEnoughSongs={albumsWithEnoughSongs}
          onMakeDoubleAlbumSeries={() =>
            openAlbumSeriesModal(packName, validSongsInPack)
          }
          onShowAlbumSeriesModal={() =>
            openAlbumSeriesModal(packName, validSongsInPack)
          }
          onBulkEdit={onBulkEdit || (() => {})}
          onBulkDelete={onBulkDelete || (() => {})}
          onBulkEnhance={onBulkEnhance || (() => {})}
          onStartWork={onStartWork || (() => {})}
          onCleanTitles={onCleanTitles || (() => {})}
          artistImageUrl=""
          mostCommonArtist=""
          showAlbumSeriesButton={albumsWithEnoughSongs.length >= 1}
          status={status}
          user={user}
          setShowCollaborationModal={setShowCollaborationModal}
          setSelectedItemForCollaboration={setSelectedItemForCollaboration}
          setCollaborationType={setCollaborationType}
          onSongAdded={onSongAdded}
          onPackNameUpdate={onPackNameUpdate}
        />

        {!collapsedGroups[packName] && (
          <>
            <ColumnHeaders
              groupBy={groupBy}
              handleSort={(key) => handleLocalSort(packName, key)}
              sortKey={localSortStates[packName]?.key}
              sortDirection={localSortStates[packName]?.direction}
              packName={packName}
            />
            {sortSongsInGroup(validSongsInPack, packName).map((song) => (
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
                packName={packName}
              />
            ))}
          </>
        )}
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

      {albumSeriesModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeAlbumSeriesModal}
        >
          <div
            style={{
              background: "white",
              padding: "1.2rem",
              borderRadius: 8,
              minWidth: 420,
              maxWidth: 720,
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 10px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <h3 style={{ margin: 0 }}>Create Album Series</h3>
              <button
                onClick={closeAlbumSeriesModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                  color: "#666",
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {albumSeriesModal.albumsWithEnoughSongs.length === 0 ? (
              <p>No eligible albums (need at least 4 non-optional songs).</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {albumSeriesModal.albumsWithEnoughSongs
                  .slice(0, 2)
                  .map(([albumName]) => {
                    const songs =
                      albumSeriesModal.songsByAlbum[albumName] || [];
                    const artist = songs[0]?.artist || "Unknown Artist";
                    return (
                      <div
                        key={albumName}
                        style={{
                          border: "1px solid #eee",
                          borderRadius: 8,
                          padding: 12,
                          background: "#fafafa",
                        }}
                      >
                        <div style={{ marginBottom: 8 }}>
                          <strong>{artist}</strong> — <em>{albumName}</em> (
                          {songs.length} songs)
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {songs.map((s) => (
                            <li key={s.id}>
                              {s.title} — {s.artist}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <button
                onClick={closeAlbumSeriesModal}
                style={{
                  background: "#6c757d",
                  color: "#fff",
                  border: 0,
                  padding: "0.45rem 0.9rem",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const albums = albumSeriesModal.albumsWithEnoughSongs.slice(
                      0,
                      2
                    );
                    if (albums.length === 0) return;

                    // Create one series per qualifying album (supports double)
                    for (const [albumName] of albums) {
                      const songs =
                        albumSeriesModal.songsByAlbum[albumName] || [];
                      const song_ids = songs.map((s) => s.id);
                      const artist_name = songs[0]?.artist || "";
                      const year = parseInt(songs[0]?.year) || null;

                      await apiPost("/album-series/create-from-pack", {
                        pack_name: albumSeriesModal.packName,
                        song_ids,
                        artist_name,
                        album_name: albumName,
                        year,
                        cover_image_url: null,
                        description: null,
                      });
                    }

                    if (window.showNotification) {
                      window.showNotification(
                        albums.length === 2
                          ? "Double album series created successfully!"
                          : "Album series created successfully!",
                        "success"
                      );
                    }

                    closeAlbumSeriesModal();
                    if (typeof onSongAdded === "function") {
                      onSongAdded(); // refresh list
                    }
                  } catch (err) {
                    console.error("Failed to create album series:", err);
                    if (window.showNotification) {
                      window.showNotification(
                        "Failed to create album series",
                        "error"
                      );
                    }
                  }
                }}
                style={{
                  background: "#007bff",
                  color: "#fff",
                  border: 0,
                  padding: "0.45rem 0.9rem",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {albumSeriesModal.albumsWithEnoughSongs.length >= 2
                  ? "Create Double Album Series"
                  : "Create Album Series"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SongTable;
