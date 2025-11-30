import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../utils/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useUserProfilePopup } from '../../hooks/ui/useUserProfilePopup';
import UserProfilePopup from '../shared/UserProfilePopup';
import './LatestReleases.css';

const LatestReleases = ({ limit = 5 }) => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalReleases, setTotalReleases] = useState(0);
  const navigate = useNavigate();
  const { popupState, handleUsernameClick, handleUsernameHover, hidePopup, delayedHidePopup, cancelHideTimeout } = useUserProfilePopup();

  useEffect(() => {
    fetchReleases();
  }, [limit, currentPage]);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch recent releases from the API with pagination
      const offset = currentPage * limit;
      const releasesData = await apiGet(`/songs/recent-pack-releases?limit=${limit}&offset=${offset}`);
      setReleases(releasesData || []);
      
      // For now, we'll estimate total count. Later we could add a separate count endpoint
      if (releasesData && releasesData.length === limit) {
        // If we got a full page, assume there might be more
        setTotalReleases((currentPage + 1) * limit + 1);
      } else {
        // If we got less than limit, this is the last page
        setTotalReleases(offset + (releasesData?.length || 0));
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

  const handleExploreMusic = () => {
    navigate('/login');
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

  return (
    <section className="latest-releases">
      <div className="releases-header">
        <div className="header-left">
          <h2 className="section-title">Latest Releases</h2>
          {totalReleases > 0 && (
            <span className="release-count">
              Showing {currentPage * limit + 1}-{Math.min((currentPage + 1) * limit, totalReleases)} of {totalReleases}
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
      
      {/* Navigation controls */}
      {packReleases.length > 0 && totalReleases > limit && (
        <div className="releases-navigation">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="nav-btn prev-btn"
          >
            ← Previous
          </button>
          
          <div className="page-indicators">
            {Array.from({ length: Math.min(5, Math.ceil(totalReleases / limit)) }, (_, i) => {
              const pageNum = Math.max(0, currentPage - 2) + i;
              const totalPages = Math.ceil(totalReleases / limit);
              
              if (pageNum >= totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`page-indicator ${currentPage === pageNum ? 'active' : ''}`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={releases.length < limit}
            className="nav-btn next-btn"
          >
            Next →
          </button>
        </div>
      )}
      <div className="releases-widget">
        {packReleases.length > 0 ? (
          <div className="releases-list">
            {packReleases.map((pack, index) => (
              <PackReleaseItem 
                key={pack.pack_id || `single-${index}`} 
                pack={pack} 
                onUsernameClick={handleUsernameClick}
                onUsernameHover={handleUsernameHover}
                onUsernameLeave={delayedHidePopup}
              />
            ))}
          </div>
        ) : (
          <EmptyReleases onExplore={handleExploreMusic} />
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

const PackReleaseItem = ({ pack, onUsernameClick, onUsernameHover, onUsernameLeave }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <article className="pack-release">
      <div className="pack-header">
        <div className="pack-cover">
          {pack.album_cover ? (
            <img 
              src={pack.album_cover} 
              alt={`${pack.album || 'Album'} cover`}
              className="cover-image"
            />
          ) : (
            <div className="cover-placeholder">
              <span className="music-icon">♪</span>
            </div>
          )}
        </div>
        <div className="pack-info">
          <div className="pack-title-section">
            <h3 className="pack-name">{pack.pack_name || pack.album}</h3>
            <div className="pack-credits">
              <span className="pack-artist">{pack.artist}</span>
              <span className="pack-author-highlight">by <span 
                onClick={onUsernameClick ? onUsernameClick(pack.author) : undefined}
                onMouseEnter={onUsernameHover ? onUsernameHover(pack.author) : undefined}
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
      <div className="pack-songs">
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
      
      {/* Release metadata - check both pack-level and individual song metadata */}
      {(pack.release_description || pack.release_download_link || pack.release_youtube_url || 
        pack.songs.some(s => s.release_description || s.release_download_link || s.release_youtube_url)) && (
        <div className="release-metadata">
          {/* Pack-level description */}
          {pack.release_description && (
            <div className="release-description">
              <p>{pack.release_description}</p>
            </div>
          )}
          
          {/* Individual song descriptions (for single releases) */}
          {pack.songs.length === 1 && pack.songs[0].release_description && (
            <div className="release-description">
              <p>{pack.songs[0].release_description}</p>
            </div>
          )}
          
          <div className="release-actions">
            {/* Pack download link */}
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
            
            {/* Pack YouTube link */}
            {pack.release_youtube_url && (
              <a 
                href={pack.release_youtube_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="release-action-btn youtube-btn"
              >
                <span className="btn-icon">▶</span>
                Watch
              </a>
            )}
            
            {/* Individual song YouTube link (for single releases) */}
            {pack.songs.length === 1 && pack.songs[0].release_youtube_url && (
              <a 
                href={pack.songs[0].release_youtube_url} 
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
    </article>
  );
};

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