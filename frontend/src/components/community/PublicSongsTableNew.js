import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProfilePopup } from "../../hooks/ui/useUserProfilePopup";
import UserProfilePopup from "../shared/UserProfilePopup";
import collaborationRequestsService from "../../services/collaborationRequestsService";
import PublicSongRow from "./PublicSongRow";
import "../profile/ProfileSongsTable.css";
import "./PublicSongsTableNew.css";

const PublicSongsTableNew = ({
  songs,
  currentPage,
  onPageChange,
  onCollaborationRequest,
  currentUserId,
  collaborationStatusMap = new Map(), // song_id -> status
  groupBy = "none", // 'none', 'artist', or 'user'
  setGroupBy,
  expandedGroups,
  setExpandedGroups,
  itemsPerPage = 20,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [hideMySongs, setHideMySongs] = useState(false);
  const [sortColumn, setSortColumn] = useState("title");
  const [sortDirection, setSortDirection] = useState("asc");
  const [artistSortMode, setArtistSortMode] = useState("count"); // 'count' or 'alphabetical'
  const [userSortMode, setUserSortMode] = useState("count"); // 'count' or 'alphabetical'
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  // Filter songs based on search term, exclude released songs, and optionally hide current user's songs
  const filteredSongs = useMemo(() => {
    if (!songs || songs.length === 0) return [];

    // First filter out released songs
    let filtered = songs.filter((song) => song.status !== "Released");

    // Filter out current user's songs if checkbox is checked
    if (hideMySongs && currentUserId) {
      filtered = filtered.filter((song) => song.user_id !== currentUserId);
    }

    // Then apply search filter if present
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (song) =>
          (song.title && song.title.toLowerCase().includes(search)) ||
          (song.artist && song.artist.toLowerCase().includes(search)) ||
          (song.album && song.album.toLowerCase().includes(search)) ||
          (song.username && song.username.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [songs, searchTerm, hideMySongs, currentUserId]);

  if (!songs || songs.length === 0) return null;

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
    // Reset to first page when sorting changes
    onPageChange(1);
  };

  // Sort songs based on current sort settings
  const sortSongs = (songs) => {
    return [...songs].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case "artist":
          aValue = (a.artist || "").toLowerCase();
          bValue = (b.artist || "").toLowerCase();
          break;
        case "title":
          aValue = (a.title || "").toLowerCase();
          bValue = (b.title || "").toLowerCase();
          break;
        case "owner":
          aValue = (a.username || "").toLowerCase();
          bValue = (b.username || "").toLowerCase();
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        default:
          return 0;
      }

      const comparison = aValue.localeCompare(bValue);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  // Render sort indicator
  const renderSortIndicator = (column) => {
    if (sortColumn !== column) {
      return <span className="sort-indicator">⇅</span>;
    }
    return (
      <span className="sort-indicator">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  // Group songs by artist
  const groupSongsByArtist = (songs) => {
    const grouped = songs.reduce((acc, song) => {
      const artist = song.artist || "Unknown Artist";
      if (!acc[artist]) {
        acc[artist] = [];
      }
      acc[artist].push(song);
      return acc;
    }, {});

    // Sort artists based on selected mode
    const sortedEntries = Object.entries(grouped).sort((a, b) => {
      if (artistSortMode === "alphabetical") {
        // Sort alphabetically (case-insensitive)
        return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
      } else {
        // Sort by count (default)
        return b[1].length - a[1].length;
      }
    });

    return sortedEntries.map(([artist, songs]) => ({
      artist,
      songs: sortSongs(songs),
      songCount: songs.length,
    }));
  };

  // Group songs by user
  const groupSongsByUser = (songs) => {
    const grouped = songs.reduce((acc, song) => {
      const username = song.username || "Unknown User";
      if (!acc[username]) {
        acc[username] = [];
      }
      acc[username].push(song);
      return acc;
    }, {});

    // Sort users based on selected mode
    const sortedEntries = Object.entries(grouped).sort((a, b) => {
      if (userSortMode === "alphabetical") {
        // Sort alphabetically (case-insensitive)
        return a[0].toLowerCase().localeCompare(b[0].toLowerCase());
      } else {
        // Sort by count (default)
        return b[1].length - a[1].length;
      }
    });

    return sortedEntries.map(([username, songs]) => ({
      username,
      songs: sortSongs(songs),
      songCount: songs.length,
    }));
  };

  // Toggle group expand/collapse
  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  // Pagination helpers
  const paginate = (items, page, perPage = itemsPerPage) => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return {
      items: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / perPage),
      currentPage: page,
      totalItems: items.length,
    };
  };

  const renderPagination = (totalPages, currentPage, onPageChange) => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination-wrapper">
        <div className="pagination">
          <button onClick={() => onPageChange(1)} disabled={currentPage === 1}>
            First
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          {pages.map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={currentPage === page ? "active" : ""}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  let paginatedData;
  let groupedData;

  if (groupBy === "artist") {
    groupedData = groupSongsByArtist(filteredSongs);
    paginatedData = paginate(groupedData, currentPage);
  } else if (groupBy === "user") {
    groupedData = groupSongsByUser(filteredSongs);
    paginatedData = paginate(groupedData, currentPage);
  } else {
    // Apply sorting when no grouping
    const sortedSongs = sortSongs(filteredSongs);
    paginatedData = paginate(sortedSongs, currentPage);
  }

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="section-title-group">
          <h3 className="section-title">Public Songs</h3>
          <span className="section-count">
            {filteredSongs.length}
            {(searchTerm || hideMySongs) &&
              ` of ${songs.filter((s) => s.status !== "Released").length}`}
          </span>
        </div>
        <div className="section-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search songs, artists, albums, users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                onPageChange(1);
              }}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  onPageChange(1);
                }}
                className="clear-search"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          {currentUserId && (
            <label className="hide-my-songs-checkbox">
              <input
                type="checkbox"
                checked={hideMySongs}
                onChange={(e) => {
                  setHideMySongs(e.target.checked);
                  onPageChange(1);
                }}
              />
              <span>Hide my songs</span>
            </label>
          )}
          <div className="grouping-controls">
            <div className="group-select-wrapper">
              <label htmlFor="group-select" className="group-select-label">
                Group by:
              </label>
              <select
                id="group-select"
                value={groupBy}
                onChange={(e) => {
                  setGroupBy(e.target.value);
                  onPageChange(1);
                }}
                className="group-select"
              >
                <option value="none">None</option>
                <option value="artist">Artist</option>
                <option value="user">User</option>
              </select>
            </div>
            {groupBy === "artist" && (
              <div className="sort-select-wrapper">
                <label htmlFor="artist-sort-select" className="sort-select-label">
                  Sort:
                </label>
                <select
                  id="artist-sort-select"
                  value={artistSortMode}
                  onChange={(e) => {
                    setArtistSortMode(e.target.value);
                    onPageChange(1);
                  }}
                  className="sort-select"
                >
                  <option value="count">By count</option>
                  <option value="alphabetical">A-Z</option>
                </select>
              </div>
            )}
            {groupBy === "user" && (
              <div className="sort-select-wrapper">
                <label htmlFor="user-sort-select" className="sort-select-label">
                  Sort:
                </label>
                <select
                  id="user-sort-select"
                  value={userSortMode}
                  onChange={(e) => {
                    setUserSortMode(e.target.value);
                    onPageChange(1);
                  }}
                  className="sort-select"
                >
                  <option value="count">By count</option>
                  <option value="alphabetical">A-Z</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-content songs-section">
        {filteredSongs.length === 0 && searchTerm ? (
          <div className="no-search-results">
            <p>No songs found matching "{searchTerm}"</p>
            <p>Try searching for different terms or check the spelling.</p>
          </div>
        ) : groupBy === "artist" ? (
          // Artist-grouped view
          <div className="artists-grouped-view">
            {paginatedData.items.map(
              ({ artist, songs: artistSongs, songCount }) => {
                const isCollapsed = !expandedGroups.has(artist);

                return (
                  <div key={artist} className="artist-group">
                    <div
                      className="artist-header"
                      onClick={() => toggleGroup(artist)}
                    >
                      <div className="artist-info">
                        <span className="collapse-icon">
                          {isCollapsed ? "▶" : "▼"}
                        </span>
                        <div className="artist-image-container">
                          {artistSongs[0]?.artist_image_url ? (
                            <img
                              src={artistSongs[0].artist_image_url}
                              alt={`${artist}`}
                              className="artist-image"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextElementSibling.style.display =
                                  "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="artist-image-placeholder"
                            style={{
                              display: artistSongs[0]?.artist_image_url
                                ? "none"
                                : "flex",
                            }}
                          >
                            🎤
                          </div>
                        </div>
                        <div className="artist-details">
                          <h4 className="artist-name">{artist}</h4>
                          <span className="song-count">
                            ({songCount} song{songCount !== 1 ? "s" : ""})
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="artist-songs">
                        <table className="songs-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th
                                className="sortable-header"
                                onClick={() => handleSort("title")}
                              >
                                Title {renderSortIndicator("title")}
                              </th>
                              <th
                                className="sortable-header"
                                onClick={() => handleSort("owner")}
                              >
                                Owner {renderSortIndicator("owner")}
                              </th>
                              <th
                                className="sortable-header"
                                onClick={() => handleSort("status")}
                              >
                                Status {renderSortIndicator("status")}
                              </th>
                              <th>Updated</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {artistSongs.map((song) => (
                              <PublicSongRow
                                key={song.id}
                                song={song}
                                onCollaborationRequest={onCollaborationRequest}
                                currentUserId={currentUserId}
                                collaborationStatus={collaborationStatusMap.get(song.id) || null}
                                hideArtistColumn={true}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        ) : groupBy === "user" ? (
          // User-grouped view
          <div className="users-grouped-view">
            {paginatedData.items.map(
              ({ username, songs: userSongs, songCount }) => {
                const isCollapsed = !expandedGroups.has(username);

                return (
                  <div key={username} className="user-group-item">
                    <div
                      className="user-header"
                      onClick={() => toggleGroup(username)}
                    >
                      <div className="user-info">
                        <span className="collapse-icon">
                          {isCollapsed ? "▶" : "▼"}
                        </span>
                        <div className="user-image-container">
                          {userSongs[0]?.profile_image_url ? (
                            <img
                              src={userSongs[0].profile_image_url}
                              alt={`${username}`}
                              className="user-image"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextElementSibling.style.display =
                                  "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="user-image-placeholder"
                            style={{
                              display: userSongs[0]?.profile_image_url
                                ? "none"
                                : "flex",
                            }}
                          >
                            👤
                          </div>
                        </div>
                        <div className="user-details">
                          <h4
                            className="user-name"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${username}`);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            {username}
                          </h4>
                          <span className="song-count">
                            ({songCount} song{songCount !== 1 ? "s" : ""})
                          </span>
                        </div>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="user-songs">
                        <table className="songs-table">
                          <thead>
                            <tr>
                              <th></th>
                              <th
                                className="sortable-header"
                                onClick={() => handleSort("title")}
                              >
                                Title {renderSortIndicator("title")}
                              </th>
                              <th
                                className="sortable-header"
                                onClick={() => handleSort("artist")}
                              >
                                Artist {renderSortIndicator("artist")}
                              </th>
                              <th
                                className="sortable-header"
                                onClick={() => handleSort("status")}
                              >
                                Status {renderSortIndicator("status")}
                              </th>
                              <th>Updated</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userSongs.map((song) => (
                              <PublicSongRow
                                key={song.id}
                                song={song}
                                onCollaborationRequest={onCollaborationRequest}
                                currentUserId={currentUserId}
                                collaborationStatus={collaborationStatusMap.get(song.id) || null}
                                hideUserColumn={true}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
        ) : (
          // Table view
          <div className="songs-table-wrapper">
            <table className="songs-table">
              <thead>
                <tr>
                  <th></th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("title")}
                  >
                    Title {renderSortIndicator("title")}
                  </th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("artist")}
                  >
                    Artist {renderSortIndicator("artist")}
                  </th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("owner")}
                  >
                    Owner {renderSortIndicator("owner")}
                  </th>
                  <th
                    className="sortable-header"
                    onClick={() => handleSort("status")}
                  >
                    Status {renderSortIndicator("status")}
                  </th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.items.map((song) => (
                  <PublicSongRow
                    key={song.id}
                    song={song}
                    onCollaborationRequest={onCollaborationRequest}
                    currentUserId={currentUserId}
                    collaborationStatus={collaborationStatusMap.get(song.id) || null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {renderPagination(
          paginatedData.totalPages,
          paginatedData.currentPage,
          onPageChange
        )}
      </div>

      {popupState.isVisible && (
        <UserProfilePopup
          username={popupState.username}
          position={popupState.position}
          onClose={hidePopup}
        />
      )}
    </div>
  );
};

export default PublicSongsTableNew;
