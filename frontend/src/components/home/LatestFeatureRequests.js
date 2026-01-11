import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiGet, apiPost } from '../../utils/api';
import FeatureRequestVoteButtons from '../shared/FeatureRequestVoteButtons';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './LatestFeatureRequests.css';

const LatestFeatureRequests = ({ limit = 5 }) => {
  const [featureRequests, setFeatureRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { popupState, handleUsernameClick, handleUsernameHover, hidePopup, delayedHidePopup, cancelHideTimeout } = useUserProfilePopup();

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeatureRequests();
    } else {
      setLoading(false);
    }
  }, [limit, isAuthenticated]);

  const fetchFeatureRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch latest feature requests sorted by creation date
      // Filter out completed (is_done) and rejected (is_rejected) requests
      const data = await apiGet(`/feature-requests/?sort_by=newest`);
      const activeRequests = data
        .filter((r) => !r.is_done && !r.is_rejected)
        .slice(0, limit);
      setFeatureRequests(activeRequests);
      
    } catch (error) {
      setFeatureRequests([]);
      setError('Failed to load feature requests');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (requestId, voteType) => {
    try {
      const updated = await apiPost(`/feature-requests/${requestId}/vote`, {
        vote_type: voteType,
      });
      setFeatureRequests((prev) => {
        // If the request is now done/rejected, remove it from the list
        if (updated.is_done || updated.is_rejected) {
          return prev.filter((fr) => fr.id !== requestId);
        }
        // Otherwise, update it
        return prev.map((fr) => (fr.id === requestId ? updated : fr));
      });
    } catch (error) {
      window.showNotification && window.showNotification('Failed to vote. Please try again.', 'error');
    }
  };

  const getNetVotes = (request) => {
    return Math.max(0, request.upvotes - request.downvotes);
  };

  const handleViewAll = () => {
    navigate('/feature-requests');
  };

  const handleLogin = () => {
    navigate('/');
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

  if (!isAuthenticated) {
    return (
      <section className="latest-feature-requests">
        <div className="feature-requests-widget">
          <h2 className="section-title">Latest Feature Requests</h2>
          <div className="login-prompt">
            <div className="login-icon">💡</div>
            <h3>Join the Community</h3>
            <p>Sign in to view and vote on feature requests.</p>
            <button onClick={handleLogin} className="login-btn">
              Sign In →
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="latest-feature-requests">
        <div className="feature-requests-widget">
          <h2 className="section-title">Latest Feature Requests</h2>
          <LoadingSpinner message="Loading requests..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="latest-feature-requests">
        <div className="feature-requests-widget">
          <h2 className="section-title">Latest Feature Requests</h2>
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchFeatureRequests} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="latest-feature-requests">
      <div className="feature-requests-widget">
        <h2 className="section-title">Latest Feature Requests</h2>
        {featureRequests.length > 0 ? (
          <div className="feature-requests-list">
            {featureRequests.map((request) => (
              <div key={request.id} className="feature-request-item">
                <div className="voting-section">
                  <FeatureRequestVoteButtons
                    request={request}
                    onVote={handleVote}
                    getNetVotes={getNetVotes}
                  />
                </div>
                <div className="request-content">
                  <div className="request-header">
                    <span 
                      className="status-icon"
                      style={{ color: '#6c757d' }}
                    >
                      💡
                    </span>
                    <h4 className="request-title">{request.title}</h4>
                  </div>
                  <p className="request-meta">
                    <span className="author">by <span 
                      onClick={handleUsernameClick(request.username)}
                      onMouseEnter={handleUsernameHover(request.username)}
                      onMouseLeave={delayedHidePopup}
                      style={{ 
                        cursor: 'pointer', 
                        color: '#667eea',
                        transition: 'opacity 0.2s ease'
                      }}
                      title="Click to view profile"
                    >
                      {request.username}
                    </span></span>
                    <span className="time">{formatTimeAgo(request.created_at)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💡</div>
            <h3>No Feature Requests Yet</h3>
            <p>Be the first to suggest a new feature!</p>
          </div>
        )}
        
        <div className="section-footer">
          <button onClick={handleViewAll} className="view-all-btn">
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
        onMouseEnter={cancelHideTimeout}
        onMouseLeave={delayedHidePopup}
      />
    </section>
  );
};

export default LatestFeatureRequests;