import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './HeroSection.css';

const HeroSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/wip');
    } else {
      navigate('/');
    }
  };

  const handleSignUp = () => {
    if (isAuthenticated) {
      navigate('/wip');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">
          Welcome to <span className="brand-highlight">TrackFlow</span>
        </h1>
        <p className="hero-subtitle">
          Your complete rhythm gaming authoring management system
        </p>
        <div className="hero-games">
          <div className="game-logos">
            <img src="https://rhythmverse.co/assets/media/games/RB3xbox.png" alt="Rock Band 3" className="game-logo" />
            <img src="https://rhythmverse.co/assets/media/games/ch.png" alt="Clone Hero" className="game-logo" />
            <img src="https://rhythmverse.co/assets/media/games/yarg.png" alt="YARG" className="game-logo" />
            <img src="https://rhythmverse.co/assets/media/games/ps.png" alt="Phase Shift" className="game-logo" />
          </div>
        </div>
        <div className="hero-actions">
          {!loading && (
            isAuthenticated ? (
              <>
                <button 
                  onClick={handleGetStarted}
                  className="cta-button primary"
                >
                  Go to WIP
                </button>
                <button 
                  onClick={() => navigate('/leaderboard')}
                  className="cta-button secondary"
                >
                  View Leaderboard
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleSignUp}
                  className="cta-button primary"
                >
                  Sign Up Free
                </button>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;