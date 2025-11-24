import React from 'react';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';

/**
 * Compact row component for displaying public songs in a table format
 */
const PublicSongRow = ({ song, onCollaborationRequest, currentUserId }) => {
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  const canCollaborate = currentUserId && song.user_id !== currentUserId && song.status !== 'Released';

  return (
    <>
      <tr 
        className="public-song-row"
        style={{
          borderBottom: '1px solid #eee',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
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

        {/* Song Info */}
        <td style={{ padding: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
              {song.title}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              by {song.artist}
            </div>
            {song.album && (
              <div style={{ fontSize: '12px', color: '#888' }}>
                {song.album} {song.year && `(${song.year})`}
              </div>
            )}
          </div>
        </td>

        {/* Owner */}
        <td style={{ padding: '8px', width: '120px' }}>
          <span
            onClick={handleUsernameClick(song.username)}
            style={{
              background: '#3498db',
              color: 'white',
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
              onClick={() => onCollaborationRequest(song)}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Collaborate
            </button>
          )}
        </td>
      </tr>

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