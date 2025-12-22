import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiGet, publicApiGet } from '../../utils/api';
import API_BASE_URL from '../../config';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './CommunityLeaderboard.css';

const CommunityLeaderboard = ({ limit = 8 }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [currentUserEntry, setCurrentUserEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { popupState, handleUsernameClick, handleUsernameHover, hidePopup, delayedHidePopup, cancelHideTimeout } = useUserProfilePopup();

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
      
      const topUsers = leaderboardData.leaderboard || [];
      setCurrentUserRank(leaderboardData.current_user_rank);
      
      // Check if current user is in top 8
      const currentUserInTop8 = user && topUsers.some(entry => entry.username === user.username);
      
      if (user && !currentUserInTop8 && leaderboardData.current_user_rank && leaderboardData.current_user_rank > 8) {
        // User is not in top 8 - replace 8th spot with current user
        try {
          const fullLeaderboardData = isAuthenticated
            ? await apiGet(`/achievements/leaderboard?limit=1000`)
            : await publicApiGet(`/achievements/leaderboard?limit=1000`);
          
          const userEntry = fullLeaderboardData.leaderboard?.find(entry => entry.username === user.username);
          if (userEntry) {
            setCurrentUserEntry(userEntry);
            // Show top 7 + current user as 8th
            const top7 = topUsers.slice(0, 7);
            setLeaderboard([...top7, userEntry]);
          } else {
            // Fallback: show top 8 if we can't find user entry
            setLeaderboard(topUsers.slice(0, 8));
            setCurrentUserEntry(null);
          }
        } catch (err) {
          console.error('Failed to fetch current user entry:', err);
          // Fallback: show top 8 if fetch fails
          setLeaderboard(topUsers.slice(0, 8));
          setCurrentUserEntry(null);
        }
      } else {
        // User is in top 8 or not logged in - show top 8 normally
        setLeaderboard(topUsers.slice(0, 8));
        setCurrentUserEntry(null);
      }
      
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
    navigate('/');
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
            {leaderboard.map((entry, index) => {
              const isCurrentUser = user && entry.username === user.username;
              const isTopThree = index < 3;
              // Show actual rank if user replaced 8th spot (they're at index 7 and we have currentUserEntry)
              const showActualRank = isCurrentUser && currentUserEntry && index === 7;
              return (
                <LeaderboardItem 
                  key={entry.user_id} 
                  entry={entry} 
                  isTopThree={isTopThree}
                  isCurrentUser={isCurrentUser}
                  showActualRank={showActualRank}
                  getRankIcon={getRankIcon}
                  onUsernameClick={handleUsernameClick}
                  onUsernameHover={handleUsernameHover}
                  onUsernameLeave={delayedHidePopup}
                />
              );
            })}
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
        <div className="section-footer">
          <button 
            onClick={() => navigate('/leaderboard')}
            className="view-full-leaderboard-btn"
          >
            View Full Leaderboard →
          </button>
        </div>
      </div>
      
      {/* User Profile Popup */}
      {popupState.isVisible && (
        <UserProfilePopup
          username={popupState.username}
          isVisible={popupState.isVisible}
          position={popupState.position}
          onClose={hidePopup}
          onMouseEnter={cancelHideTimeout}
          onMouseLeave={delayedHidePopup}
        />
      )}
    </section>
  );
};

const LeaderboardItem = ({ entry, isTopThree, isCurrentUser, showActualRank, getRankIcon, onUsernameClick, onUsernameHover, onUsernameLeave }) => (
  <div className={`leaderboard-item ${isTopThree ? 'top-three' : ''} ${isCurrentUser ? 'current-user' : ''}`}>
    <span className="rank">{showActualRank ? `#${entry.rank}` : getRankIcon(entry.rank)}</span>
    <span 
      className={`username clickable ${isCurrentUser ? 'current-user-name' : ''}`}
      onClick={onUsernameClick(entry.username)}
      onMouseEnter={onUsernameHover(entry.username)}
      onMouseLeave={onUsernameLeave}
      title="Hover for quick info, click to view full profile"
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