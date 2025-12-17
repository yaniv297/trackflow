import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../utils/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import { useAuth } from '../../contexts/AuthContext';
import './LatestReleases.css';

const LatestReleases = ({ limit = 5, isAuthenticated = true, onEditRelease }) => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentReleaseIndex, setCurrentReleaseIndex] = useState(0);
  const [totalReleases, setTotalReleases] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { popupState, handleUsernameClick, handleUsernameHover, hidePopup, delayedHidePopup, cancelHideTimeout } = useUserProfilePopup();

  useEffect(() => {
    fetchReleases();
  }, [limit, currentPage]);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch releases from the last month with pagination
      const offset = currentPage * limit;
      const daysBack = 30; // Last month
      
      // Fetch releases and total count in parallel
      const [releasesData, countData] = await Promise.all([
        apiGet(`/songs/recent-pack-releases?limit=${limit}&offset=${offset}&days_back=${daysBack}`),
        apiGet(`/songs/recent-pack-releases/count?days_back=${daysBack}`)
      ]);
      
      setReleases(releasesData || []);
      setTotalReleases(countData?.count || 0);
      
      // Randomly select the first release to show
      if (releasesData && releasesData.length > 0) {
        const randomIndex = Math.floor(Math.random() * releasesData.length);
        setCurrentReleaseIndex(randomIndex);
      } else {
        setCurrentReleaseIndex(0);
      }
      
    } catch (error) {
      console.error('Failed to fetch releases:', error);
      setReleases([]);
      // Note: Don't show error to users for production
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNextRelease = () => {
    if (releases.length > 0) {
      setCurrentReleaseIndex((prev) => (prev + 1) % releases.length);
    }
  };

  const handlePrevRelease = () => {
    if (releases.length > 0) {
      setCurrentReleaseIndex((prev) => (prev - 1 + releases.length) % releases.length);
    }
  };

  const handleExploreMusic = () => {
    navigate('/');
  };

  const handleEditRelease = (pack) => {
    if (onEditRelease) {
      onEditRelease(pack, fetchReleases);
    }
  };

  if (loading) {
    return (
      <section className="latest-releases">
        <h2 className="section-title">Latest Releases</h2>
        <div className="releases-widget">
          <LoadingSpinner message="Loading releases..." />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="latest-releases">
        <h2 className="section-title">Latest Releases</h2>
        <div className="releases-widget">
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchReleases} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  // The API already returns grouped pack data, so we just need to format it
  const packReleases = releases.map(pack => {
    // Clean release_title - handle null, undefined, or empty strings
    const cleanTitle = pack.release_title && typeof pack.release_title === 'string' && pack.release_title.trim().length > 0
      ? pack.release_title.trim()
      : null;
    
    // Debug logging for pack 111
    if (pack.pack_id === 111) {
      console.log('Pack 111 data:', {
        pack_id: pack.pack_id,
        pack_name: pack.pack_name,
        release_title_raw: pack.release_title,
        release_title_cleaned: cleanTitle,
        full_pack: pack
      });
    }
    
    return {
      pack_id: pack.pack_id,
      pack_name: pack.pack_name,
      release_title: cleanTitle,
      author: pack.pack_owner_username,
      released_at: pack.released_at,
      release_description: pack.release_description,
      release_download_link: pack.release_download_link,
      release_youtube_url: pack.release_youtube_url,
      songs: pack.songs
    };
  });

  return (
    <section className="latest-releases">
      <div className="releases-header">
        <div className="header-left">
          <h2 className="section-title">Latest Releases (Last Month)</h2>
          {totalReleases > 0 && (
            <span className="release-count">
              Showing {currentPage * limit + 1}-{Math.min((currentPage + 1) * limit, totalReleases)} of {totalReleases} releases
            </span>
          )}
        </div>
        <div className="header-right">
          {packReleases.length > 0 && (
            <button 
              onClick={() => navigate('/releases')} 
              className="see-all-btn"
            >
              See All Releases →
            </button>
          )}
          <a 
            href="http://rhythmverse.co/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="rhythmverse-link"
          >
            Find More on RhythmVerse →
          </a>
        </div>
      </div>
      
      {/* Round Robin Navigation */}
      {packReleases.length > 0 && (
        <div className="releases-navigation round-robin">
          <button 
            onClick={handlePrevRelease}
            disabled={packReleases.length <= 1}
            className={`nav-btn prev-btn ${packReleases.length <= 1 ? 'disabled' : ''}`}
            title="Previous release"
          >
            ← Previous
          </button>
          
          <div className="release-indicators">
            <span className="current-release-info">
              {currentReleaseIndex + 1} of {packReleases.length} releases
            </span>
            <div className="release-dots">
              {packReleases.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentReleaseIndex(index)}
                  className={`release-dot ${index === currentReleaseIndex ? 'active' : ''}`}
                  title={`Go to release ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          <button 
            onClick={handleNextRelease}
            disabled={packReleases.length <= 1}
            className={`nav-btn next-btn ${packReleases.length <= 1 ? 'disabled' : ''}`}
            title="Next release"
          >
            Next →
          </button>
        </div>
      )}
      
      <div className="releases-widget single-release">
        {packReleases.length > 0 ? (
          <div className="single-release-container">
            <PackReleaseItem 
              key={packReleases[currentReleaseIndex]?.pack_id || `single-${currentReleaseIndex}`} 
              pack={packReleases[currentReleaseIndex]} 
              onUsernameClick={handleUsernameClick}
              onUsernameHover={handleUsernameHover}
              onUsernameLeave={delayedHidePopup}
              currentUser={user}
              onEditRelease={handleEditRelease}
            />
          </div>
        ) : (
          <EmptyReleasesFromMonth onExplore={handleExploreMusic} onSeeAllReleases={() => navigate('/releases')} />
        )}
      </div>
      
      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
        onMouseEnter={cancelHideTimeout}
        onMouseLeave={delayedHidePopup}
      />

    </section>
  );
};

// Helper function to extract YouTube video ID from URL
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// ReadMore component for release description
const ReadMore = ({ text, maxLength = 300 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text || text.length <= maxLength) {
    return <div className="release-description-text">{text}</div>;
  }
  
  const truncatedText = text.substring(0, maxLength);
  const shouldShowButton = text.length > maxLength;
  
  return (
    <div className="release-description-text">
      {isExpanded ? (
        <>
          {text}
          {shouldShowButton && (
            <button 
              className="read-more-btn" 
              onClick={() => setIsExpanded(false)}
            >
              Read less
            </button>
          )}
        </>
      ) : (
        <>
          {truncatedText}...
          {shouldShowButton && (
            <button 
              className="read-more-btn" 
              onClick={() => setIsExpanded(true)}
            >
              Read more
            </button>
          )}
        </>
      )}
    </div>
  );
};

// Album Cover Carousel Component
const AlbumCoverCarousel = ({ covers }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!covers || covers.length === 0) {
    return (
      <div className="pack-cover">
        <div className="cover-placeholder">
          <span className="music-icon">♪</span>
        </div>
      </div>
    );
  }
  
  if (covers.length === 1) {
    return (
      <div className="pack-cover">
        <img 
          src={covers[0]} 
          alt="Album cover"
          className="cover-image"
        />
      </div>
    );
  }
  
  const nextCover = () => {
    setCurrentIndex((prev) => (prev + 1) % covers.length);
  };
  
  const prevCover = () => {
    setCurrentIndex((prev) => (prev - 1 + covers.length) % covers.length);
  };
  
  return (
    <div className="pack-cover-carousel">
      <button 
        className="cover-arrow cover-arrow-left" 
        onClick={prevCover}
        aria-label="Previous cover"
      >
        ‹
      </button>
      <div className="pack-cover">
        <img 
          src={covers[currentIndex]} 
          alt={`Album cover ${currentIndex + 1} of ${covers.length}`}
          className="cover-image"
        />
      </div>
      <button 
        className="cover-arrow cover-arrow-right" 
        onClick={nextCover}
        aria-label="Next cover"
      >
        ›
      </button>
      {covers.length > 1 && (
        <div className="cover-indicators">
          {covers.map((_, index) => (
            <button
              key={index}
              className={`cover-indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to cover ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PackReleaseItem = ({ pack, onUsernameClick, onUsernameHover, onUsernameLeave, currentUser, onEditRelease }) => {
  const [songsPage, setSongsPage] = useState(0);
  const SONGS_PER_PAGE = 10;
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get all unique album covers from songs
  const getUniqueCovers = () => {
    const covers = new Set();
    pack.songs.forEach(song => {
      if (song.album_cover) {
        covers.add(song.album_cover);
      }
    });
    return Array.from(covers);
  };

  const albumCovers = getUniqueCovers();
  
  // Sort songs by album
  const sortedSongs = [...pack.songs].sort((a, b) => {
    const albumA = a.album || '';
    const albumB = b.album || '';
    return albumA.localeCompare(albumB);
  });
  
  const totalSongPages = Math.ceil(sortedSongs.length / SONGS_PER_PAGE);
  const paginatedSongs = sortedSongs.slice(
    songsPage * SONGS_PER_PAGE,
    (songsPage + 1) * SONGS_PER_PAGE
  );

  // Get YouTube URL (pack level or single song)
  const youtubeUrl = pack.release_youtube_url || (pack.songs.length === 1 ? pack.songs[0].release_youtube_url : null);
  const videoId = getYouTubeVideoId(youtubeUrl);
  
  // Get release description (pack level or single song)
  const releaseDescription = pack.release_description || (pack.songs.length === 1 ? pack.songs[0].release_description : null);

  // Check if current user can edit this pack's release
  const canEditRelease = () => {
    if (!currentUser || !pack.songs) return false;
    
    // Check if user owns any songs in this pack or is pack owner
    const userOwnedSongs = pack.songs.filter(song => song.user_id === currentUser.id);
    const isPackOwner = userOwnedSongs.length > 0;
    
    // Check if user has pack edit collaboration permission
    const hasPackEditPermission = pack.songs.some(
      song => song.pack_collaboration && song.pack_collaboration.can_edit === true
    );
    
    return isPackOwner || hasPackEditPermission;
  };

  return (
    <article className="pack-release">
      <div className="pack-header">
        <AlbumCoverCarousel covers={albumCovers} />
        <div className="pack-info">
          <div className="pack-title-section">
            <h3 className="pack-name">{pack.release_title || pack.pack_name}</h3>
            <div className="pack-credits">
              <span className="pack-author-highlight">by <span 
                onClick={onUsernameClick ? () => onUsernameClick(pack.author) : undefined}
                onMouseEnter={onUsernameHover ? () => onUsernameHover(pack.author) : undefined}
                onMouseLeave={onUsernameLeave}
                style={onUsernameClick ? { 
                  cursor: 'pointer', 
                  color: '#667eea',
                  transition: 'opacity 0.2s ease'
                } : {}}
                title={onUsernameClick ? "Hover for quick info, click to view full profile" : undefined}
              >
                {pack.author}
              </span></span>
            </div>
          </div>
          <div className="pack-meta">
            <span className="song-count">{pack.songs.length} song{pack.songs.length !== 1 ? 's' : ''}</span>
            <span className="release-date">{formatDate(pack.released_at)}</span>
          </div>
          {canEditRelease() && (
            <button 
              className="edit-release-btn"
              onClick={() => onEditRelease && onEditRelease(pack)}
              title="Edit release information"
            >
              ✏️ Edit Release
            </button>
          )}
        </div>
      </div>

      {/* Release Description - Blog-like */}
      {releaseDescription && (
        <div className="release-description-section">
          <ReadMore text={releaseDescription} maxLength={300} />
        </div>
      )}

      {/* Download Link */}
      {pack.release_download_link && (
        <div className="release-actions">
          <a 
            href={pack.release_download_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="release-action-btn download-btn"
          >
            <span className="btn-icon">⬇</span>
            Download Pack
          </a>
        </div>
      )}
      
      {/* Songs List with Album Covers and Artists */}
      <div className="pack-songs-section">
        <h4 className="songs-section-title">Songs ({pack.songs.length})</h4>
        <div className="pack-songs">
          {paginatedSongs.map((song, index) => (
            <div key={song.id} className="song-item">
              <span className="song-number">{songsPage * SONGS_PER_PAGE + index + 1}.</span>
              {song.album_cover && (
                <img 
                  src={song.album_cover} 
                  alt={`${song.artist} - ${song.title} cover`}
                  className="song-album-cover"
                />
              )}
              <div className="song-info">
                <span className="song-title">{song.title}</span>
                {song.artist && (
                  <span className="song-artist">{song.artist}</span>
                )}
              </div>
              {song.release_download_link && (
                <a 
                  href={song.release_download_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="song-download-link"
                  title="Download song"
                >
                  <span className="download-icon">⬇</span>
                  <span className="download-text">Download</span>
                </a>
              )}
            </div>
          ))}
        </div>
        
        {/* Songs Pagination */}
        {totalSongPages > 1 && (
          <div className="songs-pagination">
            <button 
              onClick={() => setSongsPage(prev => Math.max(0, prev - 1))}
              disabled={songsPage === 0}
              className="songs-nav-btn"
            >
              ← Previous
            </button>
            <span className="songs-page-info">
              Page {songsPage + 1} of {totalSongPages}
            </span>
            <button 
              onClick={() => setSongsPage(prev => Math.min(totalSongPages - 1, prev + 1))}
              disabled={songsPage >= totalSongPages - 1}
              className="songs-nav-btn"
            >
              Next →
            </button>
          </div>
        )}
      </div>
      
      {/* YouTube Video Embed (only embed, no button) */}
      {videoId && (
        <div className="youtube-embed">
          <div className="youtube-wrapper">
            <iframe
              width="560"
              height="315"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </article>
  );
};

const EmptyReleasesFromMonth = ({ onExplore, onSeeAllReleases }) => (
  <div className="empty-state">
    <div className="empty-icon">♪</div>
    <h3>No releases from the last month</h3>
    <p>Our community artists are working on new music!</p>
    <div className="empty-state-actions">
      <button onClick={onSeeAllReleases} className="explore-button primary">
        See All Releases →
      </button>
      <button onClick={onExplore} className="explore-button secondary">
        Join Community
      </button>
    </div>
  </div>
);

const EmptyReleases = ({ onExplore }) => (
  <div className="empty-state">
    <div className="empty-icon">♪</div>
    <h3>New Releases Coming Soon!</h3>
    <p>Discover amazing tracks from our community of artists.</p>
    <p>Join TrackFlow to share your music and explore new releases!</p>
    <button onClick={onExplore} className="explore-button">
      Join Community
    </button>
  </div>
);

export default LatestReleases;
