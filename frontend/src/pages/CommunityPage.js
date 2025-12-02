import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SmartDiscovery from '../components/community/SmartDiscovery';
import PublicSongFilters from '../components/community/PublicSongFilters';
import PublicSongsTable from '../components/community/PublicSongsTable';
import ArtistGroup from '../components/community/ArtistGroup';
import UserGroup from '../components/community/UserGroup';
import CollaborationRequestModal from '../components/community/CollaborationRequestModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Pagination from '../components/ui/Pagination';
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
  const [pagination, setPagination] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [groupBy, setGroupBy] = useState('artist'); // 'none', 'artist', or 'user'
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  
  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  });
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    field: 'title',
    direction: 'asc'
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const SONGS_PER_PAGE = 20;

  // Debounced filter loading
  const [filterTimeout, setFilterTimeout] = useState(null);

  // Load songs function
  const loadSongs = useCallback(async (newFilters = filters, page = 1, newSortConfig = sortConfig) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await publicSongsService.browsePublicSongs({
        search: newFilters.search,
        status: newFilters.status,
        sort_by: newSortConfig.field,
        sort_direction: newSortConfig.direction,
        group_by: groupBy !== 'none' ? groupBy : null, // Pass grouping to backend
        limit: SONGS_PER_PAGE,
        offset: (page - 1) * SONGS_PER_PAGE
      });

      if (result.success) {
        setSongs(result.data);
        setPagination(result.pagination);
        setCurrentPage(page);
      } else {
        setError(result.error);
        setSongs([]);
        setPagination(null);
      }
    } catch (err) {
      console.error('Error loading songs:', err);
      setError('Failed to load songs');
      setSongs([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortConfig, groupBy]);

  // Initial load and when groupBy changes
  useEffect(() => {
    loadSongs();
  }, [loadSongs, groupBy]);

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
      loadSongs(newFilters, 1);
    }, 500);
    
    setFilterTimeout(timeout);
  }, [filterTimeout, loadSongs]);

  // Handle sorting
  const handleSort = useCallback((field, direction) => {
    const newSortConfig = { field, direction };
    setSortConfig(newSortConfig);
    setCurrentPage(1);
    loadSongs(filters, 1, newSortConfig);
  }, [filters, loadSongs]);

  // Handle page change
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    loadSongs(filters, page);
  }, [filters, loadSongs]);

  // Group toggling functions
  const toggleGroup = useCallback((groupKey) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  }, []);

  const groupSongsByArtist = useCallback((songs) => {
    // Group the songs (backend already sorted them)
    const grouped = songs.reduce((acc, song) => {
      const artist = song.artist;
      if (!acc[artist]) {
        acc[artist] = [];
      }
      acc[artist].push(song);
      return acc;
    }, {});
    
    // Sort songs within each artist group based on current sort config
    Object.keys(grouped).forEach(artist => {
      grouped[artist].sort((a, b) => {
        const { field, direction } = sortConfig;
        let aVal = a[field] || '';
        let bVal = b[field] || '';
        
        // Handle date fields
        if (field === 'updated_at' || field === 'created_at') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        // Handle string comparisons
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (direction === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    });
    
    return grouped;
  }, [sortConfig]);

  const groupSongsByUser = useCallback((songs) => {
    // Group the songs (backend already sorted them)
    const grouped = songs.reduce((acc, song) => {
      const username = song.username;
      if (!acc[username]) {
        acc[username] = [];
      }
      acc[username].push(song);
      return acc;
    }, {});
    
    // Sort songs within each user group based on current sort config
    Object.keys(grouped).forEach(username => {
      grouped[username].sort((a, b) => {
        const { field, direction } = sortConfig;
        let aVal = a[field] || '';
        let bVal = b[field] || '';
        
        // Handle date fields
        if (field === 'updated_at' || field === 'created_at') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        // Handle string comparisons
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (direction === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    });
    
    return grouped;
  }, [sortConfig]);

  // Handle group by change
  const handleGroupByChange = useCallback((newGroupBy) => {
    setGroupBy(newGroupBy);
    setCurrentPage(1);
    setExpandedGroups(new Set()); // Reset expanded groups
    // loadSongs will be called automatically due to dependency change
  }, []);

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

        {/* Filters Section */}
        <PublicSongFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLoading={isLoading}
        />

        {/* View Options */}
        {songs.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px 20px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#495057'
              }}>
                <label htmlFor="groupBy" style={{ marginRight: '8px' }}>Group by:</label>
                <select
                  id="groupBy"
                  value={groupBy}
                  onChange={(e) => handleGroupByChange(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    fontSize: '14px',
                    color: '#495057',
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  <option value="none">None</option>
                  <option value="artist">Artist</option>
                  <option value="user">User</option>
                </select>
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              {pagination && (
                <span>
                  {(currentPage - 1) * SONGS_PER_PAGE + 1}-{Math.min(currentPage * SONGS_PER_PAGE, pagination.total_count)} of {pagination.total_count} {
                    groupBy === 'artist' ? 'artists' : 
                    groupBy === 'user' ? 'users' : 
                    'songs'
                  }
                </span>
              )}
            </div>
          </div>
        )}

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
              {groupBy === 'artist' ? (
                // Grouped view by artist
                <div className="grouped-results">
                  {Object.entries(groupSongsByArtist(songs))
                  .sort(([a], [b]) => a.localeCompare(b)) // Sort artists alphabetically
                  .map(([artist, artistSongs]) => (
                    <ArtistGroup
                      key={artist}
                      artist={artist}
                      songs={artistSongs}
                      isExpanded={expandedGroups.has(artist)}
                      onToggle={() => toggleGroup(artist)}
                      onCollaborationRequest={handleCollaborationRequest}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              ) : groupBy === 'user' ? (
                // Grouped view by user
                <div className="grouped-results">
                  {Object.entries(groupSongsByUser(songs))
                  .sort(([a], [b]) => a.localeCompare(b)) // Sort users alphabetically
                  .map(([username, userSongs]) => (
                    <UserGroup
                      key={username}
                      user={username}
                      songs={userSongs}
                      isExpanded={expandedGroups.has(username)}
                      onToggle={() => toggleGroup(username)}
                      onCollaborationRequest={handleCollaborationRequest}
                      currentUserId={user?.id}
                    />
                  ))}
                </div>
              ) : (
                // Table view
                <PublicSongsTable
                  songs={songs}
                  onCollaborationRequest={handleCollaborationRequest}
                  currentUserId={user?.id}
                  onSort={handleSort}
                  sortConfig={sortConfig}
                />
              )}

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.total_pages}
                  onPageChange={handlePageChange}
                  totalCount={pagination.total_count}
                  perPage={SONGS_PER_PAGE}
                />
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