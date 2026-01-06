import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import SmartDiscovery from "../components/community/SmartDiscovery";
import PublicSongsTableNew from "../components/community/PublicSongsTableNew";
import CollaborationRequestModal from "../components/community/CollaborationRequestModal";
import BatchCollaborationRequestModal from "../components/community/BatchCollaborationRequestModal";
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
  
  // Batch collaboration request state
  const [selectedBatchSongs, setSelectedBatchSongs] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Pagination - handled by component now
  const [currentPage, setCurrentPage] = useState(1);
  const SONGS_PER_PAGE = 20;

  // Load artist images and merge into songs
  const loadArtistImages = useCallback(async (songsToUpdate) => {
    try {
      // Get unique artist names
      const artistNames = [...new Set(
        songsToUpdate
          .map(song => song.artist)
          .filter(Boolean)
      )];
      
      if (artistNames.length === 0) return;
      
      const result = await publicSongsService.getArtistImages(artistNames);
      if (result.success && result.data) {
        // Merge artist images into songs
        setSongs(currentSongs => 
          currentSongs.map(song => ({
            ...song,
            artist_image_url: song.artist 
              ? result.data[song.artist.toLowerCase()] || null 
              : null
          }))
        );
      }
    } catch (err) {
      console.error("Error loading artist images:", err);
      // Don't set error - artist images are non-critical
    }
  }, []);

  // Load songs function - fetches all songs in batches, then loads artist images
  const loadSongs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allSongs = [];
      const limit = 500; // Higher limit for faster loading
      let offset = 0;
      let hasMore = true;

      // Fetch all songs in batches (without artist images for speed)
      while (hasMore) {
        const result = await publicSongsService.browsePublicSongs({
          search: "",
          sort_by: "updated_at",
          sort_direction: "desc",
          group_by: null, // Frontend handles grouping now
          limit: limit,
          offset: offset,
          include_artist_images: false, // Skip artist images for faster initial load
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

      // Display songs immediately
      setSongs(allSongs);
      setIsLoading(false);
      
      // Then load artist images in the background
      loadArtistImages(allSongs);
    } catch (err) {
      console.error("Error loading songs:", err);
      setError("Failed to load songs");
      setSongs([]);
      setIsLoading(false);
    }
  }, [loadArtistImages]);

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
    // Note: We don't reload songs - collaboration requests don't change song data,
    // and reloading would reset the user's page position, search, and sort settings
    loadCollaborationRequests();
  };

  // Handle batch collaboration request (multiple songs from same owner)
  const handleBatchCollaborationRequest = (songs) => {
    setSelectedBatchSongs(songs);
    setShowBatchModal(true);
  };

  // Close batch modal
  const handleCloseBatchModal = () => {
    setShowBatchModal(false);
    setSelectedBatchSongs([]);
  };

  // Handle successful batch collaboration request
  const handleBatchSuccess = () => {
    handleCloseBatchModal();
    // Refresh collaboration status to show the new requests
    // Note: We don't reload songs - collaboration requests don't change song data,
    // and reloading would reset the user's page position, search, and sort settings
    loadCollaborationRequests();
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
              onBatchCollaborationRequest={user ? handleBatchCollaborationRequest : null}
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

      {/* Collaboration Request Modal (single song) */}
      {showCollaborationModal && selectedSong && (
        <CollaborationRequestModal
          song={selectedSong}
          onClose={handleCloseCollaborationModal}
          onSuccess={handleCollaborationSuccess}
        />
      )}

      {/* Batch Collaboration Request Modal (multiple songs) */}
      {showBatchModal && selectedBatchSongs.length > 0 && (
        <BatchCollaborationRequestModal
          songs={selectedBatchSongs}
          onClose={handleCloseBatchModal}
          onSuccess={handleBatchSuccess}
        />
      )}
    </div>
  );
};

export default CommunityPage;
