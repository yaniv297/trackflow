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
  
  // Artist grouping states
  const [groupByArtist, setGroupByArtist] = useState(true);
  const [collapsedArtists, setCollapsedArtists] = useState(new Set());
  
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
  
  // Group songs by artist and sort by song count (most to least)
  const groupSongsByArtist = (songs) => {
    const grouped = songs.reduce((acc, song) => {
      const artist = song.artist || 'Unknown Artist';
      if (!acc[artist]) {
        acc[artist] = [];
      }
      acc[artist].push(song);
      return acc;
    }, {});
    
    // Convert to array and sort by song count (descending)
    return Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([artist, songs]) => ({
        artist,
        songs: songs.sort((a, b) => a.title.localeCompare(b.title)), // Sort songs alphabetically within artist
        songCount: songs.length
      }));
  };
  
  // Toggle artist collapse state
  const toggleArtistCollapse = (artist) => {
    const newCollapsed = new Set(collapsedArtists);
    if (newCollapsed.has(artist)) {
      newCollapsed.delete(artist);
    } else {
      newCollapsed.add(artist);
    }
    setCollapsedArtists(newCollapsed);
  };
  
  // Reusable Songs Section Component
  const SongsSection = ({ title, songs, paginatedData, onPageChange, showStatus = false }) => {
    if (!songs || songs.length === 0) return null;
    
    const groupedArtists = groupSongsByArtist(paginatedData.items);
    
    return (
      <div className="profile-section">
        <div className="section-header">
          <div className="section-title-group">
            <h3 className="section-title">{title}</h3>
            <span className="section-count">{songs.length}</span>
          </div>
          <div className="section-controls">
            <button
              onClick={() => setGroupByArtist(!groupByArtist)}
              className={`group-toggle ${groupByArtist ? 'active' : ''}`}
              title="Toggle artist grouping"
            >
              <span className="toggle-icon">👥</span>
              Group by Artist
            </button>
          </div>
        </div>
        
        <div className="section-content songs-section">
          {groupByArtist ? (
            // Artist-grouped view
            <div className="artists-grouped-view">
              {groupedArtists.map(({ artist, songs: artistSongs, songCount }, index) => {
                const isCollapsed = collapsedArtists.has(artist);
                // By default, all artists start collapsed except the first one with most songs
                const shouldBeCollapsed = index > 0 || isCollapsed;
                
                return (
                  <div key={artist} className="artist-group">
                    <div 
                      className="artist-header"
                      onClick={() => toggleArtistCollapse(artist)}
                    >
                      <div className="artist-info">
                        <span className="collapse-icon">
                          {shouldBeCollapsed ? '▶' : '▼'}
                        </span>
                        <h4 className="artist-name">{artist}</h4>
                        <span className="song-count">({songCount} song{songCount !== 1 ? 's' : ''})</span>
                      </div>
                    </div>
                    
                    {!shouldBeCollapsed && (
                      <div className="artist-songs">
                        {artistSongs.map((song) => (
                          <div key={song.id} className="song-item">
                            <div className="song-artwork">
                              {song.album_cover ? (
                                <img 
                                  src={song.album_cover} 
                                  alt={`${song.album || 'Album'} cover`}
                                  className="album-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="album-cover-placeholder"
                                style={{ display: song.album_cover ? 'none' : 'flex' }}
                              >
                                ♪
                              </div>
                            </div>
                            
                            <div className="song-details">
                              <div className="song-title">{song.title}</div>
                              <div className="song-meta">
                                <span className="album-name">{song.album || 'No Album'}</span>
                                {song.pack_name && (
                                  <span className="pack-name"> • {song.pack_name}</span>
                                )}
                                {showStatus && (
                                  <span className={`status-badge ${song.status?.toLowerCase().replace(' ', '-')}`}>
                                    {song.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Table view (original)
            <div className="songs-table-wrapper">
              <table className="songs-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Album</th>
                    <th>Pack</th>
                    {showStatus && <th>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.items.map((song) => (
                    <tr key={song.id}>
                      <td className="song-title">{song.title}</td>
                      <td>{song.artist}</td>
                      <td>{song.album || 'N/A'}</td>
                      <td>{song.pack_name || 'Individual'}</td>
                      {showStatus && (
                        <td>
                          <span className={`status-badge ${song.status?.toLowerCase().replace(' ', '-')}`}>
                            {song.status}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {renderPagination(
            paginatedData.totalPages, 
            paginatedData.currentPage, 
            onPageChange,
            'songs'
          )}
        </div>
      </div>
    );
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
      return {
        type: 'discord',
        username: discordUsername,
        display: `Discord: ${discordUsername}`
      };
    } else if (method === 'email') {
      return {
        type: 'email',
        display: 'Email (via admin)'
      };
    }
    return {
      type: 'none',
      display: 'Not specified'
    };
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
              
              <div className="profile-details">
                <div className="detail-row">
                  <strong className="detail-label">Achievement Score:</strong>
                  <span className="detail-value">{profile.achievement_score}</span>
                </div>
                {profile.leaderboard_rank && (
                  <div className="detail-row">
                    <strong className="detail-label">Leaderboard Position:</strong>
                    <span className="detail-value">#{profile.leaderboard_rank}</span>
                  </div>
                )}
                <div className="detail-row">
                  <strong className="detail-label">Member since:</strong>
                  <span className="detail-value">{formatDate(profile.created_at)}</span>
                </div>
                {profile.preferred_contact_method && (() => {
                  const contactInfo = getContactMethodDisplay(profile.preferred_contact_method, profile.discord_username);
                  return (
                    <div className="detail-row">
                      <strong className="detail-label">Contact:</strong>
                      <span className="detail-value">
                        {contactInfo.type === 'discord' ? (
                          <>
                            Discord: <a 
                              href={`https://discord.com/users/${contactInfo.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="discord-link"
                              title="Open Discord to message user"
                            >
                              {contactInfo.username}
                            </a>
                          </>
                        ) : (
                          contactInfo.display
                        )}
                      </span>
                    </div>
                  );
                })()}
                {profile.website_url && (
                  <div className="detail-row">
                    <strong className="detail-label">Website:</strong>
                    <span className="detail-value">
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
          <SongsSection
            title="Released Songs"
            songs={profile.released_songs}
            paginatedData={releasedSongsData}
            onPageChange={setReleasedSongsPage}
            showStatus={false}
          />
          
          {/* Public WIP Songs */}
          <SongsSection
            title="Public WIP Songs"
            songs={profile.public_wip_songs}
            paginatedData={wipSongsData}
            onPageChange={setWipSongsPage}
            showStatus={true}
          />
          
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