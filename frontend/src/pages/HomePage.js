import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  HeroSection,
  CommunityLeaderboard,
  LatestUpdates,
  LatestReleases,
  LatestFeatureRequests,
  TipsAndTricks,
  LoginSection,
  UserDashboard,
  CommunityWips,
  IntroSection,
  ClosestAchievements
} from '../components/home';
import './HomePage.css';

const HomePage = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading TrackFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {!isAuthenticated && <HeroSection />}
      
      <div className={`home-content ${isAuthenticated ? 'authenticated' : 'unauthenticated'}`}>
        {isAuthenticated ? (
          // Layout for authenticated users
          <>
            <div className="full-width-section">
              <UserDashboard />
            </div>
            <div className="main-content-area">
              <LatestReleases limit={6} />
              <LatestUpdates limit={5} />
            </div>
            <div className="sidebar-area">
              <CommunityWips />
              <ClosestAchievements limit={5} />
              <CommunityLeaderboard limit={8} />
              <TipsAndTricks />
              <LatestFeatureRequests limit={2} />
            </div>
          </>
        ) : (
          // Layout for unauthenticated users
          <>
            <div className="main-content-area">
              <IntroSection />
              <LatestReleases limit={6} />
              <LatestUpdates limit={6} />
            </div>
            <div className="sidebar-area">
              <LoginSection />
              <CommunityWips />
              <CommunityLeaderboard limit={5} />
              <TipsAndTricks />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;