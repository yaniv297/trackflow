import React from 'react';
import PublicSongRow from './PublicSongRow';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './UserGroup.css';

const UserGroup = ({ 
  user, 
  songs, 
  isExpanded, 
  onToggle, 
  onCollaborationRequest, 
  currentUserId 
}) => {
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();
  
  // Get user info from the first song
  const userData = songs[0];
  const username = userData?.username;
  const displayName = userData?.display_name;
  const profileImage = userData?.profile_image_url;
  const songCount = songs.length;

  const handleHeaderClick = (e) => {
    // If clicking on the username, handle profile navigation
    if (e.target.closest('.clickable-username')) {
      e.stopPropagation();
      return;
    }
    // Otherwise, handle group toggle
    onToggle();
  };

  return (
    <div className="user-group">
      <div className="user-header" onClick={handleHeaderClick}>
        <div className="user-info">
          <div className="user-image-container">
            {profileImage ? (
              <img 
                src={profileImage} 
                alt={`${username}`}
                className="user-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="user-image-placeholder" 
              style={{ display: profileImage ? 'none' : 'flex' }}
            >
              👤
            </div>
          </div>
          <div className="user-details">
            <h3 className="user-name">
              <span 
                className="clickable-username"
                onClick={handleUsernameClick(username)}
                title="Click to view profile"
              >
                {displayName || username}
              </span>
              {displayName && displayName !== username && (
                <span className="username-subtitle">@{username}</span>
              )}
            </h3>
            <span className="song-count">
              {songCount} song{songCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="expand-indicator">
          <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
            ▶
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="user-songs">
          <div className="songs-table-container">
            <table 
              style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '8px', width: '50px', fontSize: '12px', color: '#666' }}>Cover</th>
                  <th style={{ padding: '8px', width: '25%', fontSize: '12px', color: '#666', textAlign: 'left' }}>Song</th>
                  <th style={{ padding: '8px', width: '25%', fontSize: '12px', color: '#666', textAlign: 'left' }}>Artist</th>
                  <th style={{ padding: '8px', width: '100px', fontSize: '12px', color: '#666', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '8px', width: '100px', fontSize: '12px', color: '#666', textAlign: 'left' }}>Updated</th>
                  <th style={{ padding: '8px', width: '100px', fontSize: '12px', color: '#666', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((song) => (
                  <PublicSongRow
                    key={`${song.id}-${song.updated_at}`}
                    song={song}
                    onCollaborationRequest={onCollaborationRequest}
                    currentUserId={currentUserId}
                    hideUserColumn={true}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* User Profile Popup */}
      {popupState.isVisible && (
        <UserProfilePopup
          username={popupState.username}
          isVisible={popupState.isVisible}
          position={popupState.position}
          onClose={hidePopup}
        />
      )}
    </div>
  );
};

export default UserGroup;