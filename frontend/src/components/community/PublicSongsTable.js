import React from 'react';
import PublicSongRow from './PublicSongRow';

/**
 * Compact table view for displaying public songs
 */
const PublicSongsTable = ({ songs, onCollaborationRequest, currentUserId, onSort, sortConfig }) => {
  
  const getSortIcon = (field) => {
    if (sortConfig?.field !== field) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleHeaderClick = (field) => {
    if (onSort) {
      const direction = sortConfig?.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
      onSort(field, direction);
    }
  };

  const headerStyle = {
    padding: '12px 8px', 
    textAlign: 'left', 
    fontSize: '12px', 
    fontWeight: '600',
    color: '#495057',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '2px solid #dee2e6',
  };

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
            }}
          >
            <th style={{ 
              ...headerStyle,
              width: '50px',
              cursor: 'default'
            }}>
              Cover
            </th>
            <th style={{ 
              ...headerStyle,
              width: '25%'
            }} onClick={() => handleHeaderClick('title')}>
              Song {getSortIcon('title')}
            </th>
            <th style={{ 
              ...headerStyle,
              width: '25%'
            }} onClick={() => handleHeaderClick('artist')}>
              Artist {getSortIcon('artist')}
            </th>
            <th style={{ 
              ...headerStyle,
              width: '120px'
            }} onClick={() => handleHeaderClick('username')}>
              Owner {getSortIcon('username')}
            </th>
            <th style={{ 
              ...headerStyle,
              width: '100px'
            }} onClick={() => handleHeaderClick('status')}>
              Status {getSortIcon('status')}
            </th>
            <th style={{ 
              ...headerStyle,
              width: '100px'
            }} onClick={() => handleHeaderClick('updated_at')}>
              Updated {getSortIcon('updated_at')}
            </th>
            <th style={{ 
              ...headerStyle,
              textAlign: 'center',
              width: '100px',
              cursor: 'default'
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