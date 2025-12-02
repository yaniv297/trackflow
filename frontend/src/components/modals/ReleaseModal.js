import React, { useState, useEffect } from 'react';
import { apiPatch, apiPost } from '../../utils/api';
import './ReleaseModal.css';

const ReleaseModal = ({ 
  isOpen, 
  onClose, 
  title,
  type = 'song', // 'song' or 'pack'
  itemId,
  itemName,
  onReleaseComplete,
  packSongs = [] // Songs in the pack (for pack releases)
}) => {
  const [releaseData, setReleaseData] = useState({
    title: '',
    description: '',
    download_link: '',
    youtube_url: ''
  });
  const [songDownloadLinks, setSongDownloadLinks] = useState({});
  const [hideFromHomepage, setHideFromHomepage] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setReleaseData({
        title: '',
        description: '',
        download_link: '',
        youtube_url: ''
      });
      setSongDownloadLinks({});
      setHideFromHomepage(false);
      setErrors({});
    }
  }, [isOpen]);

  const validateYouTubeUrl = (url) => {
    if (!url) return true; // Optional field
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]+/;
    return youtubeRegex.test(url);
  };

  const validateDownloadLink = (url) => {
    if (!url) return true; // Optional field
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (field, value) => {
    setReleaseData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSongDownloadLinkChange = (songId, value) => {
    setSongDownloadLinks(prev => ({
      ...prev,
      [songId]: value
    }));
    
    // Clear error when user starts typing
    if (errors[`song_${songId}`]) {
      setErrors(prev => ({
        ...prev,
        [`song_${songId}`]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    // Validate YouTube URL if provided
    if (releaseData.youtube_url && !validateYouTubeUrl(releaseData.youtube_url)) {
      newErrors.youtube_url = 'Please enter a valid YouTube URL';
    }
    
    // Validate download link if provided
    if (releaseData.download_link && !validateDownloadLink(releaseData.download_link)) {
      newErrors.download_link = 'Please enter a valid URL';
    }
    
    // Validate song download links if provided
    Object.entries(songDownloadLinks).forEach(([songId, link]) => {
      if (link && !validateDownloadLink(link)) {
        newErrors[`song_${songId}`] = 'Please enter a valid URL';
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      setIsReleasing(true);
      
      // Prepare the release payload
      const releasePayload = {
        status: 'Released',
        ...releaseData
      };
      
      // Make the API call to release the item
      if (type === 'song') {
        await apiPatch(`/songs/${itemId}`, releasePayload);
      } else {
        // For packs, use the POST endpoint with release data
        const packReleaseData = {
          ...releaseData,
          song_download_links: songDownloadLinks,
          hide_from_homepage: hideFromHomepage
        };
        await apiPost(`/packs/${itemId}/release`, packReleaseData);
      }
      
      // Notify parent component of successful release
      if (onReleaseComplete) {
        onReleaseComplete(itemId, releaseData);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to release:', error);
      setErrors({
        general: error.message || 'Failed to release. Please try again.'
      });
    } finally {
      setIsReleasing(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="release-modal-overlay" onClick={handleBackdropClick}>
      <div className="release-modal">
        <div className="release-modal-header">
          <h2>{title}</h2>
          <button className="release-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="release-modal-form">
          <div className="release-modal-body">
            {errors.general && (
              <div className="error-message">{errors.general}</div>
            )}
            
            {type === 'pack' && (
              <div className="form-group">
                <label htmlFor="title">
                  Release Post Title (Optional)
                  <span className="field-hint">Title that will appear on the homepage blog post</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={releaseData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder={`e.g., "New Album Release: ${itemName}"`}
                  className="form-input"
                  maxLength={200}
                />
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="description">
                Description (Optional)
                <span className="field-hint">Tell people about your {type}</span>
              </label>
              <textarea
                id="description"
                value={releaseData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={`Describe your ${type}...`}
                rows={4}
                className="form-textarea"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="download_link">
                Download Link (Optional)
                <span className="field-hint">Link to download the {type}</span>
              </label>
              <input
                type="url"
                id="download_link"
                value={releaseData.download_link}
                onChange={(e) => handleInputChange('download_link', e.target.value)}
                placeholder="https://example.com/download"
                className={`form-input ${errors.download_link ? 'error' : ''}`}
              />
              {errors.download_link && (
                <span className="field-error">{errors.download_link}</span>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="youtube_url">
                YouTube Video (Optional)
                <span className="field-hint">YouTube link for your {type}</span>
              </label>
              <input
                type="url"
                id="youtube_url"
                value={releaseData.youtube_url}
                onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`form-input ${errors.youtube_url ? 'error' : ''}`}
              />
              {errors.youtube_url && (
                <span className="field-error">{errors.youtube_url}</span>
              )}
            </div>

            {/* Hide from Homepage Option */}
            <div className="form-group">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={hideFromHomepage}
                  onChange={(e) => setHideFromHomepage(e.target.checked)}
                  className="form-checkbox"
                />
                <span className="checkbox-label">
                  Don't show on TrackFlow homepage
                  <span className="field-hint">Release privately without appearing on the main page</span>
                </span>
              </label>
            </div>

            {/* Individual Song Download Links (only for pack releases) */}
            {type === 'pack' && packSongs.length > 0 && (
              <div className="form-section">
                <h3 className="section-title">Individual Song Download Links (Optional)</h3>
                <p className="section-description">
                  Add specific download links for individual songs in this pack
                </p>
                
                {packSongs.map((song, index) => (
                  <div key={song.id} className="form-group">
                    <label htmlFor={`song-download-${song.id}`}>
                      {index + 1}. {song.title}
                      <span className="field-hint">Download link for this song</span>
                    </label>
                    <input
                      type="url"
                      id={`song-download-${song.id}`}
                      value={songDownloadLinks[song.id] || ''}
                      onChange={(e) => handleSongDownloadLinkChange(song.id, e.target.value)}
                      placeholder="https://example.com/download"
                      className={`form-input ${errors[`song_${song.id}`] ? 'error' : ''}`}
                    />
                    {errors[`song_${song.id}`] && (
                      <span className="field-error">{errors[`song_${song.id}`]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="release-modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isReleasing}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isReleasing}
            >
              {isReleasing ? 'Releasing...' : `Release ${itemName}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReleaseModal;