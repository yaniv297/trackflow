import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiGet } from '../../utils/api';
import { useWorkflowData } from '../../hooks/workflows/useWorkflowData';
import './UserDashboard.css';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { authoringFields, getSongCompletionPercentage } = useWorkflowData(user);
  const [dashboardData, setDashboardData] = useState({
    lastWorkedSong: null,
    recentParts: [],
    songsCloseToCompletion: [],
    packsCloseToCompletion: [],
    loading: true,
    error: null
  });

  const getCompletionPercentage = (song) => {
    if (!song) return 0;
    return getSongCompletionPercentage(song);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true }));

      // Fetch all required data in parallel
      const results = await Promise.allSettled([
        apiGet('/songs?status=In%20Progress&limit=100&order=created_at'), // Get more songs to find high completion ones
        apiGet('/authoring/recent?limit=20'),
        apiGet('/packs/near-completion?limit=3&threshold=70')
      ]);

      // Extract values from Promise.allSettled results, defaulting to empty array on failure
      const allSongs = results[0].status === 'fulfilled' ? results[0].value : [];
      const recentParts = results[1].status === 'fulfilled' ? results[1].value : [];
      const packs = results[2].status === 'fulfilled' ? results[2].value : [];

      // Get the most recently updated song (last worked on)
      // Sort by updated_at if available, otherwise use the first one
      const lastWorkedSong = allSongs.length > 0 
        ? allSongs.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0);
            const dateB = new Date(b.updated_at || b.created_at || 0);
            return dateB - dateA;
          })[0]
        : null;

      // Calculate completion for all songs and filter for those >= 80%
      // Songs API should include authoring data, but we may need to fetch it for some
      // For efficiency, we'll only check the first 50 songs
      const songsToCheck = allSongs.slice(0, 50);
      const songsWithCompletionPromises = songsToCheck.map(async (song) => {
        try {
          // Fetch authoring data if not already included
          let authoringData = song.authoring;
          if (!authoringData || Object.keys(authoringData).length === 0) {
            try {
              const authoringResponse = await apiGet(`/authoring/${song.id}`);
              // Authoring response might be in different formats
              authoringData = authoringResponse.parts || authoringResponse || {};
            } catch {
              authoringData = {};
            }
          }
          
          const songWithAuthoring = { ...song, authoring: authoringData };
          const percentage = getSongCompletionPercentage(songWithAuthoring);
          return { ...songWithAuthoring, completionPercentage: percentage };
        } catch {
          return { ...song, completionPercentage: 0 };
        }
      });

      const songsWithAuthoring = await Promise.all(songsWithCompletionPromises);
      const songsWithCompletion = songsWithAuthoring
        .filter(song => song.completionPercentage >= 80 && song.completionPercentage < 100)
        .sort((a, b) => b.completionPercentage - a.completionPercentage)
        .slice(0, 3);

      setDashboardData({
        lastWorkedSong: lastWorkedSong,
        recentParts: recentParts || [],
        songsCloseToCompletion: songsWithCompletion || [],
        packsCloseToCompletion: packs || [],
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
    // Use values from API if available (more accurate)
    const totalSongs = pack.total_songs !== undefined ? pack.total_songs : (pack.songs?.length || 0);
    const completedSongs = pack.completed_songs !== undefined ? pack.completed_songs : (pack.songs?.filter(song => song.status === 'Released').length || 0);
    const wipSongs = pack.songs?.filter(song => song.status === 'In Progress').length || 0;
    
    // Use completion_percentage from API if available (matches WIP page calculation)
    // Otherwise fall back to released/total calculation
    const percentage = pack.completion_percentage !== undefined 
      ? pack.completion_percentage 
      : (totalSongs > 0 ? Math.round((completedSongs / totalSongs) * 100) : 0);
    
    return {
      totalSongs,
      completedSongs,
      wipSongs,
      percentage
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
                onClick={() => navigate(`/wip?song=${lastWorkedSong.id}`)}
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
                {(() => {
                  // Function to format part names (capitalize and remove underscores)
                  const formatPartName = (partName) => {
                    return partName
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase());
                  };

                  // Group parts by song
                  const groupedParts = recentParts.reduce((acc, part) => {
                    const songKey = `${part.song_id}-${part.song_title}`;
                    if (!acc[songKey]) {
                      acc[songKey] = {
                        song_id: part.song_id,
                        song_title: part.song_title,
                        artist: part.artist,
                        album_cover: part.album_cover,
                        parts: [],
                        latest_time: part.completed_at
                      };
                    }
                    acc[songKey].parts.push(formatPartName(part.part_name));
                    // Keep the most recent completion time for this song
                    if (new Date(part.completed_at) > new Date(acc[songKey].latest_time)) {
                      acc[songKey].latest_time = part.completed_at;
                    }
                    return acc;
                  }, {});

                  // Convert to array and sort by latest completion time
                  const songGroups = Object.values(groupedParts)
                    .sort((a, b) => new Date(b.latest_time) - new Date(a.latest_time))
                    .slice(0, 3); // Show top 3 songs

                  return songGroups.map((songGroup, index) => (
                    <div 
                      key={index}
                      className="part-item"
                      onClick={() => navigate(`/wip?song=${songGroup.song_id}`)}
                    >
                      {songGroup.album_cover && (
                        <img 
                          src={songGroup.album_cover} 
                          alt={`${songGroup.song_title} cover`}
                          className="part-album-art"
                        />
                      )}
                      <div className="part-icon">✓</div>
                      <div className="part-info">
                        <p className="part-name">{songGroup.parts.join(', ')}</p>
                        <p className="part-song">{songGroup.song_title}</p>
                        <p className="part-artist">{songGroup.artist}</p>
                        <p className="part-time">{formatTimeAgo(songGroup.latest_time)}</p>
                      </div>
                    </div>
                  ));
                })()}
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
                      onClick={() => navigate(`/wip?song=${song.id}`)}
                    >
                      {song.album_cover && (
                        <img 
                          src={song.album_cover} 
                          alt={`${song.title} cover`}
                          className="completion-album-art"
                        />
                      )}
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
                      {pack.album_cover && (
                        <img 
                          src={pack.album_cover} 
                          alt={`${pack.display_name || pack.name} cover`}
                          className="completion-album-art"
                        />
                      )}
                      <div className="completion-info">
                        <h4>{pack.display_name || pack.name}</h4>
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