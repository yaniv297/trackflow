import React, { useState, useEffect } from 'react';
import { apiGet } from '../utils/api';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet('/achievements/leaderboard?limit=50');
      setLeaderboard(data.leaderboard);
      setCurrentUserRank(data.current_user_rank);
      setTotalUsers(data.total_users);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchLeaderboard} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1>🏆 Achievement Leaderboard</h1>
        <div className="leaderboard-stats">
          <span className="total-users">Total Users: {totalUsers}</span>
          {currentUserRank && (
            <span className="current-user-rank">
              Your Rank: {getRankIcon(currentUserRank)}
            </span>
          )}
        </div>
      </div>

      <div className="leaderboard-table">
        <div className="table-header">
          <div className="header-rank">Rank</div>
          <div className="header-username">Username</div>
          <div className="header-achievements">Achievements</div>
          <div className="header-points">Points</div>
        </div>

        <div className="table-body">
          {leaderboard.map((entry) => (
            <div 
              key={entry.user_id} 
              className={`leaderboard-row ${entry.rank <= 3 ? 'top-three' : ''}`}
            >
              <div className="row-rank">
                <span className={`rank-display ${entry.rank <= 3 ? 'medal' : ''}`}>
                  {getRankIcon(entry.rank)}
                </span>
              </div>
              <div className="row-username">{entry.username}</div>
              <div className="row-achievements">{entry.total_achievements}</div>
              <div className="row-points">{entry.total_points}</div>
            </div>
          ))}
        </div>

        {leaderboard.length === 0 && (
          <div className="empty-leaderboard">
            <p>No users found on the leaderboard yet.</p>
          </div>
        )}
      </div>

      <div className="leaderboard-footer">
        <p>Earn achievement points by completing various tasks and milestones!</p>
        <button onClick={fetchLeaderboard} className="refresh-button">
          🔄 Refresh
        </button>
      </div>

      <style jsx>{`
        .leaderboard-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          color: #333;
        }

        .leaderboard-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .leaderboard-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 2px 4px rgba(255, 215, 0, 0.2);
        }

        .leaderboard-stats {
          display: flex;
          justify-content: center;
          gap: 2rem;
          font-size: 1.1rem;
        }

        .leaderboard-stats span {
          padding: 0.5rem 1rem;
          background: white;
          border-radius: 8px;
          border: 1px solid #ddd;
          color: #333;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .current-user-rank {
          background: linear-gradient(135deg, #ffd700, #ff8c00) !important;
          border-color: #ffd700 !important;
          color: white !important;
          font-weight: bold;
        }

        .leaderboard-table {
          background: white;
          border-radius: 12px;
          border: 1px solid #ddd;
          overflow: hidden;
          margin-bottom: 2rem;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .table-header {
          display: grid;
          grid-template-columns: 80px 1fr 120px 100px;
          gap: 1rem;
          padding: 1rem 1.5rem;
          background: #f8f9fa;
          font-weight: bold;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #333;
          border-bottom: 2px solid #dee2e6;
        }

        .table-body {
          max-height: 600px;
          overflow-y: auto;
        }

        .leaderboard-row {
          display: grid;
          grid-template-columns: 80px 1fr 120px 100px;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #dee2e6;
          transition: background-color 0.2s;
          color: #333;
        }

        .leaderboard-row:hover {
          background: #f8f9fa;
        }

        .leaderboard-row:last-child {
          border-bottom: none;
        }

        .top-three {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1));
        }

        .top-three:hover {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.2));
        }

        .rank-display {
          font-weight: bold;
          font-size: 1.1rem;
          color: #333;
        }

        .rank-display.medal {
          font-size: 1.3rem;
        }

        .row-username {
          font-weight: 600;
          color: #333;
        }

        .row-achievements, .row-points {
          text-align: center;
          font-weight: 500;
          color: #333;
        }

        .row-points {
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: bold;
        }

        .loading-container, .error-container {
          text-align: center;
          padding: 4rem 2rem;
          color: #333;
        }

        .loading-spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-top: 3px solid #ffd700;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: #dc3545;
          font-size: 1.1rem;
          margin-bottom: 1rem;
        }

        .retry-button, .refresh-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 0.7rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .retry-button:hover, .refresh-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .leaderboard-footer {
          text-align: center;
          padding: 2rem 0;
          color: #333;
        }

        .leaderboard-footer p {
          margin-bottom: 1rem;
          color: #666;
        }

        .empty-leaderboard {
          text-align: center;
          padding: 3rem 2rem;
          color: #666;
        }

        @media (max-width: 768px) {
          .leaderboard-page {
            padding: 1rem;
          }

          .leaderboard-header h1 {
            font-size: 2rem;
          }

          .leaderboard-stats {
            flex-direction: column;
            gap: 1rem;
          }

          .table-header, .leaderboard-row {
            grid-template-columns: 60px 1fr 80px 80px;
            gap: 0.5rem;
            padding: 0.8rem 1rem;
            font-size: 0.9rem;
          }

          .header-achievements, .header-points {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Leaderboard;