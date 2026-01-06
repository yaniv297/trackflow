import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import publicSongsService from '../../services/publicSongsService';
import collaborationRequestsService from '../../services/collaborationRequestsService';
import CollaborationRequestModal from './CollaborationRequestModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import './ArtistConnectionModal.css';

/**
 * Inline expandable component showing detailed song comparison for a shared artist between two users
 */
const ArtistConnectionModal = ({ artist, username, artistImageUrl, onClose }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSongForCollaboration, setSelectedSongForCollaboration] = useState(null);
  const [collaborationStatuses, setCollaborationStatuses] = useState({});
  const [activeTab, setActiveTab] = useState('shared'); // 'shared', 'mine', 'theirs'

  useEffect(() => {
    loadArtistDetails();
    loadCollaborationStatuses();
  }, [artist, username]);

  const loadArtistDetails = async () => {
    setIsLoading(true);
    setError(null);

    const result = await publicSongsService.getArtistConnectionDetails(artist, username);
    
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  const loadCollaborationStatuses = async () => {
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
      console.error('Failed to load collaboration statuses:', error);
    }
  };

  const handleCollaborationRequest = (song) => {
    setSelectedSongForCollaboration({
      id: song.song_id,
      title: song.title,
      artist: artist,
      status: song.status,
      album_cover: song.album_cover,
      username: username,
      album: song.album,
      year: song.year
    });
  };

  const handleCollaborationSuccess = () => {
    setSelectedSongForCollaboration(null);
    loadCollaborationStatuses();
  };

  const getCollaborationButtonText = (songId) => {
    const status = collaborationStatuses[songId];
    switch (status) {
      case 'pending': return 'Request Sent';
      case 'accepted': return 'Accepted';
      case 'declined': return 'Declined';
      default: return 'Collaborate';
    }
  };

  const getCollaborationButtonClass = (songId) => {
    const status = collaborationStatuses[songId];
    switch (status) {
      case 'pending': return 'collab-btn sent';
      case 'accepted': return 'collab-btn accepted';
      case 'declined': return 'collab-btn declined';
      default: return 'collab-btn';
    }
  };

  // Filter out released songs and separate them
  const filterReleasedSongs = (songs) => {
    const released = songs.filter(s => s.status === 'Released');
    const notReleased = songs.filter(s => s.status !== 'Released');
    return { released, notReleased };
  };

  // Get songs for the active tab
  const getDisplayedSongs = () => {
    if (!data) return { left: [], right: [], myReleased: 0, theirReleased: 0 };
    
    const mySongsFiltered = filterReleasedSongs(data.my_songs);
    const theirSongsFiltered = filterReleasedSongs(data.their_songs);
    
    switch (activeTab) {
      case 'shared':
        const myShared = mySongsFiltered.notReleased.filter(s => s.is_shared);
        const theirShared = theirSongsFiltered.notReleased.filter(s => s.is_shared);
        return {
          left: myShared,
          right: theirShared,
          myReleased: mySongsFiltered.released.filter(s => s.is_shared).length,
          theirReleased: theirSongsFiltered.released.filter(s => s.is_shared).length
        };
      case 'mine':
        return {
          left: mySongsFiltered.notReleased,
          right: [],
          myReleased: mySongsFiltered.released.length,
          theirReleased: 0
        };
      case 'theirs':
        return {
          left: [],
          right: theirSongsFiltered.notReleased,
          myReleased: 0,
          theirReleased: theirSongsFiltered.released.length
        };
      default:
        return { left: [], right: [], myReleased: 0, theirReleased: 0 };
    }
  };

  const renderSongItem = (song, isTheirs = false) => (
    <div key={song.song_id} className={`song-item ${song.is_shared ? 'shared' : ''}`}>
      <div className="song-item-main">
        {song.album_cover && (
          <img 
            src={song.album_cover} 
            alt={song.title}
            className="song-cover"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <div className="song-details">
          <div className="song-title-container">
            <div className="song-title">
              {song.title}
              {song.is_shared && <span className="shared-badge" title="You both have this song">⭐</span>}
            </div>
            {song.album && <div className="song-album">{song.album}</div>}
          </div>
        </div>
        {song.status && <span className="song-status">{song.status}</span>}
      </div>
      {isTheirs && (
        <button
          onClick={() => handleCollaborationRequest(song)}
          className={getCollaborationButtonClass(song.song_id)}
          disabled={collaborationStatuses[song.song_id] === 'pending' || 
                   collaborationStatuses[song.song_id] === 'accepted'}
        >
          {getCollaborationButtonText(song.song_id)}
        </button>
      )}
    </div>
  );

  const displayedSongs = getDisplayedSongs();

  return (
    <>
      <div className="artist-connection-inline">
        {/* Header */}
        <div className="artist-connection-header">
          <div className="header-content">
            {(data?.artist_image_url || artistImageUrl) && (
              <img 
                src={data?.artist_image_url || artistImageUrl} 
                alt={artist}
                className="artist-image"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="header-text">
              <h3>{artist}</h3>
              <p>
                Comparing with{' '}
                <span 
                  className="username-link"
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${username}`);
                  }}
                >
                  {username}
                </span>
              </p>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div className="artist-connection-content">
            {isLoading && (
              <div className="loading-state">
                <LoadingSpinner />
                <p>Loading song comparison...</p>
              </div>
            )}

            {error && (
              <div className="error-state">
                <p>Failed to load: {error}</p>
                <button onClick={loadArtistDetails}>Retry</button>
              </div>
            )}

            {!isLoading && !error && data && (
              <>
                {/* Tabs */}
                <div className="tabs">
                  <button 
                    className={`tab ${activeTab === 'shared' ? 'active' : ''}`}
                    onClick={() => setActiveTab('shared')}
                  >
                    Shared ({data.stats.shared_count})
                  </button>
                  <button 
                    className={`tab ${activeTab === 'mine' ? 'active' : ''}`}
                    onClick={() => setActiveTab('mine')}
                  >
                    Your Songs ({data.stats.my_total})
                  </button>
                  <button 
                    className={`tab ${activeTab === 'theirs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('theirs')}
                  >
                    {username}'s Songs ({data.stats.their_total})
                  </button>
                </div>

                {/* Song Comparison */}
                <div className="songs-comparison">
                  {activeTab === 'shared' && (
                    <>
                      {(displayedSongs.myReleased > 0 || displayedSongs.theirReleased > 0) && (
                        <div className="released-summary">
                          {displayedSongs.myReleased > 0 && displayedSongs.theirReleased > 0 && (
                            <>You both have {displayedSongs.myReleased} and {displayedSongs.theirReleased} released shared song{displayedSongs.myReleased + displayedSongs.theirReleased !== 2 ? 's' : ''} respectively.</>
                          )}
                          {displayedSongs.myReleased > 0 && displayedSongs.theirReleased === 0 && (
                            <>You have {displayedSongs.myReleased} released shared song{displayedSongs.myReleased !== 1 ? 's' : ''}.</>
                          )}
                          {displayedSongs.myReleased === 0 && displayedSongs.theirReleased > 0 && (
                            <>{username} has {displayedSongs.theirReleased} released shared song{displayedSongs.theirReleased !== 1 ? 's' : ''}.</>
                          )}
                        </div>
                      )}
                      {displayedSongs.left.length === 0 && displayedSongs.right.length === 0 ? (
                        <div className="empty-state">
                          <p>No shared non-released songs yet! You both have songs by {artist}, but different ones.</p>
                          <p className="hint">Check out each other's collections using the tabs above.</p>
                        </div>
                      ) : (
                        <div className="shared-songs-grid">
                          <div className="column yours">
                            <h4>Your Version</h4>
                            <div className="songs-list">
                              {displayedSongs.left.map(song => renderSongItem(song, false))}
                            </div>
                          </div>
                          <div className="column theirs">
                            <h4>{username}'s Version</h4>
                            <div className="songs-list">
                              {displayedSongs.right.map(song => renderSongItem(song, true))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'mine' && (
                    <div className="two-column-layout">
                      {displayedSongs.myReleased > 0 && (
                        <div className="released-summary">
                          You have {displayedSongs.myReleased} released song{displayedSongs.myReleased !== 1 ? 's' : ''} by {artist}.
                        </div>
                      )}
                      {displayedSongs.left.length === 0 ? (
                        <div className="empty-state">
                          <p>You don't have any non-released songs by {artist} in your collection.</p>
                        </div>
                      ) : (
                        <div className="songs-list">
                          {displayedSongs.left.map(song => renderSongItem(song, false))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'theirs' && (
                    <div className="two-column-layout">
                      {displayedSongs.theirReleased > 0 && (
                        <div className="released-summary">
                          {username} has {displayedSongs.theirReleased} released song{displayedSongs.theirReleased !== 1 ? 's' : ''} by {artist}.
                        </div>
                      )}
                      {displayedSongs.right.length === 0 ? (
                        <div className="empty-state">
                          <p>{username} doesn't have any public non-released songs by {artist}.</p>
                        </div>
                      ) : (
                        <div className="songs-list">
                          {displayedSongs.right.map(song => renderSongItem(song, true))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
      </div>

      {/* Collaboration Modal */}
      {selectedSongForCollaboration && (
        <CollaborationRequestModal
          song={selectedSongForCollaboration}
          onClose={() => setSelectedSongForCollaboration(null)}
          onSuccess={handleCollaborationSuccess}
        />
      )}
    </>
  );
};

export default ArtistConnectionModal;

