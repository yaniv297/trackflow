import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet } from '../utils/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './LatestReleasesPage.css';

const LatestReleasesPage = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [totalReleases, setTotalReleases] = useState(0);
  const navigate = useNavigate();
  
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
  const packReleases = releases.map(pack => ({
    pack_id: pack.pack_id,
    pack_name: pack.pack_name,
    artist: pack.songs[0]?.artist || 'Unknown',
    album: pack.songs[0]?.album || pack.pack_name,
    album_cover: pack.songs[0]?.album_cover,
    author: pack.pack_owner_username,
    released_at: pack.released_at,
    release_description: pack.release_description,
    release_download_link: pack.release_download_link,
    release_youtube_url: pack.release_youtube_url,
    songs: pack.songs
  }));

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
          <button 
            onClick={() => navigate('/')} 
            className="back-btn"
          >
            ← Back to Home
          </button>
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

      <div className="releases-grid">
        {packReleases.length > 0 ? (
          packReleases.map((pack, index) => (
            <PackReleaseCard key={pack.pack_id || `single-${index}`} pack={pack} formatDate={formatDate} />
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
        {visiblePages.map((page, index) => (
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
        ))}
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

const PackReleaseCard = ({ pack, formatDate }) => {
  const [currentCoverIndex, setCurrentCoverIndex] = React.useState(0);
  
  // Get unique album covers from the pack
  const uniqueCovers = React.useMemo(() => {
    const covers = pack.songs
      .map(song => song.album_cover)
      .filter(cover => cover && cover.trim() !== '') // Remove empty/null covers
      .filter((cover, index, arr) => arr.indexOf(cover) === index); // Remove duplicates
    return covers;
  }, [pack.songs]);
  
  const currentCover = uniqueCovers[currentCoverIndex];
  const showCarousel = uniqueCovers.length > 1;
  
  const nextCover = () => {
    setCurrentCoverIndex((prev) => (prev + 1) % uniqueCovers.length);
  };
  
  const prevCover = () => {
    setCurrentCoverIndex((prev) => (prev - 1 + uniqueCovers.length) % uniqueCovers.length);
  };
  
  return (
    <article className="pack-release-card">
      <div className="pack-cover">
        {currentCover ? (
          <div className="cover-carousel">
            <img 
              src={currentCover} 
              alt={`${pack.album || pack.pack_name} cover ${currentCoverIndex + 1}`}
              className="cover-image"
            />
            {showCarousel && (
              <>
                <button 
                  className="carousel-btn prev-btn" 
                  onClick={prevCover}
                  aria-label="Previous album cover"
                >
                  ←
                </button>
                <button 
                  className="carousel-btn next-btn" 
                  onClick={nextCover}
                  aria-label="Next album cover"
                >
                  →
                </button>
                <div className="carousel-dots">
                  {uniqueCovers.map((_, index) => (
                    <button
                      key={index}
                      className={`dot ${index === currentCoverIndex ? 'active' : ''}`}
                      onClick={() => setCurrentCoverIndex(index)}
                      aria-label={`Go to cover ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="cover-placeholder">
            <span className="music-icon">♪</span>
          </div>
        )}
      </div>
    
    <div className="pack-details">
      <div className="pack-title-section">
        <h3 className="pack-name">{pack.pack_name || pack.album || 'Untitled'}</h3>
        <div className="pack-credits">
          <span className="pack-artist">{pack.artist}</span>
          <span className="pack-author">by {pack.author}</span>
        </div>
      </div>
      
      <div className="pack-meta">
        <span className="song-count">
          {pack.songs.length} song{pack.songs.length !== 1 ? 's' : ''}
        </span>
        <span className="release-date">{formatDate(pack.released_at)}</span>
      </div>

      <div className="songs-list">
        {pack.songs.map((song, index) => (
          <div key={song.id} className="song-item">
            <span className="song-number">{index + 1}.</span>
            <span className="song-title">{song.title}</span>
            {song.release_download_link && (
              <a 
                href={song.release_download_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="song-download-link"
                title="Download"
              >
                ↓
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Release metadata */}
      {(pack.release_description || pack.release_download_link || pack.release_youtube_url || 
        pack.songs.some(s => s.release_description || s.release_download_link || s.release_youtube_url)) && (
        <div className="release-metadata">
          {/* Description */}
          {(pack.release_description || (pack.songs.length === 1 && pack.songs[0].release_description)) && (
            <div className="release-description">
              <p>{pack.release_description || pack.songs[0].release_description}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="release-actions">
            {pack.release_download_link && (
              <a 
                href={pack.release_download_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="release-action-btn download-btn"
              >
                <span className="btn-icon">⬇</span>
                Download Pack
              </a>
            )}
            
            {(pack.release_youtube_url || (pack.songs.length === 1 && pack.songs[0].release_youtube_url)) && (
              <a 
                href={pack.release_youtube_url || pack.songs[0].release_youtube_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="release-action-btn youtube-btn"
              >
                <span className="btn-icon">▶</span>
                Watch
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* YouTube Video Embed */}
      {(() => {
        const youtubeUrl = pack.release_youtube_url || (pack.songs.length === 1 ? pack.songs[0].release_youtube_url : null);
        const videoId = getYouTubeVideoId(youtubeUrl);
        
        if (videoId) {
          return (
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
          );
        }
        return null;
      })()}
    </div>
  </article>
  );
};

export default LatestReleasesPage;