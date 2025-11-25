import React from 'react';
import PublicSongRow from './PublicSongRow';
import './ArtistGroup.css';

const ArtistGroup = ({ 
  artist, 
  songs, 
  isExpanded, 
  onToggle, 
  onCollaborationRequest, 
  currentUserId 
}) => {
  // Get artist image from one of the songs (album cover as fallback)
  const artistImage = songs[0]?.album_cover;
  const songCount = songs.length;

  return (
    <div className="artist-group">
      <div className="artist-header" onClick={onToggle}>
        <div className="artist-info">
          <div className="artist-image-container">
            {artistImage ? (
              <img 
                src={artistImage} 
                alt={`${artist}`}
                className="artist-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className="artist-image-placeholder" 
              style={{ display: artistImage ? 'none' : 'flex' }}
            >
              🎵
            </div>
          </div>
          <div className="artist-details">
            <h3 className="artist-name">{artist}</h3>
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
        <div className="artist-songs">
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
                  <th style={{ padding: '8px', width: '30%', fontSize: '12px', color: '#666', textAlign: 'left' }}>Song</th>
                  <th style={{ padding: '8px', width: '120px', fontSize: '12px', color: '#666', textAlign: 'left' }}>Owner</th>
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
                    hideArtistColumn={true}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistGroup;