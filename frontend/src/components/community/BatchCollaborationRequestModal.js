import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import collaborationRequestsService from '../../services/collaborationRequestsService';
import './CollaborationRequestModal.css';

/**
 * Modal for creating batch collaboration requests (multiple songs, same owner)
 */
const BatchCollaborationRequestModal = ({ songs, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Get unique owner info from songs
  const ownerUsername = songs[0]?.username;
  const ownerDisplayName = songs[0]?.display_name;

  // Group songs by pack for display
  const songsByPack = songs.reduce((acc, song) => {
    const packKey = song.pack_name || 'No Pack';
    if (!acc[packKey]) {
      acc[packKey] = [];
    }
    acc[packKey].push(song);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please write a message for your collaboration request');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const songIds = songs.map(s => s.id);
      const result = await collaborationRequestsService.createBatchRequest({
        songIds,
        message: message.trim()
      });

      if (result.success) {
        onSuccess(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error creating batch collaboration request:', err);
      setError('Failed to send collaboration request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Future Plans':
        return '📅';
      case 'In Progress':
        return '🚧';
      case 'Released':
        return '✅';
      default:
        return '🎵';
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="collaboration-modal batch-modal">
        <div className="modal-header">
          <h2>🤝 Request Collaboration</h2>
          <button 
            onClick={onClose}
            className="close-btn"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        {/* Target User Info */}
        <div className="batch-target-info">
          <span className="target-label">Requesting collaboration from</span>
          <span 
            className="target-username"
            onClick={() => navigate(`/profile/${ownerUsername}`)}
            title="Click to view profile"
          >
            @{ownerUsername}
          </span>
          {ownerDisplayName && ownerDisplayName !== ownerUsername && (
            <span className="target-display-name">({ownerDisplayName})</span>
          )}
        </div>

        {/* Songs List */}
        <div className="batch-songs-section">
          <div className="batch-songs-header">
            <span className="songs-count">{songs.length} songs selected</span>
          </div>
          
          <div className="batch-songs-list">
            {Object.entries(songsByPack).map(([packName, packSongs]) => (
              <div key={packName} className="pack-group">
                {packName !== 'No Pack' && (
                  <div className="pack-header">
                    <span className="pack-icon">📁</span>
                    <span className="pack-name">{packName}</span>
                    <span className="pack-count">({packSongs.length})</span>
                  </div>
                )}
                <div className="pack-songs">
                  {packSongs.map(song => (
                    <div key={song.id} className="batch-song-item">
                      <div className="song-cover">
                        {song.album_cover ? (
                          <img 
                            src={song.album_cover} 
                            alt=""
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="cover-placeholder">🎵</span>
                        )}
                      </div>
                      <div className="song-info">
                        <span className="song-title">{song.title}</span>
                        <span className="song-artist">{song.artist}</span>
                      </div>
                      <span className={`song-status status-${song.status?.replace(' ', '-').toLowerCase()}`}>
                        {getStatusIcon(song.status)} {song.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Message */}
          <div className="form-group">
            <label htmlFor="message">
              Your Message <span className="required">*</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${ownerUsername}! I'd love to collaborate on these songs. I have experience with...`}
              rows={4}
              disabled={isSubmitting}
              className="message-textarea"
              maxLength={2000}
            />
            <div className="char-count">
              {message.length}/2000
            </div>
          </div>

          {/* Info Box */}
          <div className="info-box">
            <div className="info-icon">💡</div>
            <div>
              <strong>Batch Request</strong>
              <p>
                This will send a single request for all {songs.length} songs. 
                {ownerUsername} can approve or reject all songs at once, or choose 
                to approve specific songs individually.
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? 'Sending...' : `Send Request (${songs.length} songs)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BatchCollaborationRequestModal;

