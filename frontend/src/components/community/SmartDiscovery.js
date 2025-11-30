import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import publicSongsService from '../../services/publicSongsService';
import './SmartDiscovery.css';

/**
 * Smart Discovery component that shows shared connections with other users
 */
const SmartDiscovery = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSharedConnections();
  }, []);

  const loadSharedConnections = async () => {
    setIsLoading(true);
    setError(null);

    const result = await publicSongsService.getSharedConnections();
    
    if (result.success) {
      setConnections(result.data);
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="smart-discovery">
        <h3>🔍 Your Musical Connections</h3>
        <div className="smart-discovery-loading">Loading connections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="smart-discovery">
        <h3>🔍 Your Musical Connections</h3>
        <div className="smart-discovery-error">
          Unable to load connections: {error}
        </div>
      </div>
    );
  }

  const hasSharedSongs = connections?.shared_songs?.length > 0;
  const hasSharedArtists = connections?.shared_artists?.length > 0;

  if (!hasSharedSongs && !hasSharedArtists) {
    return (
      <div className="smart-discovery">
        <h3>🔍 Your Musical Connections</h3>
        <div className="smart-discovery-empty">
          <p>No musical connections found yet.</p>
          <p>Add songs to your collection to discover users with similar musical interests!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="smart-discovery">
      <h3>🔍 Your Musical Connections</h3>
      <div className="smart-discovery-content">
        
        {hasSharedSongs && (
          <div className="shared-section">
            <h4>🎵 Shared Songs</h4>
            <div className="shared-items">
              {connections.shared_songs.slice(0, 3).map((item, index) => (
                <div key={index} className="shared-item">
                  <div className="shared-song">
                    <strong>{item.title}</strong> by {item.artist}
                  </div>
                  <div className="shared-user">
                    with <span 
                      onClick={() => navigate(`/profile/${item.username}`)}
                      style={{ 
                        cursor: 'pointer', 
                        color: '#667eea',
                        transition: 'opacity 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                      title="Click to view profile"
                    >
                      @{item.username}
                    </span>
                  </div>
                </div>
              ))}
              {connections.shared_songs.length > 3 && (
                <div className="shared-more">
                  +{connections.shared_songs.length - 3} more songs
                </div>
              )}
            </div>
          </div>
        )}

        {hasSharedArtists && (
          <div className="shared-section">
            <h4>🎤 Shared Artists</h4>
            <div className="shared-items">
              {connections.shared_artists.slice(0, 3).map((item, index) => (
                <div key={index} className="shared-item">
                  <div className="shared-artist">
                    <strong>{item.artist}</strong> 
                    <span className="song-count">({item.song_count} songs)</span>
                  </div>
                  <div className="shared-user">
                    with <span 
                      onClick={() => navigate(`/profile/${item.username}`)}
                      style={{ 
                        cursor: 'pointer', 
                        color: '#667eea',
                        transition: 'opacity 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.target.style.opacity = '1'}
                      title="Click to view profile"
                    >
                      @{item.username}
                    </span>
                  </div>
                </div>
              ))}
              {connections.shared_artists.length > 3 && (
                <div className="shared-more">
                  +{connections.shared_artists.length - 3} more artists
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SmartDiscovery;