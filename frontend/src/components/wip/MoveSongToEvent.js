import React, { useState, useEffect, useMemo } from "react";
import { apiGet } from "../../utils/api";
import communityEventsService from "../../services/communityEventsService";
import { useAuth } from "../../contexts/AuthContext";
import "./MoveSongToEvent.css";

const ITEMS_PER_PAGE = 10;

const MoveSongToEvent = ({ eventId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [allSongs, setAllSongs] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchSongs = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        // Fetch all songs and filter to WIP and Future Plans only
        const wipSongs = await apiGet("/songs?status=In Progress");
        const futureSongs = await apiGet("/songs?status=Future Plans");
        
        // Combine and filter:
        // 1. Only songs owned by the current user
        // 2. Exclude community event songs
        const combined = [...(wipSongs || []), ...(futureSongs || [])].filter(
          (song) => 
            song.user_id === user.id && 
            !song.is_community_event
        );
        
        setAllSongs(combined);
      } catch (err) {
        console.error("Error fetching songs:", err);
        setError("Failed to load songs");
      } finally {
        setLoading(false);
      }
    };
    fetchSongs();
  }, [user?.id]);

  // Filter and sort songs alphabetically by title
  const filteredSongs = useMemo(() => {
    let songs = allSongs;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      songs = songs.filter(
        (song) =>
          song.title?.toLowerCase().includes(query) ||
          song.artist?.toLowerCase().includes(query) ||
          song.pack_name?.toLowerCase().includes(query)
      );
    }
    
    // Sort alphabetically by title
    return [...songs].sort((a, b) => 
      (a.title || "").localeCompare(b.title || "")
    );
  }, [allSongs, searchQuery]);

  // Paginate filtered songs
  const paginatedSongs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSongs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSongs, currentPage]);

  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!selectedSongId) {
      setError("Please select a song");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await communityEventsService.addSongToEvent(eventId, {
        song_id: selectedSongId,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to move song to event");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSong = allSongs.find((s) => s.id === selectedSongId);

  return (
    <div className="move-song-modal-overlay" onClick={onClose}>
      <div className="move-song-modal" onClick={(e) => e.stopPropagation()}>
        <div className="move-song-header">
          <h2>Move Existing Song to Event</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="move-song-content">
          {/* Search Bar */}
          <div className="move-song-search-bar">
            <input
              type="text"
              placeholder="Search by title, artist, or pack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="move-song-clear-search" 
                onClick={() => setSearchQuery("")}
              >
                ×
              </button>
            )}
          </div>

          {loading ? (
            <p className="move-song-loading">Loading your songs...</p>
          ) : filteredSongs.length === 0 ? (
            <p className="move-song-empty">
              {searchQuery 
                ? "No songs match your search." 
                : "You don't have any WIP or Future Plans songs to move."}
            </p>
          ) : (
            <>
              {error && <div className="move-song-error">{error}</div>}

              <div className="move-song-count">
                {filteredSongs.length} song{filteredSongs.length !== 1 ? "s" : ""} available
              </div>

              {/* Table-based song list */}
              <div className="move-song-table-container">
                <table className="move-song-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>Cover</th>
                      <th>Title</th>
                      <th>Artist</th>
                      <th>Pack</th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSongs.map((song) => (
                      <tr
                        key={song.id}
                        className={selectedSongId === song.id ? "selected" : ""}
                        onClick={() => setSelectedSongId(song.id)}
                      >
                        <td>
                          {song.album_cover ? (
                            <img
                              src={song.album_cover}
                              alt={song.title}
                              className="move-song-cover"
                            />
                          ) : (
                            <div className="move-song-cover placeholder">🎵</div>
                          )}
                        </td>
                        <td className="move-song-title-cell">{song.title}</td>
                        <td className="move-song-artist-cell">{song.artist}</td>
                        <td className="move-song-pack-cell">{song.pack_name}</td>
                        <td>
                          {selectedSongId === song.id && (
                            <span className="move-song-check">✓</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="move-song-pagination">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    ← Prev
                  </button>
                  <span className="move-song-page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next →
                  </button>
                </div>
              )}

              {selectedSong && (
                <div className="move-song-confirmation">
                  <p>
                    <strong>"{selectedSong.title}"</strong> by {selectedSong.artist}{" "}
                    will be moved to the community event.
                  </p>
                  <p className="move-song-warning">
                    ⚠️ This will remove the song from "{selectedSong.pack_name}".
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="move-song-footer">
          <button className="move-song-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="move-song-submit-btn"
            onClick={handleSubmit}
            disabled={!selectedSongId || submitting}
          >
            {submitting ? "Moving..." : "Move Song"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveSongToEvent;
