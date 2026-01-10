import React, { useState, useEffect } from "react";
import { apiGet } from "../../utils/api";
import communityEventsService from "../../services/communityEventsService";
import "./SwapEventSong.css"; // Reuse swap styles

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

/**
 * RemoveEventSong - Removes a song from an event without replacing it
 * Step 1 only: Choose what to do with the current song
 */
const RemoveEventSong = ({ eventId, currentSong, onClose, onSuccess }) => {
  const [destination, setDestination] = useState(null);
  const [destinationPackId, setDestinationPackId] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  const handleSubmit = async () => {
    if (!destination) {
      setError("Please select what to do with your song");
      return;
    }
    if (destination === "another_pack" && !destinationPackId) {
      setError("Please select a pack");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const removeData = {
        destination,
        new_pack_id: destination === "another_pack" ? destinationPackId : null,
      };

      const result = await communityEventsService.removeSongFromEvent(eventId, removeData);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to remove song from event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="swap-modal-overlay" onClick={onClose}>
      <div className="swap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="swap-modal-header">
          <h2>Remove from Event</h2>
          <button className="swap-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="swap-modal-content">
          {loading ? (
            <p className="swap-loading">Loading...</p>
          ) : (
            <>
              {error && <div className="swap-error">{error}</div>}

              <div className="swap-current-song">
                <p className="swap-section-label">What should happen to your song?</p>
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
          )}
        </div>

        <div className="swap-modal-footer">
          <button className="swap-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className={`swap-submit-btn ${destination === "delete" ? "danger" : ""}`}
            onClick={handleSubmit}
            disabled={submitting || !destination || (destination === "another_pack" && !destinationPackId)}
          >
            {submitting ? "Removing..." : "Remove from Event"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveEventSong;

