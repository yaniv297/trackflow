import React, { useState } from 'react';
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
import ReleaseModal from '../components/modals/ReleaseModal';
import './HomePage.css';

const HomePage = () => {
  const { isAuthenticated, loading } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [packToEdit, setPackToEdit] = useState(null);
  const [refreshCallback, setRefreshCallback] = useState(null);

  const handleEditRelease = (pack, refreshFn) => {
    setPackToEdit(pack);
    setRefreshCallback(() => refreshFn); // Store refresh function
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    // Call the refresh function if available
    if (refreshCallback) {
      refreshCallback();
    }
  };

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
              <LatestReleases limit={6} onEditRelease={handleEditRelease} />
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
              <LatestReleases limit={6} onEditRelease={handleEditRelease} />
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

      {/* Edit Release Modal - Full page overlay */}
      <ReleaseModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Release"
        type="pack"
        itemId={packToEdit?.pack_id}
        itemName={packToEdit?.pack_name}
        onReleaseComplete={handleEditSuccess}
        packSongs={packToEdit?.songs || []}
        editMode={true}
        initialData={packToEdit}
      />
    </div>
  );
};

export default HomePage;