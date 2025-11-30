import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import collaborationRequestsService from '../../services/collaborationRequestsService';
import './CollaborationRequestModal.css';

/**
 * Modal for creating collaboration requests
 */
const CollaborationRequestModal = ({ song, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [selectedParts, setSelectedParts] = useState([]);
  const [availableParts, setAvailableParts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [loadingParts, setLoadingParts] = useState(false);

  // Load available parts for WIP songs
  useEffect(() => {
    if (song.status === 'In Progress') {
      loadAvailableParts();
    }
  }, [song]);

  const loadAvailableParts = async () => {
    setLoadingParts(true);
    try {
      const result = await collaborationRequestsService.getAvailableParts(song.id);
      if (result.success) {
        setAvailableParts(result.data.available_parts || []);
      } else {
        console.error('Failed to load available parts:', result.error);
      }
    } catch (err) {
      console.error('Error loading available parts:', err);
    } finally {
      setLoadingParts(false);
    }
  };

  const handlePartToggle = (part) => {
    setSelectedParts(prev => 
      prev.includes(part) 
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please write a message for your collaboration request');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const requestData = {
        songId: song.id,
        message: message.trim()
      };

      // Add requested parts for WIP songs
      if (song.status === 'In Progress' && selectedParts.length > 0) {
        requestData.requestedParts = selectedParts;
      }

      const result = await collaborationRequestsService.createRequest(requestData);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error creating collaboration request:', err);
      setError('Failed to send collaboration request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPartName = (part) => {
    // Convert snake_case to Title Case
    return part
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
      <div className="collaboration-modal">
        <div className="modal-header">
          <h2>🤝 Suggest Collaboration</h2>
          <button 
            onClick={onClose}
            className="close-btn"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        {/* Song Info */}
        <div className="song-info-section">
          <div className="song-details">
            {song.album_cover && (
              <img 
                src={song.album_cover} 
                alt="Album cover"
                className="song-thumbnail"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            )}
            <div 
              className="song-thumbnail placeholder"
              style={{ display: song.album_cover ? 'none' : 'flex' }}
            >
              🎵
            </div>
            <div className="song-text">
              <h3>{song.title}</h3>
              <p className="artist">by {song.artist}</p>
              <p className="album">{song.album} ({song.year})</p>
              <div className="song-status">
                <span className="status-icon">{getStatusIcon(song.status)}</span>
                <span className="status-text">{song.status}</span>
                <span className="owner">by <span 
                  onClick={() => navigate(`/profile/${song.username}`)}
                  style={{ 
                    cursor: 'pointer', 
                    color: '#667eea',
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                  title="Click to view profile"
                >
                  @{song.username}
                </span></span>
              </div>
            </div>
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
              placeholder="Hi! I'd love to collaborate on this song. I have experience with..."
              rows={4}
              disabled={isSubmitting}
              className="message-textarea"
              maxLength={1000}
            />
            <div className="char-count">
              {message.length}/1000
            </div>
          </div>

          {/* Parts Selection for WIP Songs */}
          {song.status === 'In Progress' && (
            <div className="form-group">
              <label>
                Interested Parts
                <span className="optional"> (optional)</span>
              </label>
              
              {loadingParts ? (
                <div className="loading-parts">Loading available parts...</div>
              ) : availableParts.length === 0 ? (
                <div className="no-parts">
                  No available parts for this song. All parts may already be completed.
                </div>
              ) : (
                <>
                  <p className="parts-help">
                    Select which parts you're interested in working on:
                  </p>
                  <div className="parts-grid">
                    {availableParts.map((part) => (
                      <label key={part} className="part-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedParts.includes(part)}
                          onChange={() => handlePartToggle(part)}
                          disabled={isSubmitting}
                        />
                        <span className="part-label">{formatPartName(part)}</span>
                      </label>
                    ))}
                  </div>
                  {selectedParts.length > 0 && (
                    <div className="selected-parts">
                      Selected: {selectedParts.map(formatPartName).join(', ')}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Future Plans Info */}
          {song.status === 'Future Plans' && (
            <div className="info-box">
              <div className="info-icon">💡</div>
              <div>
                <strong>Future Plans Collaboration</strong>
                <p>
                  Since this song is in future plans, if accepted, you'll get full 
                  edit permissions to work on any part of the song.
                </p>
              </div>
            </div>
          )}

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
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollaborationRequestModal;