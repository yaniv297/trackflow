import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../utils/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './CommunityWips.css';

const CommunityWips = () => {
  const [wips, setWips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { popupState, handleUsernameClick, handleUsernameHover, hidePopup, delayedHidePopup, cancelHideTimeout } = useUserProfilePopup();

  useEffect(() => {
    fetchRandomWips();
  }, []);

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
        <h2 className="section-title">Community WIPs</h2>
        {wips.length > 0 ? (
          <div className="wips-list">
            {wips.map((wip) => (
              <div key={wip.id} className="wip-item">
                <div className="wip-header">
                  <div className="wip-info">
                    <h4 className="wip-title">{wip.title}</h4>
                    <p className="wip-artist">by {wip.artist}</p>
                  </div>
                  {wip.album_cover && (
                    <img 
                      src={wip.album_cover} 
                      alt="Album Cover"
                      className="wip-cover"
                    />
                  )}
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
                    <span className="time">{formatTimeAgo(wip.updated_at || wip.created_at)}</span>
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
    </section>
  );
};

export default CommunityWips;