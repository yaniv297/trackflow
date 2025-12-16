import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SmartDiscovery from '../components/community/SmartDiscovery';
import PublicSongsTableNew from '../components/community/PublicSongsTableNew';
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
  const [selectedSong, setSelectedSong] = useState(null);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'artist', or 'user'
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  // Filters state
  const [filters, setFilters] = useState({
    search: ''
  });
  
  // Pagination - handled by component now
  const [currentPage, setCurrentPage] = useState(1);
  const SONGS_PER_PAGE = 20;

  // Debounced filter loading
  const [filterTimeout, setFilterTimeout] = useState(null);

  // Load songs function - fetches all songs in batches
  const loadSongs = useCallback(async (newFilters = filters) => {
    try {
      setIsLoading(true);
      setError(null);

      const allSongs = [];
      const limit = 100; // Max allowed by API
      let offset = 0;
      let hasMore = true;

      // Fetch all songs in batches
      while (hasMore) {
        const result = await publicSongsService.browsePublicSongs({
          search: newFilters.search,
          sort_by: 'updated_at',
          sort_direction: 'desc',
          group_by: null, // Frontend handles grouping now
          limit: limit,
          offset: offset
        });

        if (result.success) {
          const songs = result.data || [];
          allSongs.push(...songs);
          
          // Check if there are more songs to fetch
          if (result.pagination) {
            const totalPages = result.pagination.total_pages;
            const currentPage = result.pagination.page;
            hasMore = currentPage < totalPages;
            offset = allSongs.length;
          } else {
            // If no pagination info, check if we got fewer than limit
            hasMore = songs.length === limit;
            offset += limit;
          }
        } else {
          setError(result.error);
          setSongs([]);
          return;
        }
      }

      setSongs(allSongs);
      
      // Debug: Log first song to check for artist_image_url
      if (allSongs.length > 0) {
        console.log('Sample song from API:', {
          id: allSongs[0].id,
          title: allSongs[0].title,
          artist: allSongs[0].artist,
          hasArtistImageUrl: !!allSongs[0].artist_image_url,
          artistImageUrl: allSongs[0].artist_image_url,
          allFields: Object.keys(allSongs[0])
        });
      }
    } catch (err) {
      console.error('Error loading songs:', err);
      setError('Failed to load songs');
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  // Handle filter changes with debouncing
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    
    // Clear existing timeout
    if (filterTimeout) {
      clearTimeout(filterTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      loadSongs(newFilters);
    }, 500);
    
    setFilterTimeout(timeout);
  }, [filterTimeout, loadSongs]);

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
    // Trigger a re-render of components by updating the key or refreshing data
    // This will cause components to re-check collaboration status
    loadSongs();
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
          <h1>🌟 Community WIP</h1>
          <p>Discover public WIPs and collaborate with other authors</p>
        </div>

        {/* Smart Discovery Section */}
        <SmartDiscovery />

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

          {!isLoading && songs.length > 0 && (
            <PublicSongsTableNew
              songs={songs}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onCollaborationRequest={handleCollaborationRequest}
              currentUserId={user?.id}
              groupBy={groupBy}
              setGroupBy={setGroupBy}
              expandedGroups={expandedGroups}
              setExpandedGroups={setExpandedGroups}
              itemsPerPage={SONGS_PER_PAGE}
            />
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