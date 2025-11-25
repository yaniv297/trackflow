import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import profileService from '../services/profileService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import './ProfilePage.css';

const ITEMS_PER_PAGE = 10;

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination states
  const [releasedSongsPage, setReleasedSongsPage] = useState(1);
  const [wipSongsPage, setWipSongsPage] = useState(1);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setError('Username not provided');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const profileData = await profileService.getPublicProfile(username);
        setProfile(profileData);
        setError(null);
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (err.response?.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to load profile');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [username]);
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const getRarityColor = (rarity) => {
    const colors = {
      legendary: '#ff6b35',
      epic: '#9d4edd',
      rare: '#2196f3',
      uncommon: '#4caf50',
      common: '#757575'
    };
    return colors[rarity] || colors.common;
  };
  
  const getContactMethodDisplay = (method, discordUsername) => {
    if (method === 'discord' && discordUsername) {
      return `Discord: ${discordUsername}`;
    } else if (method === 'email') {
      return 'Email (via admin)';
    }
    return 'Not specified';
  };
  
  // Pagination helpers
  const paginate = (items, page, perPage = ITEMS_PER_PAGE) => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return {
      items: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / perPage),
      currentPage: page,
      totalItems: items.length
    };
  };

  const renderPagination = (totalPages, currentPage, onPageChange, itemType) => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <div className="pagination-wrapper">
        <div className="pagination">
          <button 
            onClick={() => onPageChange(1)} 
            disabled={currentPage === 1}
          >
            First
          </button>
          <button 
            onClick={() => onPageChange(currentPage - 1)} 
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={currentPage === page ? 'active' : ''}
            >
              {page}
            </button>
          ))}
          
          <button 
            onClick={() => onPageChange(currentPage + 1)} 
            disabled={currentPage === totalPages}
          >
            Next
          </button>
          <button 
            onClick={() => onPageChange(totalPages)} 
            disabled={currentPage === totalPages}
          >
            Last
          </button>
        </div>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <LoadingSpinner message="Loading profile..." />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/community')} className="btn btn-primary">
              Back to Community
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-error">
            <h2>Profile not found</h2>
            <button onClick={() => navigate('/community')} className="btn btn-primary">
              Back to Community
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const isOwnProfile = currentUser?.username === profile.username;
  
  // Paginated data
  const releasedSongsData = paginate(profile.released_songs || [], releasedSongsPage);
  const wipSongsData = paginate(profile.public_wip_songs || [], wipSongsPage);
  
  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-header-content">
            <div className="profile-avatar">
              {profile.profile_image_url ? (
                <img 
                  src={profile.profile_image_url} 
                  alt={`${profile.username}'s avatar`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <div className="profile-avatar-fallback" style={{ 
                display: profile.profile_image_url ? 'none' : 'flex' 
              }}>
                {profile.username.charAt(0).toUpperCase()}
              </div>
            </div>
            
            <div className="profile-info">
              <h1 className="profile-username">{profile.username}</h1>
              {profile.display_name && (
                <h2 className="profile-display-name">{profile.display_name}</h2>
              )}
              
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-label">Achievement Score</span>
                  <span className="stat-value">{profile.achievement_score}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Member since</span>
                  <span className="stat-value">{formatDate(profile.created_at)}</span>
                </div>
                {profile.preferred_contact_method && (
                  <div className="stat-item">
                    <span className="stat-label">Contact</span>
                    <span className="stat-value">
                      {getContactMethodDisplay(profile.preferred_contact_method, profile.discord_username)}
                    </span>
                  </div>
                )}
                {profile.website_url && (
                  <div className="stat-item">
                    <span className="stat-label">Website</span>
                    <span className="stat-value">
                      <a 
                        href={profile.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="website-link"
                      >
                        {profile.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </span>
                  </div>
                )}
              </div>
              
              {isOwnProfile && (
                <button 
                  onClick={() => navigate('/settings')} 
                  className="edit-profile-btn"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="profile-content">
          {/* Rarest Achievements */}
          {profile.rarest_achievements && profile.rarest_achievements.length > 0 && (
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Rarest Achievements</h3>
                <span className="section-count">{profile.rarest_achievements.length}</span>
              </div>
              <div className="section-content">
                <div className="achievements-grid">
                  {profile.rarest_achievements.map((achievement) => (
                    <div 
                      key={achievement.id} 
                      className="achievement-item"
                      style={{ borderLeftColor: getRarityColor(achievement.rarity) }}
                    >
                      <div className="achievement-icon">{achievement.icon}</div>
                      <div className="achievement-info">
                        <h4>{achievement.name}</h4>
                        <p>{achievement.description}</p>
                        <div className="achievement-meta">
                          <span className={`rarity ${achievement.rarity}`}>
                            {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                          </span>
                          <span className="points">{achievement.points} pts</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Released Packs */}
          {profile.released_packs && profile.released_packs.length > 0 && (
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Released Packs</h3>
                <span className="section-count">{profile.released_packs.length}</span>
              </div>
              <div className="section-content">
                <div className="packs-grid">
                  {profile.released_packs.map((pack) => (
                    <div key={pack.id} className="pack-item">
                      <h4>{pack.name}</h4>
                      <p className="pack-meta">
                        {pack.song_count} songs • Released {formatDate(pack.released_at)}
                      </p>
                      {pack.release_description && (
                        <p className="pack-description">{pack.release_description}</p>
                      )}
                      <div className="pack-links">
                        {pack.release_download_link && (
                          <a 
                            href={pack.release_download_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-sm"
                          >
                            Download
                          </a>
                        )}
                        {pack.release_youtube_url && (
                          <a 
                            href={pack.release_youtube_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                          >
                            Watch
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Released Songs */}
          {profile.released_songs && profile.released_songs.length > 0 && (
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Released Songs</h3>
                <span className="section-count">{profile.released_songs.length}</span>
              </div>
              <div className="section-content songs-section">
                <div className="songs-table-wrapper">
                  <table className="songs-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Artist</th>
                        <th>Album</th>
                        <th>Pack</th>
                        <th>Released</th>
                      </tr>
                    </thead>
                    <tbody>
                      {releasedSongsData.items.map((song) => (
                        <tr key={song.id}>
                          <td className="song-title">{song.title}</td>
                          <td>{song.artist}</td>
                          <td>{song.album || 'N/A'}</td>
                          <td>{song.pack_name || 'Individual'}</td>
                          <td>{formatDate(song.released_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(
                  releasedSongsData.totalPages, 
                  releasedSongsData.currentPage, 
                  setReleasedSongsPage,
                  'songs'
                )}
              </div>
            </div>
          )}
          
          {/* Public WIP Songs */}
          {profile.public_wip_songs && profile.public_wip_songs.length > 0 && (
            <div className="profile-section">
              <div className="section-header">
                <h3 className="section-title">Public WIP Songs</h3>
                <span className="section-count">{profile.public_wip_songs.length}</span>
              </div>
              <div className="section-content songs-section">
                <div className="songs-table-wrapper">
                  <table className="songs-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Artist</th>
                        <th>Album</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wipSongsData.items.map((song) => (
                        <tr key={song.id}>
                          <td className="song-title">{song.title}</td>
                          <td>{song.artist}</td>
                          <td>{song.album || 'N/A'}</td>
                          <td>
                            <span className={`status-badge ${song.status.toLowerCase().replace(' ', '-')}`}>
                              {song.status}
                            </span>
                          </td>
                          <td>{formatDate(song.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPagination(
                  wipSongsData.totalPages, 
                  wipSongsData.currentPage, 
                  setWipSongsPage,
                  'wip-songs'
                )}
              </div>
            </div>
          )}
          
          {/* Empty state if no content */}
          {(!profile.released_songs || profile.released_songs.length === 0) &&
           (!profile.released_packs || profile.released_packs.length === 0) &&
           (!profile.public_wip_songs || profile.public_wip_songs.length === 0) &&
           (!profile.rarest_achievements || profile.rarest_achievements.length === 0) && (
            <div className="profile-section">
              <div className="profile-empty">
                <h3>No Content Yet</h3>
                <p>This user hasn't shared any content yet.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;