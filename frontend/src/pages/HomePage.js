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
  ClosestAchievements,
  CollaborationInvites
} from '../components/home';
import RandomResourceWidget from '../components/widgets/RandomResourceWidget';
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
              <LatestUpdates limit={5} />
              <LatestReleases limit={6} />
            </div>
            <div className="sidebar-area">
              <CollaborationInvites />
              <CommunityWips />
              <ClosestAchievements limit={3} />
              <CommunityLeaderboard limit={8} />
              <TipsAndTricks />
              <LatestFeatureRequests limit={2} />
              <RandomResourceWidget />
            </div>
          </>
        ) : (
          // Layout for unauthenticated users
          <>
            <div className="main-content-area">
              <IntroSection />
              <LatestUpdates limit={6} />
              <LatestReleases limit={6} />
            </div>
            <div className="sidebar-area">
              <LoginSection />
              <CommunityWips />
              <CommunityLeaderboard limit={5} />
              <TipsAndTricks />
              <RandomResourceWidget />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;