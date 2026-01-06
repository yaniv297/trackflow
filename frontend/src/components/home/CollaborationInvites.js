import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import collaborationRequestsService from '../../services/collaborationRequestsService';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './CollaborationInvites.css';

const CollaborationInvites = () => {
  const [batches, setBatches] = useState([]);
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
      
      // Use the batches API to get properly grouped requests
      const result = await collaborationRequestsService.getReceivedBatches();
      
      if (result.success) {
        // Filter to only pending batches
        const pendingBatches = (result.data?.batches || []).filter(b => b.status === 'pending');
        setBatches(pendingBatches);
      } else {
        setBatches([]);
        setError(result.error || 'Failed to load invites');
      }
      
    } catch (error) {
      console.error('Failed to fetch collaboration invites:', error);
      setBatches([]);
      setError('Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  // Handle single request response (for unbatched single-song requests)
  const handleSingleResponse = async (requestId, action) => {
    try {
      setResponding(prev => ({ ...prev, [requestId]: true }));
      
      const result = await collaborationRequestsService.respondToRequest(requestId, {
        response: action === 'accept' ? 'accepted' : 'rejected',
        message: action === 'accept' ? 'Request accepted' : 'Request declined'
      });
      
      if (result.success) {
        // Refresh the list
        await fetchPendingInvites();
        
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

  // Handle batch response (approve all or reject all)
  const handleBatchResponse = async (batchId, action) => {
    try {
      setResponding(prev => ({ ...prev, [`batch_${batchId}`]: true }));
      
      const result = await collaborationRequestsService.respondToBatch(batchId, {
        action: action === 'accept' ? 'approve_all' : 'reject_all',
        responseMessage: action === 'accept' ? 'Requests approved' : 'Requests declined',
        grantFullPackPermissions: false
      });
      
      if (result.success) {
        // Refresh the list
        await fetchPendingInvites();
        
        window.showNotification && window.showNotification(
          action === 'accept' 
            ? `All ${result.data.approved_count} requests approved!`
            : 'All requests declined.', 
          'success'
        );
      } else {
        window.showNotification && window.showNotification(
          result.error || `Failed to process request. Please try again.`, 
          'error'
        );
      }
      
    } catch (error) {
      console.error('Failed to respond to batch:', error);
      window.showNotification && window.showNotification(
        'Failed to process request. Please try again.', 
        'error'
      );
    } finally {
      setResponding(prev => ({ ...prev, [`batch_${batchId}`]: false }));
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

  // Only render when we have confirmed pending batches
  if (loading || error || batches.length === 0) {
    return null;
  }

  // Get total count of songs across all batches
  const totalSongCount = batches.reduce((sum, b) => sum + (b.song_count || 1), 0);

  return (
    <section className="collaboration-invites">
      <div className="collaboration-invites-widget">
        <h2 className="section-title">
          Collaboration Invites
          <span className="invite-count">{totalSongCount}</span>
        </h2>
        
        {!loading && !error && batches.length > 0 && (
          <div className="invites-list">
            {batches.map((batch) => {
              const isSingleSong = batch.song_count === 1;
              const firstSong = batch.songs?.[0];
              // For unbatched single requests, use the first song's request_id
              const singleRequestId = isSingleSong && batch.batch_id === 0 ? firstSong?.request_id : null;
              const isProcessing = responding[singleRequestId] || responding[`batch_${batch.batch_id}`];
              
              return (
                <div key={`batch_${batch.batch_id}_${firstSong?.request_id}`} className={`invite-item ${!isSingleSong ? 'batch-invite' : ''}`}>
                  <div className="invite-content">
                    <div className="invite-header">
                      {isSingleSong ? (
                        // Single song - show album cover
                        <div className="invite-artwork">
                          {firstSong?.song_album_cover ? (
                            <img 
                              src={firstSong.song_album_cover} 
                              alt={`${firstSong.song_title} album cover`}
                              className="invite-album-cover"
                            />
                          ) : (
                            <div className="invite-album-cover-placeholder">
                              <span>♪</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Multi-song batch - show batch icon
                        <div className="invite-artwork batch-artwork">
                          <div className="batch-icon-wrapper">
                            <span className="batch-icon">📦</span>
                            <span className="batch-count">{batch.song_count}</span>
                          </div>
                        </div>
                      )}
                      <div className="invite-song-info">
                        {isSingleSong ? (
                          <>
                            <h4 className="song-title">{firstSong?.song_title}</h4>
                            <p className="song-artist">{firstSong?.song_artist}</p>
                          </>
                        ) : (
                          <>
                            <h4 className="song-title">{batch.song_count} songs requested</h4>
                            {batch.packs_involved?.length > 0 && (
                              <p className="song-artist">
                                From: {batch.packs_involved.map(p => p.pack_name).join(', ')}
                              </p>
                            )}
                          </>
                        )}
                        <span className="time">{formatTimeAgo(batch.created_at)}</span>
                      </div>
                    </div>
                    <p className="invite-meta">
                      <span className="requester">
                        Request from{' '}
                        <span 
                          onClick={handleUsernameClick(batch.requester_username)}
                          style={{ 
                            cursor: 'pointer', 
                            color: '#667eea',
                            transition: 'opacity 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.target.style.opacity = '1'}
                          title="Click to view profile"
                        >
                          {batch.requester_display_name || batch.requester_username}
                        </span>
                      </span>
                    </p>
                    {batch.message && (
                      <p className="invite-message">"{batch.message}"</p>
                    )}
                  </div>
                  
                  {isSingleSong ? (
                    // Single song - show accept/decline buttons
                    <div className="invite-actions">
                      <button 
                        onClick={() => singleRequestId 
                          ? handleSingleResponse(singleRequestId, 'accept')
                          : handleBatchResponse(batch.batch_id, 'accept')
                        }
                        disabled={isProcessing}
                        className="accept-btn"
                      >
                        {isProcessing ? '...' : 'Accept'}
                      </button>
                      <button 
                        onClick={() => singleRequestId
                          ? handleSingleResponse(singleRequestId, 'reject')
                          : handleBatchResponse(batch.batch_id, 'reject')
                        }
                        disabled={isProcessing}
                        className="reject-btn"
                      >
                        {isProcessing ? '...' : 'Decline'}
                      </button>
                    </div>
                  ) : (
                    // Multi-song batch - show quick actions + see details
                    <div className="invite-actions batch-actions">
                      <div className="batch-quick-actions">
                        <button 
                          onClick={() => handleBatchResponse(batch.batch_id, 'accept')}
                          disabled={isProcessing}
                          className="accept-btn"
                          title="Accept all songs in this request"
                        >
                          {isProcessing ? '...' : 'Accept All'}
                        </button>
                        <button 
                          onClick={() => handleBatchResponse(batch.batch_id, 'reject')}
                          disabled={isProcessing}
                          className="reject-btn"
                          title="Decline all songs in this request"
                        >
                          {isProcessing ? '...' : 'Decline All'}
                        </button>
                      </div>
                      <button 
                        onClick={() => navigate('/collaboration-requests')}
                        className="see-details-btn"
                      >
                        See Details →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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
