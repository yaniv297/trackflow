import React, { useState, useEffect } from 'react';
import { apiGet } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import './ClosestAchievements.css';

const RARITY_COLORS = {
  common: "#95a5a6",
  uncommon: "#2ecc71", 
  rare: "#3498db",
  epic: "#9b59b6",
  legendary: "#f39c12",
};

function ClosestAchievements({ limit = 5 }) {
  const [closestAchievements, setClosestAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchClosestAchievements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchClosestAchievements = async () => {
    try {
      const achievements = await apiGet('/achievements/with-progress');
      
      // Filter unearned achievements with progress data
      const unearned = achievements.filter(ach => 
        !ach.earned && ach.progress && ach.progress.target > 0
      );
      
      // Sort by percentage completion (highest first)
      const sorted = unearned.sort((a, b) => b.progress.percentage - a.progress.percentage);
      
      // Take top achievements
      setClosestAchievements(sorted.slice(0, limit));
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch closest achievements:', error);
      setError('Failed to load achievements');
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="closest-achievements-widget">
        <h3>🎯 Almost There!</h3>
        <div className="loading">Loading achievements...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="closest-achievements-widget">
        <h3>🎯 Almost There!</h3>
        <div className="error">{error}</div>
      </div>
    );
  }

  if (closestAchievements.length === 0) {
    return (
      <div className="closest-achievements-widget">
        <h3>🎯 Almost There!</h3>
        <div className="no-achievements">
          <p>Great work! You're making progress on your achievements.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="closest-achievements-widget">
      <h3>Almost There!</h3>
      <div className="achievements-list">
        {closestAchievements.map((achievement) => (
          <div key={achievement.id} className="achievement-item">
            <div className="achievement-content">
              <div className="achievement-name">{achievement.name}</div>
              <div className="achievement-description">{achievement.description}</div>
              <div className="achievement-meta">
                <span className="progress-text">
                  {achievement.progress.current} / {achievement.progress.target}
                </span>
                <span className="percentage">{achievement.progress.percentage}%</span>
                <span className="points">+{achievement.points}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="view-all-link">
        <a href="/achievements">View all →</a>
      </div>
    </div>
  );
}

export default ClosestAchievements;