import React, { useState, useEffect } from "react";

const StageSubmitted = ({ 
  song, 
  onUpdateSubmission, 
  loading,
  onBackToEditing,
  onSwapSong,
  onRemoveSong,
  rvReleaseTime,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    rhythmverse_link: "",
    event_submission_description: "",
    visualizer_link: "",
    preview_link: "",
  });

  // Populate form when song changes
  useEffect(() => {
    if (song) {
      setFormData({
        rhythmverse_link: song.rhythmverse_link || "",
        event_submission_description: song.event_submission_description || "",
        visualizer_link: song.visualizer_link || "",
        preview_link: song.preview_link || "",
      });
    }
  }, [song]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await onUpdateSubmission(formData);
    if (success) {
      setIsEditing(false);
    }
  };

  // Format the RV release time for display
  const formatReleaseTime = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (isEditing) {
    return (
      <div className="stage-submitted">
        <div className="submitted-badge">✏️ Edit Submission</div>

        {/* Song Card */}
        {song && (
          <div className="submitted-song-card">
            {song.album_cover ? (
              <img 
                src={song.album_cover} 
                alt={song.title} 
                className="submitted-song-cover"
              />
            ) : (
              <div className="submitted-song-cover placeholder">🎵</div>
            )}
            <div className="submitted-song-details">
              <h4>{song.title}</h4>
              <p>{song.artist}</p>
              {song.album && <p className="album-name">{song.album}</p>}
            </div>
          </div>
        )}

        {/* RV Release Time Notice */}
        {rvReleaseTime && (
          <div className="rv-release-notice">
            📅 <strong>Important:</strong> Schedule your song on RhythmVerse for release at{" "}
            <strong>{formatReleaseTime(rvReleaseTime)} CET</strong> (RhythmVerse server time).
          </div>
        )}

        <form className="submission-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="required">RhythmVerse Link</label>
            <input
              type="url"
              value={formData.rhythmverse_link}
              onChange={(e) => handleChange("rhythmverse_link", e.target.value)}
              placeholder="https://rhythmverse.co/..."
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.event_submission_description}
              onChange={(e) => handleChange("event_submission_description", e.target.value)}
              placeholder="Tell us about your song..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Visualizer Link</label>
            <input
              type="url"
              value={formData.visualizer_link}
              onChange={(e) => handleChange("visualizer_link", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="form-group">
            <label>Preview/Video Link</label>
            <input
              type="url"
              value={formData.preview_link}
              onChange={(e) => handleChange("preview_link", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="action-button"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={loading || !formData.rhythmverse_link}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* Additional Actions */}
        <div className="stage-completed-actions">
          <p className="actions-label">Other options</p>
          <div className="action-buttons">
            <button 
              type="button"
              className="action-button secondary"
              onClick={onBackToEditing}
            >
              ← Back to Authoring
            </button>
            <button 
              type="button"
              className="action-button"
              onClick={onSwapSong}
            >
              🔄 Swap Song
            </button>
            <button 
              type="button"
              className="action-button danger"
              onClick={onRemoveSong}
            >
              🗑️ Remove from Event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stage-submitted">
      <div className="submitted-badge">🎉 Your song is submitted!</div>

      {/* Song Card with Full Details */}
      {song && (
        <div className="submitted-song-card">
          {song.album_cover ? (
            <img 
              src={song.album_cover} 
              alt={song.title} 
              className="submitted-song-cover"
            />
          ) : (
            <div className="submitted-song-cover placeholder">🎵</div>
          )}
          <div className="submitted-song-details">
            <h4>{song.title}</h4>
            <p>{song.artist}</p>
            {song.album && <p className="album-name">{song.album}</p>}
          </div>
        </div>
      )}

      {/* Submission Details */}
      <div className="submission-details">
        <div className="submission-detail-row">
          <span className="detail-label">🔗 RhythmVerse:</span>
          {song?.rhythmverse_link ? (
            <a
              href={song.rhythmverse_link}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link"
            >
              {song.rhythmverse_link}
            </a>
          ) : (
            <span className="detail-empty">Not set</span>
          )}
        </div>

        {song?.event_submission_description && (
          <div className="submission-detail-row">
            <span className="detail-label">📝 Description:</span>
            <span className="detail-value">{song.event_submission_description}</span>
          </div>
        )}

        {song?.visualizer_link && (
          <div className="submission-detail-row">
            <span className="detail-label">🎬 Visualizer:</span>
            <a
              href={song.visualizer_link}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link"
            >
              {song.visualizer_link}
            </a>
          </div>
        )}

        {song?.preview_link && (
          <div className="submission-detail-row">
            <span className="detail-label">▶️ Preview:</span>
            <a
              href={song.preview_link}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link"
            >
              {song.preview_link}
            </a>
          </div>
        )}
      </div>

      {/* Primary Action */}
      <button
        className="edit-submission-button primary"
        onClick={() => setIsEditing(true)}
      >
        ✏️ Edit Submission Details
      </button>

      {/* Additional Actions */}
      <div className="stage-completed-actions">
        <p className="actions-label">Need to make changes?</p>
        <div className="action-buttons">
          <button 
            type="button"
            className="action-button secondary"
            onClick={onBackToEditing}
          >
            ← Back to Authoring
          </button>
          <button 
            type="button"
            className="action-button"
            onClick={onSwapSong}
          >
            🔄 Swap Song
          </button>
          <button 
            type="button"
            className="action-button danger"
            onClick={onRemoveSong}
          >
            🗑️ Remove from Event
          </button>
        </div>
      </div>
    </div>
  );
};

export default StageSubmitted;
