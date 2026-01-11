import React, { useState, useEffect, useRef } from 'react';
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
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  useEffect(() => {
    fetchUpdates();
  }, [limit]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiGet(`/api/updates?limit=${limit}`);
      const updates = data || [];
      
      setUpdates(updates);
      if (updates.length > 0) {
        setCurrentUpdate(updates[0]);
        setCurrentIndex(0);
      }
    } catch (error) {
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
      setIsContentExpanded(false); // Reset expansion when switching updates
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
    <section className={`latest-updates ${showAllUpdates ? 'expanded' : 'compact'} ${isContentExpanded ? 'content-expanded' : ''}`}>
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
                  onExpandChange={setIsContentExpanded}
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

const UpdateItem = ({ update, compact = false, onNext = null, onExpandChange = null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef(null);
  
  // Simple check: if content is longer than ~150 characters, it probably needs truncation
  const needsTruncation = compact && update.content && update.content.length > 150;

  const handleExpandToggle = (e) => {
    e.preventDefault();
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onExpandChange) {
      onExpandChange(newExpanded);
    }
  };

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
    <article className={`update-item ${compact ? 'compact' : ''} ${isExpanded ? 'expanded' : ''}`}>
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
      <p 
        ref={contentRef}
        className={`update-content ${compact && !isExpanded ? 'truncated' : ''}`}
      >
        {update.content}
      </p>
      {needsTruncation && (
        <button 
          className="expand-toggle-btn"
          onClick={handleExpandToggle}
        >
          {isExpanded ? 'Read less' : 'Read more'}
        </button>
      )}
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