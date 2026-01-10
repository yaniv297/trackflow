import React, { useState } from "react";

const StageCompleted = ({ 
  song,
  onSubmit, 
  loading,
  onGoBackToEditing,
  onSwapSong,
  onRemoveSong,
  rvReleaseTime,
}) => {
  const [formData, setFormData] = useState({
    rhythmverse_link: "",
    event_submission_description: "",
    visualizer_link: "",
    preview_link: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
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

  return (
    <div className="stage-completed">
      <div className="completion-message">
        ✅ All workflow steps complete!
      </div>
      
      {/* Song info */}
      {song && (
        <div className="completed-song-info">
          <strong>{song.title}</strong> by {song.artist}
        </div>
      )}

      <p className="stage-subtitle">
        Submit your song to complete your participation.
      </p>

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
          <label>Description (optional)</label>
          <textarea
            value={formData.event_submission_description}
            onChange={(e) => handleChange("event_submission_description", e.target.value)}
            placeholder="Tell us about your song..."
            rows={3}
          />
        </div>
        <div className="form-group">
          <label>Visualizer Link (optional)</label>
          <input
            type="url"
            value={formData.visualizer_link}
            onChange={(e) => handleChange("visualizer_link", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="form-group">
          <label>Preview/Video Link (optional)</label>
          <input
            type="url"
            value={formData.preview_link}
            onChange={(e) => handleChange("preview_link", e.target.value)}
            placeholder="https://..."
          />
        </div>
        <button
          type="submit"
          className="submit-button"
          disabled={loading || !formData.rhythmverse_link}
        >
          {loading ? "Submitting..." : "🚀 Submit Song"}
        </button>
      </form>

      {/* Go back options */}
      <div className="stage-completed-actions">
        <p className="actions-label">Need to make changes?</p>
        <div className="action-buttons">
          <button 
            type="button"
            className="action-button secondary"
            onClick={onGoBackToEditing}
          >
            ← Back to Editing
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

export default StageCompleted;

