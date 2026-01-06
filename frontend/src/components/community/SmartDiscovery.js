import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import publicSongsService from '../../services/publicSongsService';
import collaborationRequestsService from '../../services/collaborationRequestsService';
import CollaborationRequestModal from './CollaborationRequestModal';
import ArtistConnectionModal from './ArtistConnectionModal';
import './SmartDiscovery.css';

/**
 * Smart Discovery component that shows shared connections with other users
 */
const SmartDiscovery = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSongs, setExpandedSongs] = useState(false);
  const [expandedArtists, setExpandedArtists] = useState(false);
  const [expandedIndividualArtists, setExpandedIndividualArtists] = useState(new Set());
  const [selectedSongForCollaboration, setSelectedSongForCollaboration] = useState(null);
  const [collaborationStatuses, setCollaborationStatuses] = useState({});
  const [selectedArtistConnection, setSelectedArtistConnection] = useState(null);

  useEffect(() => {
    loadSharedConnections();
  }, []);

  // Check collaboration status for songs
  useEffect(() => {
    if (connections?.shared_songs) {
      checkCollaborationStatuses();
    }
  }, [connections]);

  const checkCollaborationStatuses = async () => {
    try {
      const result = await collaborationRequestsService.getSentRequests();
      if (result.success) {
        const statusMap = {};
        result.data.forEach(req => {
          statusMap[req.song_id] = req.status;
        });
        setCollaborationStatuses(statusMap);
      }
    } catch (error) {
      console.error('Failed to check collaboration statuses:', error);
    }
  };

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

  const handleCollaborationRequest = (item) => {
    // Create a song object for the modal - include all fields needed
    const song = {
      id: item.song_id,
      title: item.title,
      artist: item.artist,
      status: item.status,
      album_cover: item.album_cover,
      username: item.username, // Required for modal display
      album: item.album || null,
      year: item.year || null
    };
    setSelectedSongForCollaboration(song);
  };

  const handleCollaborationSuccess = () => {
    setSelectedSongForCollaboration(null);
    checkCollaborationStatuses(); // Refresh statuses
  };

  const toggleIndividualArtist = (artistKey) => {
    const newExpanded = new Set(expandedIndividualArtists);
    if (newExpanded.has(artistKey)) {
      newExpanded.delete(artistKey);
    } else {
      newExpanded.add(artistKey);
    }
    setExpandedIndividualArtists(newExpanded);
  };

  const getCollaborationButtonText = (songId) => {
    const status = collaborationStatuses[songId];
    switch (status) {
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

  const getCollaborationButtonClass = (songId) => {
    const status = collaborationStatuses[songId];
    const baseClass = 'collaborate-btn';
    switch (status) {
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

  if (isLoading) {
    return (
      <div className="smart-discovery">
        <div className="smart-discovery-header">
          <h3>🔍 Your Musical Connections</h3>
        </div>
        <div className="smart-discovery-content">
          <div className="smart-discovery-loading">Loading connections...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="smart-discovery">
        <div className="smart-discovery-header">
          <h3>🔍 Your Musical Connections</h3>
        </div>
        <div className="smart-discovery-content">
          <div className="smart-discovery-error">
            Unable to load connections: {error}
          </div>
        </div>
      </div>
    );
  }

  const hasSharedSongs = connections?.shared_songs?.filter(song => collaborationStatuses[song.song_id] !== 'accepted').length > 0;
  const hasSharedArtists = connections?.shared_artists?.length > 0;

  if (!hasSharedSongs && !hasSharedArtists) {
    return (
      <div className="smart-discovery">
        <div className="smart-discovery-header">
          <h3>🔍 Your Musical Connections</h3>
        </div>
        <div className="smart-discovery-content">
          <div className="smart-discovery-empty">
            <p>No musical connections found yet.</p>
            <p>Add songs to your collection to discover users with similar musical interests!</p>
          </div>
        </div>
      </div>
    );
  }

  const displayedSongs = expandedSongs 
    ? connections.shared_songs.filter(song => collaborationStatuses[song.song_id] !== 'accepted')
    : connections.shared_songs.filter(song => collaborationStatuses[song.song_id] !== 'accepted').slice(0, 3);
  
  const displayedArtists = expandedArtists
    ? connections.shared_artists
    : connections.shared_artists.slice(0, 3);

  return (
    <div className="smart-discovery">
      <div className="smart-discovery-header">
        <h3>🔍 Your Musical Connections</h3>
      </div>
      <div className="smart-discovery-content">
        
        {hasSharedSongs && (
          <div className="shared-section">
            <h4>Shared Songs</h4>
            <div className="shared-items">
              {displayedSongs.map((item, index) => (
                <div key={`${item.song_id}-${item.username}-${index}`} className="shared-item">
                  <div className="shared-item-content">
                    {item.album_cover ? (
                      <img 
                        src={item.album_cover} 
                        alt={`${item.artist} - ${item.title} cover`}
                        className="shared-song-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const placeholder = e.target.parentElement.querySelector('.shared-song-cover.placeholder');
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="shared-item-info">
                      <div className="shared-song">
                        <strong>{item.title}</strong> by {item.artist}
                        {item.status && (
                          <span className="song-status-badge"> • {item.status}</span>
                        )}
                      </div>
                      <div className="shared-user">
                        with <span 
                          onClick={() => navigate(`/profile/${item.username}`)}
                          className="username-link"
                          title="Click to view profile"
                        >
                          {item.username}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCollaborationRequest(item)}
                    className={getCollaborationButtonClass(item.song_id)}
                    disabled={collaborationStatuses[item.song_id] === 'pending' || 
                             collaborationStatuses[item.song_id] === 'accepted'}
                    title={collaborationStatuses[item.song_id] === 'pending' 
                      ? 'Collaboration request pending' 
                      : collaborationStatuses[item.song_id] === 'accepted'
                      ? 'Collaboration accepted'
                      : 'Request collaboration on this song'}
                  >
                    {getCollaborationButtonText(item.song_id)}
                  </button>
                </div>
              ))}
              {connections.shared_songs.filter(song => collaborationStatuses[song.song_id] !== 'accepted').length > 3 && (
                <button
                  onClick={() => setExpandedSongs(!expandedSongs)}
                  className="expand-button"
                >
                  {expandedSongs 
                    ? 'Show Less' 
                    : `+${connections.shared_songs.filter(song => collaborationStatuses[song.song_id] !== 'accepted').length - 3} more songs`}
                </button>
              )}
            </div>
          </div>
        )}

        {hasSharedArtists && (
          <div className="shared-section">
            <h4>Shared Artists</h4>
            <div className="shared-items">
              {displayedArtists.map((item, index) => {
                const artistKey = `${item.artist}-${item.username}-${index}`;
                const isExpanded = selectedArtistConnection && 
                  selectedArtistConnection.artist === item.artist && 
                  selectedArtistConnection.username === item.username;
                
                return (
                  <div key={artistKey} className="artist-card-wrapper">
                    <div 
                      className="shared-item shared-artist-card"
                      onClick={() => {
                        if (isExpanded) {
                          setSelectedArtistConnection(null);
                        } else {
                          setSelectedArtistConnection({
                            artist: item.artist,
                            username: item.username,
                            artistImageUrl: item.artist_image_url
                          });
                        }
                      }}
                      title={isExpanded ? "Click to collapse" : "Click to see all songs from this artist"}
                    >
                      <div className="shared-item-content">
                        {item.artist_image_url && (
                          <img 
                            src={item.artist_image_url} 
                            alt={`${item.artist}`}
                            className="shared-song-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="shared-item-info">
                          <div className="shared-artist">
                            <strong>{item.artist}</strong>
                          </div>
                          <div className="artist-breakdown">
                            <div className="breakdown-item">
                              {item.my_songs_count || 0} by you
                            </div>
                            <div className="breakdown-item">
                              {item.song_count} by <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/profile/${item.username}`);
                                }}
                                className="username-link"
                                title="Click to view profile"
                              >
                                {item.username}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="view-details-icon" title={isExpanded ? "Collapse" : "View details"}>
                        {isExpanded ? '▲' : '→'}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="expanded-artist-detail">
                        <ArtistConnectionModal
                          artist={item.artist}
                          username={item.username}
                          artistImageUrl={item.artist_image_url}
                          onClose={() => setSelectedArtistConnection(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {connections.shared_artists.length > 3 && (
                <button
                  onClick={() => setExpandedArtists(!expandedArtists)}
                  className="expand-button"
                >
                  {expandedArtists 
                    ? 'Show Less' 
                    : `+${connections.shared_artists.length - 3} more artists`}
                </button>
              )}
            </div>
          </div>
        )}

      </div>
      
      {selectedSongForCollaboration && (
        <CollaborationRequestModal
          song={selectedSongForCollaboration}
          onClose={() => setSelectedSongForCollaboration(null)}
          onSuccess={handleCollaborationSuccess}
        />
      )}
    </div>
  );
};

export default SmartDiscovery;
