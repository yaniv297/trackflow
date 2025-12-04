import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet } from '../utils/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useUserProfilePopup } from '../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../components/shared/UserProfilePopup';
import '../components/home/LatestReleases.css';
import './LatestReleasesPage.css';

const LatestReleasesPage = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [totalReleases, setTotalReleases] = useState(0);
  const navigate = useNavigate();
  const { popupState, handleUsernameClick, handleUsernameHover, hidePopup, delayedHidePopup, cancelHideTimeout } = useUserProfilePopup();
  
  const currentPage = parseInt(searchParams.get('page') || '1') - 1; // Convert to 0-based
  const limit = 12; // More items per page for dedicated page

  useEffect(() => {
    fetchReleases();
  }, [currentPage]);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = currentPage * limit;
      const releasesData = await apiGet(`/songs/recent-pack-releases?limit=${limit}&offset=${offset}`);
      setReleases(releasesData || []);
      
      // For pagination, estimate total count
      if (releasesData && releasesData.length === limit) {
        setTotalReleases((currentPage + 1) * limit + 1);
      } else {
        setTotalReleases(offset + (releasesData?.length || 0));
      }
      
    } catch (error) {
      console.error('Failed to fetch releases:', error);
      setError('Failed to load releases. Please try again.');
      setReleases([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // The API already returns grouped pack data, so we just need to format it
  const packReleases = releases.map(pack => {
    // Clean release_title - handle null, undefined, or empty strings
    const cleanTitle = pack.release_title && typeof pack.release_title === 'string' && pack.release_title.trim().length > 0
      ? pack.release_title.trim()
      : null;
    
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

  const totalPages = Math.ceil(totalReleases / limit);

  const handlePageChange = (newPage) => {
    const pageNumber = newPage + 1; // Convert back to 1-based for URL
    setSearchParams({ page: pageNumber.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="releases-page">
        <div className="releases-header">
          <h1>Latest Releases</h1>
        </div>
        <LoadingSpinner message="Loading releases..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="releases-page">
        <div className="releases-header">
          <h1>Latest Releases</h1>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchReleases} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="releases-page">
      <div className="releases-header">
        <div className="header-content">
          <div className="title-section">
            <h1>Latest Releases</h1>
            <p className="subtitle">Discover the newest music from our community</p>
            {totalReleases > 0 && (
              <div className="release-stats">
                <span className="total-count">{totalReleases} total releases</span>
                <span className="page-info">
                  Page {currentPage + 1} of {totalPages}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Pagination - Top */}
      {totalPages > 1 && (
        <div className="pagination-container top">
          <PaginationControls 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      <div className="releases-list">
        {packReleases.length > 0 ? (
          packReleases.map((pack, index) => (
            <PackReleaseCard 
              key={pack.pack_id || `single-${index}`} 
              pack={pack} 
              formatDate={formatDate}
              onUsernameClick={handleUsernameClick}
              onUsernameHover={handleUsernameHover}
              onUsernameLeave={delayedHidePopup}
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">♪</div>
            <h3>No Releases Yet</h3>
            <p>Be the first to share your music with the community!</p>
            <button onClick={() => navigate('/wip')} className="cta-button">
              Start Creating
            </button>
          </div>
        )}
      </div>

      {/* Pagination - Bottom */}
      {totalPages > 1 && (
        <div className="pagination-container bottom">
          <PaginationControls 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
        onMouseEnter={cancelHideTimeout}
        onMouseLeave={delayedHidePopup}
      />
    </div>
  );
};

const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
  const getVisiblePages = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (range[0] > 1) {
      rangeWithDots.push(0);
      if (range[0] > 2) {
        rangeWithDots.push('...');
      }
    }

    rangeWithDots.push(...range);

    if (range[range.length - 1] < totalPages - 2) {
      if (range[range.length - 1] < totalPages - 3) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(totalPages - 1);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="pagination-controls">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="nav-btn prev-btn"
      >
        ← Previous
      </button>

      <div className="page-numbers">
        {visiblePages.map((page, index) =>
          page === '...' ? (
            <span key={index} className="page-dots">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`page-btn ${currentPage === page ? 'active' : ''}`}
            >
              {page + 1}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="nav-btn next-btn"
      >
        Next →
      </button>
    </div>
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

const PackReleaseCard = ({ pack, formatDate, onUsernameClick, onUsernameHover, onUsernameLeave }) => {
  const [songsPage, setSongsPage] = useState(0);
  const SONGS_PER_PAGE = 10;
  
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
  const totalSongPages = Math.ceil(pack.songs.length / SONGS_PER_PAGE);
  const paginatedSongs = pack.songs.slice(
    songsPage * SONGS_PER_PAGE,
    (songsPage + 1) * SONGS_PER_PAGE
  );

  // Get YouTube URL (pack level or single song)
  const youtubeUrl = pack.release_youtube_url || (pack.songs.length === 1 ? pack.songs[0].release_youtube_url : null);
  const videoId = getYouTubeVideoId(youtubeUrl);
  
  // Get release description (pack level or single song)
  const releaseDescription = pack.release_description || (pack.songs.length === 1 ? pack.songs[0].release_description : null);

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

export default LatestReleasesPage;
