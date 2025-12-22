import React, { useState } from 'react';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './PublicSongCard.css';

/**
 * Card component for displaying public songs
 */
const PublicSongCard = ({ 
  song, 
  onCollaborationRequest,
  currentUserId,
  collaborationStatus = null
}) => {
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();
  const [showStatusPopup, setShowStatusPopup] = useState(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Future Plans':
        return '#f39c12';
      case 'In Progress':
        return '#3498db';
      case 'Released':
        return '#27ae60';
      default:
        return '#95a5a6';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOwnSong = song.user_id === currentUserId;

  const handleCollaborationClick = () => {
    if (collaborationStatus === 'pending') {
      setShowStatusPopup(true);
    } else {
      onCollaborationRequest(song);
    }
  };


  const getCollaborationButtonText = () => {
    switch (collaborationStatus) {
      case 'pending':
        return 'Request Sent';
      case 'accepted':
        return 'Accepted';
      case 'declined':
        return 'Declined';
      default:
        return 'Collaborate';
    }
  };

  const getCollaborationButtonClass = () => {
    const baseClass = 'collaborate-btn';
    switch (collaborationStatus) {
      case 'pending':
        return `${baseClass} sent`;
      case 'accepted':
        return `${baseClass} accepted`;
      case 'declined':
        return `${baseClass} declined`;
      default:
        return baseClass;
    }
  };

  return (
    <div className="public-song-card">
      {/* Album Cover */}
      <div className="song-cover">
        {song.album_cover ? (
          <img 
            src={song.album_cover} 
            alt={`${song.album} cover`}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className="cover-placeholder"
          style={{ display: song.album_cover ? 'none' : 'flex' }}
        >
          🎵
        </div>
        
        {/* Status Badge */}
        <div 
          className="status-badge"
          style={{ backgroundColor: getStatusColor(song.status) }}
        >
          {getStatusIcon(song.status)}
        </div>
      </div>

      {/* Song Info */}
      <div className="song-info">
        <h4 className="song-title" title={song.title}>
          {song.title}
        </h4>
        <p className="song-artist" title={song.artist}>
          {song.artist}
        </p>
        <p className="song-album" title={song.album}>
          {song.album} ({song.year})
        </p>
        
        {/* User Info */}
        <div className="song-user">
          <span className="user-label">by</span>
          <span 
            className="username" 
            title={song.display_name || song.username}
            onClick={handleUsernameClick(song.username)}
            style={{ 
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#667eea'}
            onMouseLeave={(e) => e.target.style.color = 'inherit'}
          >
            @{song.username}
            {song.display_name && song.display_name !== song.username && (
              <span className="display-name">({song.display_name})</span>
            )}
          </span>
        </div>

        {/* Status */}
        <div className="song-status">
          <span 
            className="status-text"
            style={{ color: getStatusColor(song.status) }}
          >
            {song.status}
          </span>
          <span className="last-updated">
            Updated {formatDate(song.updated_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="song-actions">
        {!isOwnSong && (
          <button 
            className={getCollaborationButtonClass()}
            onClick={handleCollaborationClick}
            title={collaborationStatus === 'pending' ? "View collaboration request status" : "Suggest Collaboration"}
            disabled={collaborationStatus === 'declined'}
          >
            {getCollaborationButtonText()}
          </button>
        )}
        {isOwnSong && (
          <div className="own-song-indicator">
            Your Song
          </div>
        )}
      </div>

      {/* Collaboration Status Popup */}
      {showStatusPopup && collaborationStatus === 'pending' && (
        <div className="status-popup-backdrop" onClick={() => setShowStatusPopup(false)}>
          <div className="status-popup" onClick={(e) => e.stopPropagation()}>
            <div className="status-popup-header">
              <h4>Collaboration Request</h4>
              <button onClick={() => setShowStatusPopup(false)} className="close-btn">×</button>
            </div>
            <div className="status-popup-content">
              <p><strong>Song:</strong> {song.title} by {song.artist}</p>
              <p><strong>Status:</strong> Pending</p>
              <p>Your collaboration request has been sent and is waiting for a response from @{song.username}.</p>
            </div>
            <div className="status-popup-actions">
              <button onClick={() => setShowStatusPopup(false)} className="close-popup-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />
    </div>
  );
};

export default PublicSongCard;