import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SmartDiscovery from '../components/community/SmartDiscovery';
import PublicSongFilters from '../components/community/PublicSongFilters';
import PublicSongsTable from '../components/community/PublicSongsTable';
import CollaborationRequestModal from '../components/community/CollaborationRequestModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import publicSongsService from '../services/publicSongsService';
import './CommunityPage.css';

/**
 * Main Community page component for browsing public WIPs and collaborating
 */
const CommunityPage = () => {
  const { user } = useAuth();
  
  // State management
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    artist: '',
    user: '',
    status: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const SONGS_PER_PAGE = 50; // Increased since table is more compact

  // Debounced filter loading
  const [filterTimeout, setFilterTimeout] = useState(null);

  // Load songs function
  const loadSongs = useCallback(async (newFilters = filters, page = 0, append = false) => {
    try {
      if (!append) {
        setIsLoading(true);
        setError(null);
      }

      const result = await publicSongsService.browsePublicSongs({
        search: newFilters.search,
        artist: newFilters.artist,
        user: newFilters.user,
        status: newFilters.status,
        limit: SONGS_PER_PAGE,
        offset: page * SONGS_PER_PAGE
      });

      if (result.success) {
        const newSongs = result.data;
        
        if (append) {
          setSongs(prev => [...prev, ...newSongs]);
        } else {
          setSongs(newSongs);
        }
        
        setHasMore(newSongs.length === SONGS_PER_PAGE);
        setCurrentPage(page);
      } else {
        setError(result.error);
        if (!append) setSongs([]);
      }
    } catch (err) {
      console.error('Error loading songs:', err);
      setError('Failed to load songs');
      if (!append) setSongs([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    loadSongs();
  }, []);

  // Handle filter changes with debouncing
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    
    // Clear existing timeout
    if (filterTimeout) {
      clearTimeout(filterTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setCurrentPage(0);
      loadSongs(newFilters, 0, false);
    }, 500);
    
    setFilterTimeout(timeout);
  }, [filterTimeout, loadSongs]);

  // Load more songs (pagination)
  const loadMore = () => {
    if (!isLoading && hasMore) {
      const nextPage = currentPage + 1;
      loadSongs(filters, nextPage, true);
    }
  };

  // Handle collaboration request
  const handleCollaborationRequest = (song) => {
    setSelectedSong(song);
    setShowCollaborationModal(true);
  };

  // Close collaboration modal
  const handleCloseCollaborationModal = () => {
    setShowCollaborationModal(false);
    setSelectedSong(null);
  };

  // Handle successful collaboration request
  const handleCollaborationSuccess = () => {
    handleCloseCollaborationModal();
    // Could show a success toast here
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (filterTimeout) {
        clearTimeout(filterTimeout);
      }
    };
  }, [filterTimeout]);

  return (
    <div className="community-page">
      <div className="community-container">
        <div className="page-header">
          <h1>🌟 Community</h1>
          <p>Discover public WIPs and collaborate with other musicians</p>
        </div>

        {/* Smart Discovery Section */}
        <SmartDiscovery />

        {/* Filters Section */}
        <PublicSongFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLoading={isLoading}
        />

        {/* Results Section */}
        <div className="results-section">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button 
                onClick={() => loadSongs()}
                className="retry-btn"
              >
                Retry
              </button>
            </div>
          )}

          {!error && songs.length === 0 && !isLoading && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No public songs found</h3>
              <p>
                {Object.values(filters).some(f => f) ? 
                  'Try adjusting your filters to see more results.' :
                  'No users have shared songs publicly yet.'
                }
              </p>
            </div>
          )}

          {songs.length > 0 && (
            <>
              <div className="results-header">
                <span className="results-count">
                  {songs.length} song{songs.length !== 1 ? 's' : ''} found
                </span>
              </div>

              <PublicSongsTable
                songs={songs}
                onCollaborationRequest={handleCollaborationRequest}
                currentUserId={user?.id}
              />

              {/* Load More Button */}
              {hasMore && (
                <div className="load-more-section">
                  <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className="load-more-btn"
                  >
                    {isLoading ? 'Loading...' : 'Load More Songs'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Loading Spinner */}
          {isLoading && songs.length === 0 && (
            <div className="loading-section">
              <LoadingSpinner />
              <p>Loading public songs...</p>
            </div>
          )}
        </div>
      </div>

      {/* Collaboration Request Modal */}
      {showCollaborationModal && selectedSong && (
        <CollaborationRequestModal
          song={selectedSong}
          onClose={handleCloseCollaborationModal}
          onSuccess={handleCollaborationSuccess}
        />
      )}
    </div>
  );
};

export default CommunityPage;