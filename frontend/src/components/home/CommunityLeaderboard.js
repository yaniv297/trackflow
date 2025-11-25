import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiGet, publicApiGet } from '../../utils/api';
import API_BASE_URL from '../../config';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './CommunityLeaderboard.css';

const CommunityLeaderboard = ({ limit = 10 }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  useEffect(() => {
    fetchLeaderboard();
  }, [limit, isAuthenticated]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use public API when not authenticated, authenticated API when logged in
      const leaderboardData = isAuthenticated 
        ? await apiGet(`/achievements/leaderboard?limit=${limit}`)
        : await publicApiGet(`/achievements/leaderboard?limit=${limit}`);
      setLeaderboard(leaderboardData.leaderboard || []);
      
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLeaderboard([]);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '♥';
    if (rank === 2) return '♠';
    if (rank === 3) return '♦';
    return `#${rank}`;
  };

  const handleJoinCommunity = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <section className="community-leaderboard">
        <h2 className="section-title">Community Leaderboard</h2>
        <div className="leaderboard-widget">
          <LoadingSpinner message="Loading leaderboard..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="community-leaderboard">
        <h2 className="section-title">Community Leaderboard</h2>
        <div className="leaderboard-widget">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchLeaderboard} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="community-leaderboard">
      <h2 className="section-title">Community Leaderboard</h2>
      <div className="leaderboard-widget">
        {leaderboard.length > 0 ? (
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <LeaderboardItem 
                key={entry.user_id} 
                entry={entry} 
                isTopThree={index < 3}
                getRankIcon={getRankIcon}
                onUsernameClick={handleUsernameClick}
              />
            ))}
          </div>
        ) : (
          <EmptyLeaderboard />
        )}
        {!isAuthenticated && (
          <div className="section-footer">
            <button 
              onClick={handleJoinCommunity}
              className="join-community-btn"
            >
              Join the Community →
            </button>
          </div>
        )}
      </div>
      
      {/* User Profile Popup */}
      {popupState.isVisible && (
        <UserProfilePopup
          username={popupState.username}
          isVisible={popupState.isVisible}
          position={popupState.position}
          onClose={hidePopup}
        />
      )}
    </section>
  );
};

const LeaderboardItem = ({ entry, isTopThree, getRankIcon, onUsernameClick }) => (
  <div className={`leaderboard-item ${isTopThree ? 'top-three' : ''}`}>
    <span className="rank">{getRankIcon(entry.rank)}</span>
    <span 
      className="username clickable" 
      onClick={onUsernameClick(entry.username)}
      title="Click to view profile"
    >
      {entry.username}
    </span>
    <span className="points">{entry.total_points} pts</span>
  </div>
);

const EmptyLeaderboard = () => (
  <div className="empty-state">
    <div className="empty-icon">★</div>
    <h3>Leaderboard Coming Soon!</h3>
    <p>Be among the first to join and climb the ranks.</p>
  </div>
);

export default CommunityLeaderboard;