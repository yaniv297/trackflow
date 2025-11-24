import React from 'react';
import PublicSongRow from './PublicSongRow';

/**
 * Compact table view for displaying public songs
 */
const PublicSongsTable = ({ songs, onCollaborationRequest, currentUserId }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table 
        style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: '#f8f9fa',
              borderBottom: '2px solid #dee2e6',
            }}
          >
            <th style={{ 
              padding: '12px 8px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: '600',
              color: '#495057',
              width: '50px'
            }}>
              Cover
            </th>
            <th style={{ 
              padding: '12px 8px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: '600',
              color: '#495057'
            }}>
              Song
            </th>
            <th style={{ 
              padding: '12px 8px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: '600',
              color: '#495057',
              width: '120px'
            }}>
              Owner
            </th>
            <th style={{ 
              padding: '12px 8px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: '600',
              color: '#495057',
              width: '100px'
            }}>
              Status
            </th>
            <th style={{ 
              padding: '12px 8px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: '600',
              color: '#495057',
              width: '100px'
            }}>
              Updated
            </th>
            <th style={{ 
              padding: '12px 8px', 
              textAlign: 'center', 
              fontSize: '12px', 
              fontWeight: '600',
              color: '#495057',
              width: '100px'
            }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {songs.map((song) => (
            <PublicSongRow
              key={`${song.id}-${song.updated_at}`}
              song={song}
              onCollaborationRequest={onCollaborationRequest}
              currentUserId={currentUserId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PublicSongsTable;