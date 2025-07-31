import React from "react";
import SongRow from "./SongRow";

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
}) => {
  const renderPackGroup = (packName, songsInPack) => {
    const validSongsInPack = songsInPack.filter(
      (song) => song && typeof song === "object"
    );

    if (validSongsInPack.length === 0) return null;

    const collaborators = getPackCollaborators(
      validSongsInPack[0]?.pack_id,
      validSongsInPack
    );

    return (
      <React.Fragment key={packName}>
        {/* Pack Header Row */}
        <tr className="group-header">
          <td colSpan="10">
            <input
              type="checkbox"
              checked={validSongsInPack.every((song) =>
                selectedSongs.includes(song.id)
              )}
              onChange={(e) => {
                const songIds = validSongsInPack.map((s) => s.id);
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
            <button
              onClick={() => toggleGroup(packName)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {collapsedGroups[packName] ? "▶" : "▼"}
            </button>
            <span
              style={{
                fontWeight: 700,
                fontSize: "1.25rem",
                color: "#222",
              }}
            >
              {packName}
            </span>
            {collaborators && (
              <div
                style={{
                  marginTop: "4px",
                  fontSize: "0.85rem",
                  color: "#666",
                  fontStyle: "italic",
                }}
              >
                Collaboration with: {collaborators.join(", ")}
              </div>
            )}
            {validSongsInPack[0]?.pack_id &&
              validSongsInPack[0]?.pack_owner_username === user?.username && (
                <button
                  onClick={() => {
                    setSelectedItemForCollaboration({
                      type: "pack",
                      id: validSongsInPack[0].pack_id,
                      name: packName,
                    });
                    setCollaborationType("pack");
                    setShowCollaborationModal(true);
                  }}
                  style={{
                    marginLeft: "auto",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "0.25rem 0.5rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                  }}
                  title="Manage pack collaborations"
                >
                  Manage Collaborations
                </button>
              )}
          </td>
        </tr>

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
            <th onClick={() => handleSort("artist")} className="sortable">
              Artist{" "}
              {sortKey === "artist" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            <th onClick={() => handleSort("album")} className="sortable">
              Album{" "}
              {sortKey === "album" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            <th>Pack</th>
            <th>Status</th>
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
