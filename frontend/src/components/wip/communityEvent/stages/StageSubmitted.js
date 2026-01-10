import React, { useState, useEffect } from "react";

const StageSubmitted = ({ song, onUpdateSubmission, loading }) => {
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

  return (
    <div className="stage-submitted">
      <div className="submitted-badge">🎉 Your song is submitted!</div>
      
      {!isEditing ? (
        <>
          <div className="submission-preview">
            <p>
              <strong>RhythmVerse:</strong>{" "}
              <a
                href={song?.rhythmverse_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {song?.rhythmverse_link}
              </a>
            </p>
            {song?.event_submission_description && (
              <p>
                <strong>Description:</strong> {song.event_submission_description}
              </p>
            )}
            {song?.visualizer_link && (
              <p>
                <strong>Visualizer:</strong>{" "}
                <a
                  href={song.visualizer_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {song.visualizer_link}
                </a>
              </p>
            )}
            {song?.preview_link && (
              <p>
                <strong>Preview:</strong>{" "}
                <a
                  href={song.preview_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {song.preview_link}
                </a>
              </p>
            )}
          </div>
          <button
            className="edit-submission-button"
            onClick={() => setIsEditing(true)}
          >
            ✏️ Edit Submission
          </button>
        </>
      ) : (
        <form className="submission-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="required">RhythmVerse Link</label>
            <input
              type="url"
              value={formData.rhythmverse_link}
              onChange={(e) => handleChange("rhythmverse_link", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.event_submission_description}
              onChange={(e) => handleChange("event_submission_description", e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Visualizer Link</label>
            <input
              type="url"
              value={formData.visualizer_link}
              onChange={(e) => handleChange("visualizer_link", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Preview/Video Link</label>
            <input
              type="url"
              value={formData.preview_link}
              onChange={(e) => handleChange("preview_link", e.target.value)}
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
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default StageSubmitted;

