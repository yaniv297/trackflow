import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import SmartDiscovery from "../components/community/SmartDiscovery";
import PublicSongsTableNew from "../components/community/PublicSongsTableNew";
import CollaborationRequestModal from "../components/community/CollaborationRequestModal";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import publicSongsService from "../services/publicSongsService";
import collaborationRequestsService from "../services/collaborationRequestsService";
import "./CommunityPage.css";

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
  const [groupBy, setGroupBy] = useState("none"); // 'none', 'artist', or 'user'
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [collaborationStatusMap, setCollaborationStatusMap] = useState(
    new Map()
  ); // song_id -> status

  // Pagination - handled by component now
  const [currentPage, setCurrentPage] = useState(1);
  const SONGS_PER_PAGE = 20;

  // Load songs function - fetches all songs in batches
  const loadSongs = useCallback(async () => {
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
          search: "",
          sort_by: "updated_at",
          sort_direction: "desc",
          group_by: null, // Frontend handles grouping now
          limit: limit,
          offset: offset,
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
    } catch (err) {
      console.error("Error loading songs:", err);
      setError("Failed to load songs");
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load collaboration requests once (only if user is logged in)
  const loadCollaborationRequests = useCallback(async () => {
    if (!user?.id) {
      setCollaborationStatusMap(new Map());
      return;
    }

    try {
      const result = await collaborationRequestsService.getSentRequests();
      if (result.success) {
        // Create a map of song_id -> status
        const statusMap = new Map();
        result.data.forEach((req) => {
          statusMap.set(req.song_id, req.status);
        });
        setCollaborationStatusMap(statusMap);
      }
    } catch (error) {
      console.error("Failed to load collaboration requests:", error);
      // Don't set error state here, just log it - collaboration status is not critical
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadSongs();
    loadCollaborationRequests();
  }, [loadSongs, loadCollaborationRequests]);

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
    // Refresh collaboration status to show the new request
    loadCollaborationRequests();
    // Also refresh songs in case anything changed
    loadSongs();
  };

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
              <button onClick={() => loadSongs()} className="retry-btn">
                Retry
              </button>
            </div>
          )}

          {!error && songs.length === 0 && !isLoading && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>No public songs found</h3>
              <p>No users have shared songs publicly yet.</p>
            </div>
          )}

          {!isLoading && songs.length > 0 && (
            <PublicSongsTableNew
              songs={songs}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onCollaborationRequest={handleCollaborationRequest}
              currentUserId={user?.id}
              collaborationStatusMap={collaborationStatusMap}
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
