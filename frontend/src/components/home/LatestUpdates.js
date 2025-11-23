import React, { useState, useEffect } from 'react';
import { apiGet } from '../../utils/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import './LatestUpdates.css';

const LatestUpdates = ({ limit = 5 }) => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUpdate, setCurrentUpdate] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllUpdates, setShowAllUpdates] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, [limit]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, using mock data. Replace with actual API call when available
      const mockUpdates = [
        {
          id: 1,
          title: "Welcome to TrackFlow!",
          content: "TrackFlow is your complete music production management system. Track your projects, collaborate with others, and see how you rank on the community leaderboard!",
          author: "TrackFlow Team",
          date: "2024-11-20",
          type: "announcement"
        },
        {
          id: 2,
          title: "New Achievement System",
          content: "Earn points and unlock achievements as you complete projects and reach milestones. Check out the leaderboard to see how you rank!",
          author: "Admin",
          date: "2024-11-15",
          type: "feature"
        },
        {
          id: 3,
          title: "Collaboration Features Released",
          content: "Work seamlessly with other artists using our new collaboration tools. Share projects, assign tasks, and track progress together.",
          author: "Development Team",
          date: "2024-11-10",
          type: "feature"
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const limitedUpdates = mockUpdates.slice(0, limit);
      setUpdates(limitedUpdates);
      if (limitedUpdates.length > 0) {
        setCurrentUpdate(limitedUpdates[0]);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Failed to fetch updates:', error);
      setError('Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  const handleNextUpdate = () => {
    if (updates.length > 0) {
      const nextIndex = (currentIndex + 1) % updates.length;
      setCurrentIndex(nextIndex);
      setCurrentUpdate(updates[nextIndex]);
    }
  };

  const handleToggleView = () => {
    setShowAllUpdates(!showAllUpdates);
  };

  if (loading) {
    return (
      <section className="latest-updates">
        <h2 className="section-title">Latest Updates</h2>
        <div className="updates-widget">
          <LoadingSpinner message="Loading updates..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="latest-updates">
        <h2 className="section-title">Latest Updates</h2>
        <div className="updates-widget">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchUpdates} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="latest-updates">
      <div className="updates-header">
        <h2 className="section-title">Latest Updates</h2>
        {updates.length > 0 && (
          <button 
            className="toggle-view-btn" 
            onClick={handleToggleView}
            title={showAllUpdates ? "Show compact view" : "Show all updates"}
          >
            {showAllUpdates ? "Compact" : "View All"}
          </button>
        )}
      </div>
      <div className="updates-widget">
        {updates.length > 0 ? (
          showAllUpdates ? (
            <div className="updates-list">
              {updates.map(update => (
                <UpdateItem key={update.id} update={update} />
              ))}
            </div>
          ) : (
            <div className="compact-updates">
              {currentUpdate && (
                <UpdateItem 
                  key={currentUpdate.id} 
                  update={currentUpdate} 
                  compact={true} 
                  onNext={updates.length > 1 ? handleNextUpdate : null}
                />
              )}
            </div>
          )
        ) : (
          <EmptyUpdates />
        )}
      </div>
    </section>
  );
};

const UpdateItem = ({ update, compact = false, onNext = null }) => {
  const getUpdateIcon = (type) => {
    switch (type) {
      case 'announcement': return '▶';
      case 'feature': return '★';
      case 'update': return '↻';
      case 'bugfix': return '✓';
      default: return '●';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <article className={`update-item ${compact ? 'compact' : ''}`}>
      <div className="update-header">
        <span className="update-icon">{getUpdateIcon(update.type)}</span>
        <h3 className="update-title">{update.title}</h3>
        <div className="update-meta">
          <span className="update-date">{formatDate(update.date)}</span>
          {compact && onNext && (
            <button 
              className="next-update-btn"
              onClick={onNext}
              title="Next update"
            >
              ↻
            </button>
          )}
        </div>
      </div>
      <p className="update-content">{update.content}</p>
      <div className="update-footer">
        <span className="update-author">By {update.author}</span>
        <span className="update-type-badge" data-type={update.type}>
          {update.type.charAt(0).toUpperCase() + update.type.slice(1)}
        </span>
      </div>
    </article>
  );
};

const EmptyUpdates = () => (
  <div className="empty-state">
    <div className="empty-icon">●</div>
    <h3>No Updates Yet</h3>
    <p>Stay tuned for the latest news and updates from the TrackFlow team!</p>
  </div>
);

export default LatestUpdates;