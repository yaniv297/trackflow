import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import collaborationRequestsService from '../../services/collaborationRequestsService';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './CollaborationInvites.css';

const CollaborationInvites = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responding, setResponding] = useState({});
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  useEffect(() => {
    if (isAuthenticated) {
      fetchPendingInvites();
    }
  }, [isAuthenticated]);

  const fetchPendingInvites = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await collaborationRequestsService.getReceivedRequests('pending');
      
      if (result.success) {
        setInvites(result.data || []);
      } else {
        setInvites([]);
        setError(result.error || 'Failed to load invites');
      }
      
    } catch (error) {
      console.error('Failed to fetch collaboration invites:', error);
      setInvites([]);
      setError('Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, action, response = '') => {
    try {
      setResponding(prev => ({ ...prev, [requestId]: true }));
      
      const result = await collaborationRequestsService.respondToRequest(requestId, {
        response: action === 'accept' ? 'accepted' : 'rejected',
        message: response || (action === 'accept' ? 'Request accepted' : 'Request declined')
      });
      
      if (result.success) {
        // Remove the invite from the list since it's no longer pending
        setInvites(prev => prev.filter(invite => invite.id !== requestId));
        
        window.showNotification && window.showNotification(
          `Collaboration request ${action}ed successfully!`, 
          'success'
        );
      } else {
        window.showNotification && window.showNotification(
          result.error || `Failed to ${action} request. Please try again.`, 
          'error'
        );
      }
      
    } catch (error) {
      console.error(`Failed to ${action} collaboration request:`, error);
      window.showNotification && window.showNotification(
        `Failed to ${action} request. Please try again.`, 
        'error'
      );
    } finally {
      setResponding(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Only render when we have confirmed pending invites
  if (loading || error || invites.length === 0) {
    return null;
  }

  return (
    <section className="collaboration-invites">
      <div className="collaboration-invites-widget">
        <h2 className="section-title">Collaboration Invites</h2>
        
        {!loading && !error && invites.length > 0 && (
          <div className="invites-list">
            {invites.map((invite) => (
              <div key={invite.id} className="invite-item">
                <div className="invite-content">
                  <div className="invite-header">
                    <div className="invite-artwork">
                      {invite.song_album_cover ? (
                        <img 
                          src={invite.song_album_cover} 
                          alt={`${invite.song_title} album cover`}
                          className="invite-album-cover"
                        />
                      ) : (
                        <div className="invite-album-cover-placeholder">
                          <span>♪</span>
                        </div>
                      )}
                    </div>
                    <div className="invite-song-info">
                      <h4 className="song-title">{invite.song_title}</h4>
                      <span className="time">{formatTimeAgo(invite.created_at)}</span>
                    </div>
                  </div>
                  <p className="invite-meta">
                    <span className="requester">
                      Request from{' '}
                      <span 
                        onClick={handleUsernameClick(invite.requester_username)}
                        style={{ 
                          cursor: 'pointer', 
                          color: '#667eea',
                          transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                        title="Click to view profile"
                      >
                        {invite.requester_display_name || invite.requester_username}
                      </span>
                    </span>
                  </p>
                  {invite.message && (
                    <p className="invite-message">"{invite.message}"</p>
                  )}
                </div>
                <div className="invite-actions">
                  <button 
                    onClick={() => handleResponse(invite.id, 'accept')}
                    disabled={responding[invite.id]}
                    className="accept-btn"
                  >
                    {responding[invite.id] ? '...' : 'Accept'}
                  </button>
                  <button 
                    onClick={() => handleResponse(invite.id, 'reject')}
                    disabled={responding[invite.id]}
                    className="reject-btn"
                  >
                    {responding[invite.id] ? '...' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="section-footer">
          <button onClick={() => navigate('/collaboration-requests')} className="view-all-btn">
            View All Requests →
          </button>
        </div>
      </div>
      
      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />
    </section>
  );
};

export default CollaborationInvites;