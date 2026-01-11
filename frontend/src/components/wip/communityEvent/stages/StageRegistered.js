import React, { useState } from "react";

const StageRegistered = ({ 
  onAddNewSong, 
  onMoveExistingSong, 
  onUnregister, 
  loading,
  setError 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ artist: "", title: "" });
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.artist.trim() || !formData.title.trim()) {
      setError("Please fill in both artist and title");
      return;
    }

    setAdding(true);
    try {
      await onAddNewSong(formData.artist, formData.title);
      setFormData({ artist: "", title: "" });
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Failed to add song. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ artist: "", title: "" });
    setError(null);
  };

  return (
    <div className="stage-registered">
      <div className="registered-badge">
        ✅ You're planning to participate!
      </div>
      <div className="add-song-section">
        <h4>Add Your Song</h4>

        {!showForm ? (
          <div className="add-song-buttons">
            <button
              className="add-song-button"
              onClick={() => setShowForm(true)}
              disabled={loading}
            >
              ➕ Create New Song
            </button>
            <button
              className="add-song-button"
              onClick={onMoveExistingSong}
              disabled={loading}
            >
              📦 Use Existing Song
            </button>
          </div>
        ) : (
          <form className="inline-add-song-form" onSubmit={handleSubmit}>
            <div className="inline-form-row">
              <input
                type="text"
                placeholder="Artist"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                autoFocus
              />
              <input
                type="text"
                placeholder="Song Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="inline-form-actions">
              <button type="button" className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={adding || !formData.artist.trim() || !formData.title.trim()}
              >
                {adding ? "Adding..." : "Add Song"}
              </button>
            </div>
          </form>
        )}
      </div>
      <span className="unregister-link" onClick={onUnregister}>
        Changed my mind
      </span>
    </div>
  );
};

export default StageRegistered;

