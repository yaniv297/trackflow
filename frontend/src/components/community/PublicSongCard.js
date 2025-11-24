import React from 'react';
import './PublicSongCard.css';

/**
 * Card component for displaying public songs
 */
const PublicSongCard = ({ 
  song, 
  onCollaborationRequest,
  currentUserId 
}) => {
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

  const handleCollaborationClick = () => {
    onCollaborationRequest(song);
  };

  const isOwnSong = song.user_id === currentUserId;

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
          <span className="username" title={song.display_name || song.username}>
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
            className="collaborate-btn"
            onClick={handleCollaborationClick}
            title="Suggest Collaboration"
          >
            🤝 Collaborate
          </button>
        )}
        {isOwnSong && (
          <div className="own-song-indicator">
            Your Song
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicSongCard;