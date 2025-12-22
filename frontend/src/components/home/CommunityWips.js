import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../utils/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import { useAuth } from '../../contexts/AuthContext';
import CollaborationRequestModal from '../community/CollaborationRequestModal';
import collaborationRequestsService from '../../services/collaborationRequestsService';
import './CommunityWips.css';

const CommunityWips = () => {
  const [wips, setWips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [collaborationStatusMap, setCollaborationStatusMap] = useState(new Map());
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [statusPopupSong, setStatusPopupSong] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { popupState, handleUsernameClick, handleUsernameHover, hidePopup, delayedHidePopup, cancelHideTimeout } = useUserProfilePopup();

  // Load collaboration status for logged-in users
  const loadCollaborationStatus = useCallback(async () => {
    if (!user?.id) {
      setCollaborationStatusMap(new Map());
      return;
    }

    try {
      const result = await collaborationRequestsService.getSentRequests();
      if (result.success) {
        const statusMap = new Map();
        result.data.forEach(req => {
          statusMap.set(req.song_id, req.status);
        });
        setCollaborationStatusMap(statusMap);
      }
    } catch (error) {
      console.error('Failed to load collaboration requests:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRandomWips();
    loadCollaborationStatus();
  }, [loadCollaborationStatus]);

  const fetchRandomWips = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch public WIPs and randomize them
      const response = await apiGet('/community/public-wips?limit=20');
      const publicWips = response || [];
      
      // Shuffle and take first 5
      const shuffled = publicWips.sort(() => 0.5 - Math.random());
      setWips(shuffled.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch community WIPs:', error);
      setError('Failed to load community WIPs');
      setWips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCommunity = () => {
    navigate('/community');
  };

  // Handle collaboration request
  const handleCollaborationRequest = (wip) => {
    // Convert wip to song format expected by modal
    const song = {
      id: wip.id,
      title: wip.title,
      artist: wip.artist,
      album: wip.album,
      album_cover: wip.album_cover,
      year: wip.year,
      status: wip.status,
      username: wip.author,
      user_id: null // Not available from public-wips endpoint
    };
    setSelectedSong(song);
    setShowCollaborationModal(true);
  };

  // Close collaboration modal
  const handleCloseCollaborationModal = () => {
    setShowCollaborationModal(false);
    setSelectedSong(null);
  };

  // Handle successful collaboration request
  const handleCollaborationSuccess = () => {
    handleCloseCollaborationModal();
    // Refresh collaboration status to show the new request
    loadCollaborationStatus();
  };

  // Check if WIP belongs to current user (by username comparison)
  const isOwnWip = (wip) => {
    return user?.username && wip.author === user.username;
  };

  // Get collaboration status for a WIP
  const getCollaborationStatus = (wip) => {
    return collaborationStatusMap.get(wip.id) || null;
  };

  // Get collaboration button text
  const getCollaborationButtonText = (status) => {
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

  // Get collaboration button class
  const getCollaborationButtonClass = (status) => {
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


  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <section className="community-wips">
        <div className="wips-widget">
          <h2 className="section-title">Community WIPs</h2>
          <LoadingSpinner message="Loading WIPs..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="community-wips">
        <div className="wips-widget">
          <h2 className="section-title">Community WIPs</h2>
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchRandomWips} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="community-wips">
      <div className="wips-widget">
        <div className="section-header">
          <h2 className="section-title">Community WIPs</h2>
          <button 
            onClick={fetchRandomWips}
            className="refresh-btn"
            title="Refresh to see different WIPs"
            disabled={loading}
          >
            <span className="refresh-icon">🔄</span>
          </button>
        </div>
        {wips.length > 0 ? (
          <div className="wips-list">
            {wips.map((wip) => (
              <div key={wip.id} className="wip-item">
                <div className="wip-header">
                  {wip.album_cover && (
                    <img 
                      src={wip.album_cover} 
                      alt="Album Cover"
                      className="wip-cover"
                    />
                  )}
                  <div className="wip-info">
                    <h4 className="wip-title">{wip.title}</h4>
                    <p className="wip-artist">by {wip.artist}</p>
                  </div>
                </div>
                <div className="wip-meta">
                  <div className="wip-details">
                    <span className="author">by <span 
                      onClick={handleUsernameClick(wip.author)}
                      onMouseEnter={handleUsernameHover(wip.author)}
                      onMouseLeave={delayedHidePopup}
                      style={{ 
                        cursor: 'pointer', 
                        color: '#667eea',
                        transition: 'opacity 0.2s ease'
                      }}
                      title="Hover for quick info, click to view full profile"
                    >
                      {wip.author}
                    </span></span>
                    {user && !isOwnWip(wip) && (
                      <button
                        className={getCollaborationButtonClass(getCollaborationStatus(wip))}
                        onClick={() => {
                          const status = getCollaborationStatus(wip);
                          if (status === 'pending') {
                            setStatusPopupSong(wip);
                            setShowStatusPopup(true);
                          } else {
                            handleCollaborationRequest(wip);
                          }
                        }}
                        disabled={getCollaborationStatus(wip) === 'declined'}
                        title={getCollaborationStatus(wip) === 'pending' ? "View collaboration request status" : "Suggest Collaboration"}
                      >
                        {getCollaborationButtonText(getCollaborationStatus(wip))}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No Public WIPs</h3>
            <p>The community hasn't shared any WIPs yet.</p>
          </div>
        )}
        
        <div className="section-footer">
          <button onClick={handleViewCommunity} className="view-all-btn">
            View Community →
          </button>
        </div>
      </div>
      
      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
        onMouseEnter={cancelHideTimeout}
        onMouseLeave={delayedHidePopup}
      />

      {/* Collaboration Request Modal - Rendered via Portal */}
      {showCollaborationModal && selectedSong && typeof document !== 'undefined' && createPortal(
        <CollaborationRequestModal
          song={selectedSong}
          onClose={handleCloseCollaborationModal}
          onSuccess={handleCollaborationSuccess}
        />,
        document.body
      )}

      {/* Collaboration Status Popup - Rendered via Portal */}
      {showStatusPopup && statusPopupSong && typeof document !== 'undefined' && createPortal(
        <div className="status-popup-backdrop" onClick={() => setShowStatusPopup(false)}>
          <div className="status-popup" onClick={(e) => e.stopPropagation()}>
            <div className="status-popup-header">
              <h4>Collaboration Request</h4>
              <button onClick={() => setShowStatusPopup(false)} className="close-btn">×</button>
            </div>
            <div className="status-popup-content">
              <p><strong>Song:</strong> {statusPopupSong.title} by {statusPopupSong.artist}</p>
              <p><strong>Status:</strong> Pending</p>
              <p>Your collaboration request has been sent and is waiting for a response from @{statusPopupSong.author}.</p>
            </div>
            <div className="status-popup-actions">
              <button onClick={() => setShowStatusPopup(false)} className="close-popup-btn">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default CommunityWips;