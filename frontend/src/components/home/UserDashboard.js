import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../utils/api';
import './UserDashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    lastWorkedSong: null,
    recentParts: [],
    songsCloseToCompletion: [],
    packsCloseToCompletion: [],
    loading: true,
    error: null
  });

  const getCompletionPercentage = (song) => {
    if (!song.authoring) return 0;
    const total = Object.keys(song.authoring).length;
    if (total === 0) return 0;
    const completed = Object.values(song.authoring).filter(status => status === 'complete').length;
    return Math.round((completed / total) * 100);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));

      // Fetch all required data in parallel
      const [
        lastWorkedResponse,
        recentPartsResponse,
        songsResponse,
        packsResponse
      ] = await Promise.all([
        apiGet('/songs?status=wip&limit=1&order=updated_at'),
        apiGet('/authoring/recent?limit=3'),
        apiGet('/songs?status=wip&limit=10'), // Get more and filter client-side initially
        apiGet('/packs/near-completion?limit=3')
      ]);

      // Filter songs close to completion client-side
      const songsWithCompletion = (songsResponse || []).filter(song => {
        const percentage = getCompletionPercentage(song);
        return percentage >= 80; // 80% threshold
      }).slice(0, 3);

      setDashboardData({
        lastWorkedSong: lastWorkedResponse.length > 0 ? lastWorkedResponse[0] : null,
        recentParts: recentPartsResponse || [],
        songsCloseToCompletion: songsWithCompletion,
        packsCloseToCompletion: packsResponse || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load dashboard'
      }));
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

  const getPackCompletionStats = (pack) => {
    const totalSongs = pack.songs?.length || 0;
    const completedSongs = pack.songs?.filter(song => song.status === 'Released').length || 0;
    const wipSongs = pack.songs?.filter(song => song.status === 'In Progress').length || 0;
    
    return {
      totalSongs,
      completedSongs,
      wipSongs,
      percentage: totalSongs > 0 ? Math.round((completedSongs / totalSongs) * 100) : 0
    };
  };

  if (dashboardData.loading) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your work...</p>
        </div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-error">
          <p>Unable to load your latest work</p>
          <button onClick={fetchDashboardData} className="retry-btn">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { lastWorkedSong, recentParts, songsCloseToCompletion, packsCloseToCompletion } = dashboardData;

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h2>Your Work</h2>
        <p>Pick up where you left off</p>
      </div>

      <div className="dashboard-grid">
        {/* Continue Working */}
        <div className="dashboard-card continue-work">
          <div className="card-header">
            <h3>Continue working on...</h3>
          </div>
          <div className="card-content">
            {lastWorkedSong ? (
              <div 
                className="work-item featured"
                onClick={() => navigate(`/songs/${lastWorkedSong.id}`)}
              >
                <div className="work-info">
                  <h4>{lastWorkedSong.title}</h4>
                  <p className="work-meta">
                    {lastWorkedSong.artist} • {lastWorkedSong.pack_name}
                  </p>
                  <p className="work-time">
                    Last worked: {formatTimeAgo(lastWorkedSong.updated_at)}
                  </p>
                </div>
                <div className="work-progress">
                  <div className="progress-circle">
                    <span>{getCompletionPercentage(lastWorkedSong)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No songs in progress</p>
                <button 
                  onClick={() => navigate('/wip')} 
                  className="cta-btn"
                >
                  Start a new song
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Parts */}
        <div className="dashboard-card recent-parts">
          <div className="card-header">
            <h3>Recent parts done</h3>
          </div>
          <div className="card-content">
            {recentParts.length > 0 ? (
              <div className="parts-list">
                {recentParts.map((part, index) => (
                  <div 
                    key={index}
                    className="part-item"
                    onClick={() => navigate(`/songs/${part.song_id}`)}
                  >
                    <div className="part-icon">✓</div>
                    <div className="part-info">
                      <p className="part-name">{part.part_name}</p>
                      <p className="part-song">{part.song_title}</p>
                      <p className="part-time">{formatTimeAgo(part.completed_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No recent authoring activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Songs Close to Completion */}
        <div className="dashboard-card close-songs">
          <div className="card-header">
            <h3>Songs almost done</h3>
          </div>
          <div className="card-content">
            {songsCloseToCompletion.length > 0 ? (
              <div className="completion-list">
                {songsCloseToCompletion.map((song) => {
                  const percentage = getCompletionPercentage(song);
                  return (
                    <div 
                      key={song.id}
                      className="completion-item"
                      onClick={() => navigate(`/songs/${song.id}`)}
                    >
                      <div className="completion-info">
                        <h4>{song.title}</h4>
                        <p className="completion-meta">{song.artist}</p>
                      </div>
                      <div className="completion-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No songs near completion</p>
              </div>
            )}
          </div>
        </div>

        {/* Packs Close to Completion */}
        <div className="dashboard-card close-packs">
          <div className="card-header">
            <h3>Packs almost done</h3>
          </div>
          <div className="card-content">
            {packsCloseToCompletion.length > 0 ? (
              <div className="completion-list">
                {packsCloseToCompletion.map((pack) => {
                  const stats = getPackCompletionStats(pack);
                  return (
                    <div 
                      key={pack.id}
                      className="completion-item"
                      onClick={() => navigate(`/wip?pack=${pack.id}`)}
                    >
                      <div className="completion-info">
                        <h4>{pack.name}</h4>
                        <p className="completion-meta">
                          {stats.completedSongs}/{stats.totalSongs} songs done
                        </p>
                      </div>
                      <div className="completion-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${stats.percentage}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{stats.percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>No packs near completion</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;