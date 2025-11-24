import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiGet } from '../../utils/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import './LatestFeatureRequests.css';

const LatestFeatureRequests = ({ limit = 5 }) => {
  const [featureRequests, setFeatureRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

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
      const data = await apiGet(`/feature-requests/?sort_by=created_at&limit=${limit}`);
      setFeatureRequests(data.slice(0, limit));
      
    } catch (error) {
      console.error('Failed to fetch feature requests:', error);
      setFeatureRequests([]);
      setError('Failed to load feature requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    navigate('/feature-requests');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'rejected': return '❌';
      default: return '💡';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#ffc107';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
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
                <div className="request-header">
                  <span 
                    className="status-icon"
                    style={{ color: getStatusColor(request.status) }}
                  >
                    {getStatusIcon(request.status)}
                  </span>
                  <h4 className="request-title">{request.title}</h4>
                </div>
                <p className="request-meta">
                  <span className="votes">👍 {request.upvotes || 0}</span>
                  <span className="author">by {request.author_name}</span>
                  <span className="time">{formatTimeAgo(request.created_at)}</span>
                </p>
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
    </section>
  );
};

export default LatestFeatureRequests;