import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../utils/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import './YourStats.css';

const STAT_TYPES = [
  { key: 'top_artists', title: 'Top Artists' },
  { key: 'top_albums', title: 'Top Albums' },
  { key: 'top_years', title: 'Top Years' },
  { key: 'top_decades', title: 'Top Decades' },
  { key: 'top_packs', title: 'Top Packs' },
  { key: 'top_collaborators', title: 'Top Collaborators' }
];

const YourStats = () => {
  const [currentStatType, setCurrentStatType] = useState(null);
  const [statData, setStatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Pick a random stat type on mount
    const randomStat = STAT_TYPES[Math.floor(Math.random() * STAT_TYPES.length)];
    setCurrentStatType(randomStat);
    fetchStatData(randomStat.key);
  }, []);

  const fetchStatData = async (statType) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiGet(`/stats/user/${statType}?limit=5`);
      setStatData(response || []);
    } catch (error) {
      console.error(`Failed to fetch ${statType}:`, error);
      setError(`Failed to load ${statType}`);
      setStatData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewFullStats = () => {
    navigate('/stats');
  };

  const renderStatImage = (item, statType) => {
    switch (statType) {
      case 'top_artists':
        // Only show actual artist images, no placeholders
        if (item.artist_image_url) {
          return (
            <img 
              src={item.artist_image_url} 
              alt={item.name}
              className="stat-image artist-image"
            />
          );
        }
        return null;
      
      case 'top_albums':
        // Only show actual album covers, no placeholders
        if (item.album_cover) {
          return (
            <img 
              src={item.album_cover} 
              alt={item.name}
              className="stat-image album-image"
            />
          );
        }
        return null;
      
      case 'top_years':
        // For years, show album cover from one song from that year
        if (item.album_cover) {
          return (
            <img 
              src={item.album_cover} 
              alt={item.album_name}
              className="stat-image year-image"
            />
          );
        }
        return null;
      
      case 'top_decades':
        // For decades, show album cover from one song from that decade
        if (item.album_cover) {
          return (
            <img 
              src={item.album_cover} 
              alt={item.name}
              className="stat-image decade-image"
            />
          );
        }
        return null;
      
      case 'top_packs':
        // For packs, show artist image from the most common artist
        if (item.artist_image_url) {
          return (
            <img 
              src={item.artist_image_url} 
              alt={item.artist_name}
              className="stat-image pack-image"
            />
          );
        }
        return null;
      
      case 'top_collaborators':
        // No images for collaborators
        return null;
      
      default:
        return null;
    }
  };

  const renderStatContent = (item, statType) => {
    switch (statType) {
      case 'top_albums':
        return (
          <div className="stat-text">
            <div className="name">{item.name}</div>
            {item.artist_name && (
              <div className="subtitle">by {item.artist_name}</div>
            )}
          </div>
        );
      
      case 'top_years':
        return (
          <div className="stat-text">
            <div className="name">{item.year || item.name}</div>
          </div>
        );
      
      case 'top_decades':
        return (
          <div className="stat-text">
            <div className="name">{item.name}</div>
          </div>
        );
      
      case 'top_packs':
        return (
          <div className="stat-text">
            <div className="name">{item.name}</div>
          </div>
        );
      
      default:
        return (
          <div className="stat-text">
            <div className="name">{item.name || item.title || item.year || item.username}</div>
          </div>
        );
    }
  };

  if (!currentStatType) {
    return null;
  }

  if (loading) {
    return (
      <section className="your-stats">
        <div className="stats-widget">
          <h2 className="section-title">{currentStatType.title}</h2>
          <LoadingSpinner message="Loading stats..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="your-stats">
        <div className="stats-widget">
          <h2 className="section-title">{currentStatType.title}</h2>
          <div className="error-state">
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="your-stats">
      <div className="stats-widget">
        <h2 className="section-title">{currentStatType.title}</h2>
        {statData.length > 0 ? (
          <div className="stats-list">
            {statData.map((item, index) => (
              <div key={index} className="stat-item">
                <span className="rank">#{index + 1}</span>
                <div className="stat-info">
                  {renderStatImage(item, currentStatType.key)}
                  {renderStatContent(item, currentStatType.key)}
                </div>
                <span className="count">{item.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No {currentStatType.title.toLowerCase()} yet</p>
          </div>
        )}
        
        <div className="section-footer">
          <button onClick={handleViewFullStats} className="view-all-btn">
            View All Stats →
          </button>
        </div>
      </div>
    </section>
  );
};

export default YourStats;