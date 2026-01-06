import React, { useState } from 'react';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';

/**
 * Compact row component for displaying public songs in a table format
 */
const PublicSongRow = ({ 
  song, 
  onCollaborationRequest, 
  currentUserId, 
  collaborationStatus = null, 
  hideArtistColumn = false, 
  hideUserColumn = false,
  // Multi-select props
  isSelected = false,
  onSelect = null,
  selectionEnabled = false,
}) => {
  
  // Generate a consistent color for each username based on hash
  const getUsernameColor = (username) => {
    const colors = [
      { bg: '#e74c3c', text: 'white' }, // Red
      { bg: '#3498db', text: 'white' }, // Blue  
      { bg: '#2ecc71', text: 'white' }, // Green
      { bg: '#f39c12', text: 'white' }, // Orange
      { bg: '#9b59b6', text: 'white' }, // Purple
      { bg: '#1abc9c', text: 'white' }, // Teal
      { bg: '#e67e22', text: 'white' }, // Dark Orange
      { bg: '#34495e', text: 'white' }, // Dark Blue Gray
      { bg: '#16a085', text: 'white' }, // Dark Teal
      { bg: '#27ae60', text: 'white' }, // Dark Green
      { bg: '#2980b9', text: 'white' }, // Strong Blue
      { bg: '#8e44ad', text: 'white' }, // Dark Purple
    ];
    
    // Simple hash function for username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      const char = username.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use absolute value and modulo to get color index
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();
  const [showStatusPopup, setShowStatusPopup] = useState(false);

  const canCollaborate = currentUserId && song.user_id !== currentUserId && song.status !== 'Released';
  
  // Selection is available for songs that can be collaborated on and don't have pending/accepted requests
  const canSelect = selectionEnabled && canCollaborate && 
    collaborationStatus !== 'pending' && collaborationStatus !== 'accepted';

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(song, e.target.checked);
    }
  };

  const handleCollaborationClick = () => {
    if (collaborationStatus === 'pending') {
      setShowStatusPopup(true);
    } else {
      onCollaborationRequest(song);
    }
  };

  const getButtonText = () => {
    switch (collaborationStatus) {
      case 'pending':
        return 'Sent';
      case 'accepted':
        return 'Accepted';
      case 'declined':
        return 'Declined';
      default:
        return 'Collaborate';
    }
  };

  const getButtonStyle = () => {
    const baseStyle = {
      border: 'none',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'background-color 0.2s ease',
    };

    switch (collaborationStatus) {
      case 'pending':
        return { ...baseStyle, background: '#f39c12', color: 'white' };
      case 'accepted':
        return { ...baseStyle, background: '#27ae60', color: 'white' };
      case 'declined':
        return { ...baseStyle, background: '#95a5a6', color: 'white', cursor: 'not-allowed' };
      default:
        return { ...baseStyle, background: '#3498db', color: 'white' };
    }
  };

  return (
    <>
      <tr 
        className={`public-song-row ${isSelected ? 'selected' : ''}`}
        style={{
          borderBottom: '1px solid #eee',
          transition: 'background-color 0.2s ease',
          backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8f9fa';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {/* Selection Checkbox */}
        {selectionEnabled && (
          <td style={{ padding: '8px', width: '40px', textAlign: 'center' }}>
            {canSelect ? (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#667eea',
                }}
                title="Select for batch request"
              />
            ) : (
              <span style={{ color: '#ccc', fontSize: '12px' }} title={
                song.user_id === currentUserId ? "Your song" :
                collaborationStatus === 'pending' ? "Request pending" :
                collaborationStatus === 'accepted' ? "Already collaborating" :
                "Cannot select"
              }>
                —
              </span>
            )}
          </td>
        )}

        {/* Album Art */}
        <td style={{ padding: '8px', width: '50px' }}>
          {song.album_cover ? (
            <img
              src={song.album_cover}
              alt="Album cover"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '4px',
                objectFit: 'cover',
                backgroundColor: '#f0f0f0',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#666',
              }}
            >
              🎵
            </div>
          )}
        </td>

        {/* Song Title */}
        <td style={{ padding: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
              {song.title}
            </div>
            {song.album && (
              <div style={{ fontSize: '12px', color: '#888' }}>
                {song.album} {song.year && `(${song.year})`}
              </div>
            )}
          </div>
        </td>

        {/* Artist */}
        {!hideArtistColumn && (
          <td style={{ padding: '8px' }}>
            <div style={{ fontWeight: '500', fontSize: '14px', color: '#495057' }}>
              {song.artist}
            </div>
          </td>
        )}

        {/* Owner */}
        {!hideUserColumn && (
          <td style={{ padding: '8px', width: '120px' }}>
            <span
              onClick={handleUsernameClick(song.username)}
              style={{
                background: getUsernameColor(song.username).bg,
                color: getUsernameColor(song.username).text,
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'inline-block',
              }}
              title="Click to view profile"
            >
              {song.username}
            </span>
          </td>
        )}

        {/* Status */}
        <td style={{ padding: '8px', width: '100px' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              backgroundColor: 
                song.status === 'Future Plans' ? '#e3f2fd' :
                song.status === 'In Progress' ? '#fff3e0' :
                song.status === 'Released' ? '#e8f5e8' : '#f5f5f5',
              color:
                song.status === 'Future Plans' ? '#1976d2' :
                song.status === 'In Progress' ? '#f57c00' :
                song.status === 'Released' ? '#388e3c' : '#666',
            }}
          >
            {song.status}
          </span>
        </td>

        {/* Last Updated */}
        <td style={{ padding: '8px', width: '100px', fontSize: '12px', color: '#666' }}>
          {new Date(song.updated_at).toLocaleDateString()}
        </td>

        {/* Actions */}
        <td style={{ padding: '8px', width: '100px', textAlign: 'center' }}>
          {canCollaborate && (
            <button
              onClick={handleCollaborationClick}
              style={getButtonStyle()}
              disabled={collaborationStatus === 'declined'}
              title={collaborationStatus === 'pending' ? "View collaboration request status" : "Suggest Collaboration"}
            >
              {getButtonText()}
            </button>
          )}
        </td>
      </tr>

      {/* Collaboration Status Popup */}
      {showStatusPopup && collaborationStatus === 'pending' && (
        <tr>
          <td colSpan="7" style={{ padding: 0, position: 'relative' }}>
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }} onClick={() => setShowStatusPopup(false)}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                maxWidth: '400px',
                width: '90%',
                maxHeight: '80vh',
                overflow: 'auto'
              }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e1e5e9'
                }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#333', fontWeight: 600 }}>
                    Collaboration Request
                  </h4>
                  <button 
                    onClick={() => setShowStatusPopup(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      color: '#7f8c8d',
                      padding: '0.25rem',
                      lineHeight: 1,
                      borderRadius: '4px'
                    }}
                  >×</button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <p style={{ margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                    <strong>Song:</strong> {song.title} by {song.artist}
                  </p>
                  <p style={{ margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                    <strong>Status:</strong> Pending
                  </p>
                  <p style={{ margin: 0, lineHeight: 1.5 }}>
                    Your collaboration request has been sent and is waiting for a response from {song.username}.
                  </p>
                </div>
                <div style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid #e1e5e9',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <button 
                    onClick={() => setShowStatusPopup(false)}
                    style={{
                      background: '#3498db',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >Close</button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />
    </>
  );
};

export default PublicSongRow;