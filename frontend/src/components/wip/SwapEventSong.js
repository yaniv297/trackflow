import React, { useState, useEffect, useMemo } from "react";
import { apiGet } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import communityEventsService from "../../services/communityEventsService";
import "./SwapEventSong.css";
import "./MoveSongToEvent.css";

const DESTINATION_OPTIONS = [
  {
    id: "another_pack",
    label: "Move to Another Pack",
    description: "Transfer to one of your existing packs",
    icon: "📦",
  },
  {
    id: "delete",
    label: "Delete Song",
    description: "Permanently remove the song",
    icon: "🗑️",
    danger: true,
  },
];

const NEW_SONG_OPTIONS = [
  {
    id: "create_new",
    label: "Create New Song",
    description: "Start fresh with a new song",
    icon: "✨",
  },
  {
    id: "use_existing",
    label: "Use Existing Song",
    description: "Choose from your WIP or Future Plans",
    icon: "📋",
  },
];

const ITEMS_PER_PAGE = 10;

/**
 * SwapEventSong - 3-step process to swap a song in an event
 * Step 1: What to do with current song (move/delete)
 * Step 2: How to add new song (create new / use existing)
 * Step 3a: If create new - show inline form
 * Step 3b: If use existing - show song picker table
 */
const SwapEventSong = ({ eventId, currentSong, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Step 1 state
  const [destination, setDestination] = useState(null);
  const [destinationPackId, setDestinationPackId] = useState(null);
  const [packs, setPacks] = useState([]);
  
  // Step 2 state
  const [newSongMode, setNewSongMode] = useState(null); // 'create_new' or 'use_existing'
  
  // Step 3a state (create new)
  const [newSongData, setNewSongData] = useState({ title: "", artist: "" });
  
  // Step 3b state (use existing - song picker)
  const [allSongs, setAllSongs] = useState([]);
  const [selectedSongId, setSelectedSongId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [songsLoading, setSongsLoading] = useState(false);
  
  // General state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch packs on mount
  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const data = await apiGet("/packs");
        const regularPacks = (data || []).filter((p) => !p.is_community_event);
        setPacks(regularPacks);
      } catch (err) {
        console.error("Error fetching packs:", err);
        setError("Failed to load packs");
      } finally {
        setLoading(false);
      }
    };
    fetchPacks();
  }, []);

  // Fetch songs when entering step 3 with "use existing"
  useEffect(() => {
    if (step === 3 && newSongMode === "use_existing" && user?.id) {
      const fetchSongs = async () => {
        setSongsLoading(true);
        try {
          const wipSongs = await apiGet("/songs?status=In Progress");
          const futureSongs = await apiGet("/songs?status=Future Plans");
          
          const combined = [...(wipSongs || []), ...(futureSongs || [])].filter(
            (song) => 
              song.user_id === user.id && 
              !song.pack?.is_community_event
          );
          
          setAllSongs(combined);
        } catch (err) {
          console.error("Error fetching songs:", err);
          setError("Failed to load songs");
        } finally {
          setSongsLoading(false);
        }
      };
      fetchSongs();
    }
  }, [step, newSongMode, user?.id]);

  // Filter and sort songs
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
    
    return [...songs].sort((a, b) => 
      (a.title || "").localeCompare(b.title || "")
    );
  }, [allSongs, searchQuery]);

  // Paginate songs
  const paginatedSongs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSongs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSongs, currentPage]);

  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleStep1Continue = () => {
    if (!destination) {
      setError("Please select what to do with your current song");
      return;
    }
    if (destination === "another_pack" && !destinationPackId) {
      setError("Please select a pack to move your current song to");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleStep2Continue = () => {
    if (!newSongMode) {
      setError("Please select how to add your new song");
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (newSongMode === "create_new") {
      if (!newSongData.title || !newSongData.artist) {
        setError("Title and artist are required");
        return;
      }
    } else {
      if (!selectedSongId) {
        setError("Please select a song");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const swapData = {
        old_song_destination: destination,
        old_song_new_pack_id: destination === "another_pack" ? destinationPackId : null,
      };

      if (newSongMode === "create_new") {
        swapData.title = newSongData.title;
        swapData.artist = newSongData.artist;
      } else {
        swapData.new_song_id = selectedSongId;
      }

      const result = await communityEventsService.swapEventSong(eventId, swapData);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to swap song");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <>
      <div className="swap-current-song">
        <p className="swap-section-label">What should happen to your current song?</p>
        <div className="swap-current-song-card">
          {currentSong?.album_cover ? (
            <img src={currentSong.album_cover} alt={currentSong.title} className="swap-song-cover" />
          ) : (
            <div className="swap-song-cover placeholder">🎵</div>
          )}
          <div className="swap-song-info">
            <strong>{currentSong?.title}</strong>
            <span>{currentSong?.artist}</span>
          </div>
        </div>
      </div>

      <div className="swap-destination-options">
        {DESTINATION_OPTIONS.map((opt) => (
          <div
            key={opt.id}
            className={`swap-destination-option ${destination === opt.id ? "selected" : ""} ${opt.danger ? "danger" : ""}`}
            onClick={() => setDestination(opt.id)}
          >
            <span className="swap-option-icon">{opt.icon}</span>
            <div className="swap-option-text">
              <strong>{opt.label}</strong>
              <span>{opt.description}</span>
            </div>
            {destination === opt.id && <span className="swap-check">✓</span>}
          </div>
        ))}
      </div>

      {destination === "another_pack" && (
        <div className="swap-form-group">
          <label>Select destination pack</label>
          <select
            value={destinationPackId || ""}
            onChange={(e) => setDestinationPackId(Number(e.target.value) || null)}
          >
            <option value="">Choose a pack...</option>
            {packs.map((pack) => (
              <option key={pack.id} value={pack.id}>{pack.name}</option>
            ))}
          </select>
        </div>
      )}

      {destination === "delete" && (
        <div className="swap-delete-warning">
          ⚠️ This action cannot be undone. Your song and all its progress will be permanently deleted.
        </div>
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <p className="swap-section-label">How would you like to add your new song?</p>
      
      <div className="swap-destination-options">
        {NEW_SONG_OPTIONS.map((opt) => (
          <div
            key={opt.id}
            className={`swap-destination-option ${newSongMode === opt.id ? "selected" : ""}`}
            onClick={() => setNewSongMode(opt.id)}
          >
            <span className="swap-option-icon">{opt.icon}</span>
            <div className="swap-option-text">
              <strong>{opt.label}</strong>
              <span>{opt.description}</span>
            </div>
            {newSongMode === opt.id && <span className="swap-check">✓</span>}
          </div>
        ))}
      </div>
    </>
  );

  const renderStep3CreateNew = () => (
    <>
      <p className="swap-section-label">Create your new song</p>
      
      <div className="swap-new-song-form">
        <div className="swap-form-group">
          <label>Title *</label>
          <input
            type="text"
            value={newSongData.title}
            onChange={(e) => setNewSongData({ ...newSongData, title: e.target.value })}
            placeholder="Song title"
            autoFocus
          />
        </div>
        <div className="swap-form-group">
          <label>Artist *</label>
          <input
            type="text"
            value={newSongData.artist}
            onChange={(e) => setNewSongData({ ...newSongData, artist: e.target.value })}
            placeholder="Artist name"
          />
        </div>
      </div>
    </>
  );

  const renderStep3UseExisting = () => (
    <>
      <p className="swap-section-label">Choose a song from your WIP or Future Plans</p>

      {/* Search Bar */}
      <div className="move-song-search-bar">
        <input
          type="text"
          placeholder="Search by title, artist, or pack..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="move-song-clear-search" onClick={() => setSearchQuery("")}>×</button>
        )}
      </div>

      {songsLoading ? (
        <p className="move-song-loading-text">Loading your songs...</p>
      ) : filteredSongs.length === 0 ? (
        <p className="move-song-empty-text">
          {searchQuery ? "No songs match your search." : "You don't have any WIP or Future Plans songs."}
        </p>
      ) : (
        <>
          <div className="move-song-songs-count">
            {filteredSongs.length} song{filteredSongs.length !== 1 ? "s" : ""} available
          </div>

          <div className="move-song-table-container">
            <table className="move-song-table">
              <thead>
                <tr>
                  <th className="move-song-table-header cover-col"></th>
                  <th className="move-song-table-header title-col">Title</th>
                  <th className="move-song-table-header artist-col">Artist</th>
                  <th className="move-song-table-header pack-col">Pack</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSongs.map((song) => (
                  <tr
                    key={song.id}
                    className={`move-song-table-row ${selectedSongId === song.id ? "selected" : ""}`}
                    onClick={() => setSelectedSongId(song.id)}
                  >
                    <td className="move-song-table-cell cover-col">
                      {song.album_cover ? (
                        <img src={song.album_cover} alt={song.title} className="move-song-cover" />
                      ) : (
                        <div className="move-song-cover placeholder">🎵</div>
                      )}
                    </td>
                    <td className="move-song-table-cell title-col">{song.title}</td>
                    <td className="move-song-table-cell artist-col">{song.artist}</td>
                    <td className="move-song-table-cell pack-col">{song.pack_name}</td>
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
        </>
      )}
    </>
  );

  const isStep3Valid = newSongMode === "create_new" 
    ? (newSongData.title && newSongData.artist)
    : selectedSongId;

  return (
    <div className="swap-modal-overlay" onClick={onClose}>
      <div className={`swap-modal ${step === 3 && newSongMode === "use_existing" ? "large" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="swap-modal-header">
          <h2>Swap Event Song</h2>
          <button className="swap-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="swap-modal-content">
          {loading ? (
            <p className="swap-loading">Loading...</p>
          ) : (
            <>
              {error && <div className="swap-error">{error}</div>}

              <div className="swap-steps">
                <span className={`swap-step ${step >= 1 ? "active" : ""}`}>1</span>
                <span className={`swap-step-line ${step >= 2 ? "active" : ""}`} />
                <span className={`swap-step ${step >= 2 ? "active" : ""}`}>2</span>
                <span className={`swap-step-line ${step >= 3 ? "active" : ""}`} />
                <span className={`swap-step ${step >= 3 ? "active" : ""}`}>3</span>
              </div>

              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && newSongMode === "create_new" && renderStep3CreateNew()}
              {step === 3 && newSongMode === "use_existing" && renderStep3UseExisting()}
            </>
          )}
        </div>

        <div className="swap-modal-footer">
          {step > 1 && (
            <button className="swap-back-btn" onClick={() => setStep(step - 1)}>← Back</button>
          )}
          <button className="swap-cancel-btn" onClick={onClose}>Cancel</button>
          
          {step === 1 && (
            <button
              className="swap-continue-btn"
              onClick={handleStep1Continue}
              disabled={!destination || (destination === "another_pack" && !destinationPackId)}
            >
              Continue →
            </button>
          )}
          
          {step === 2 && (
            <button
              className="swap-continue-btn"
              onClick={handleStep2Continue}
              disabled={!newSongMode}
            >
              Continue →
            </button>
          )}
          
          {step === 3 && (
            <button
              className="swap-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !isStep3Valid}
            >
              {submitting ? "Swapping..." : "Swap Song"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapEventSong;
