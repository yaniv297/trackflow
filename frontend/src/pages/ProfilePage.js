import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPut } from '../utils/api';
import { checkCustomizationAchievements } from '../utils/achievements';
import profileService from '../services/profileService';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ProfileSongsTable from '../components/profile/ProfileSongsTable';
import './ProfilePage.css';

const ITEMS_PER_PAGE = 10;

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    preferred_contact_method: "",
    discord_username: "",
    profile_image_url: "",
    website_url: "",
  });
  
  // Pagination states
  const [releasedSongsPage, setReleasedSongsPage] = useState(1);
  const [wipSongsPage, setWipSongsPage] = useState(1);
  
  // Artist grouping states
  const [groupByArtist, setGroupByArtist] = useState(false);
  const [expandedArtists, setExpandedArtists] = useState(new Set());
  
  const isOwnProfile = currentUser?.username === username;
  
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
        
        // If viewing own profile, fetch editable settings
        if (currentUser?.username === username) {
          fetchUserSettings();
        }
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
  }, [username, currentUser?.username]);
  
  const fetchUserSettings = async () => {
    try {
      const response = await apiGet("/user-settings/me");
      setFormData({
        email: response.email || "",
        preferred_contact_method: response.preferred_contact_method || "",
        discord_username: response.discord_username || "",
        profile_image_url: response.profile_image_url || "",
        website_url: response.website_url || "",
      });
    } catch (error) {
      console.error("Error fetching user settings:", error);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    // Client-side validation
    if (formData.preferred_contact_method === "email" && !formData.email.trim()) {
      if (window.showNotification) {
        window.showNotification(
          "Email address is required when email is the preferred contact method",
          "error",
          5000
        );
      }
      return;
    }

    if (formData.preferred_contact_method === "discord" && !formData.discord_username.trim()) {
      if (window.showNotification) {
        window.showNotification(
          "Discord username is required when Discord is the preferred contact method",
          "error",
          5000
        );
      }
      return;
    }

    setSaving(true);

    try {
      const payload = {};
      
      // Always include profile fields to trigger achievement checks
      payload.profile_image_url = formData.profile_image_url || "";
      payload.website_url = formData.website_url || "";
      
      // Only include other fields if they have meaningful values
      if (formData.email && formData.email.trim()) {
        payload.email = formData.email.trim();
      }
      
      if (formData.preferred_contact_method && formData.preferred_contact_method.trim()) {
        payload.preferred_contact_method = formData.preferred_contact_method.trim();
      }
      
      if (formData.discord_username && formData.discord_username.trim()) {
        payload.discord_username = formData.discord_username.trim();
      }
      
      const response = await apiPut("/user-settings/me", payload);

      // Update the user context with new data
      if (updateUser && currentUser) {
        updateUser({ ...currentUser, ...response });
      } else if (updateUser) {
        updateUser(response);
      }
      
      // Update local profile state with new data
      setProfile(prev => ({
        ...prev,
        profile_image_url: formData.profile_image_url,
        website_url: formData.website_url,
        preferred_contact_method: formData.preferred_contact_method,
        discord_username: formData.discord_username,
      }));

      if (window.showNotification) {
        window.showNotification("Profile saved successfully!", "success", 3000);
      }

      setSaving(false);
      setIsEditing(false);

      // Check for customization achievements
      checkCustomizationAchievements(1000).catch((error) => {
        console.error("Error checking customization achievements:", error);
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      if (window.showNotification) {
        window.showNotification(error.message || "Failed to save profile", "error", 5000);
      }
      setSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data to profile values
    setFormData({
      email: profile?.email || "",
      preferred_contact_method: profile?.preferred_contact_method || "",
      discord_username: profile?.discord_username || "",
      profile_image_url: profile?.profile_image_url || "",
      website_url: profile?.website_url || "",
    });
  };
  
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
  
  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-header-content">
            <div className="profile-avatar">
              {(isEditing ? formData.profile_image_url : profile.profile_image_url) ? (
                <img 
                  src={isEditing ? formData.profile_image_url : profile.profile_image_url} 
                  alt={`${profile.username}'s avatar`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className="profile-avatar-fallback" style={{ 
                display: (isEditing ? formData.profile_image_url : profile.profile_image_url) ? 'none' : 'flex' 
              }}>
                {profile.username.charAt(0).toUpperCase()}
              </div>
            </div>
            
            <div className="profile-info">
              <h1 className="profile-username">{profile.username}</h1>
              {profile.display_name && (
                <h2 className="profile-display-name">{profile.display_name}</h2>
              )}
              
              {!isEditing ? (
                // View Mode
                <>
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
                      onClick={() => setIsEditing(true)} 
                      className="edit-profile-btn"
                    >
                      Edit Profile
                    </button>
                  )}
                </>
              ) : (
                // Edit Mode
                <form onSubmit={handleSaveProfile} className="profile-edit-form">
                  <div className="profile-form-group">
                    <label htmlFor="profile_image_url">Profile Image URL</label>
                    <input
                      type="url"
                      id="profile_image_url"
                      name="profile_image_url"
                      value={formData.profile_image_url}
                      onChange={handleInputChange}
                      placeholder="https://example.com/your-image.jpg"
                    />
                    <span className="form-hint">Link to an image for your profile picture</span>
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="website_url">Website / Profile Link</label>
                    <input
                      type="url"
                      id="website_url"
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleInputChange}
                      placeholder="https://rhythmverse.co/profile/yourname"
                    />
                    <span className="form-hint">Your personal website or music profile</span>
                  </div>

                  <div className="profile-form-group">
                    <label htmlFor="preferred_contact_method">
                      Preferred Contact Method
                    </label>
                    <select
                      id="preferred_contact_method"
                      name="preferred_contact_method"
                      value={formData.preferred_contact_method}
                      onChange={handleInputChange}
                    >
                      <option value="">None</option>
                      <option value="email">Email</option>
                      <option value="discord">Discord</option>
                    </select>
                  </div>

                  {formData.preferred_contact_method === "email" && (
                    <div className="profile-form-group">
                      <label htmlFor="email">
                        Email Address
                        <span className="required-indicator">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="your@email.com"
                      />
                    </div>
                  )}

                  {formData.preferred_contact_method === "discord" && (
                    <div className="profile-form-group">
                      <label htmlFor="discord_username">
                        Discord Username
                        <span className="required-indicator">*</span>
                      </label>
                      <input
                        type="text"
                        id="discord_username"
                        name="discord_username"
                        value={formData.discord_username}
                        onChange={handleInputChange}
                        required
                        placeholder="username#1234"
                      />
                    </div>
                  )}

                  <div className="profile-edit-actions">
                    <button type="submit" disabled={saving} className="btn btn-primary">
                      {saving ? "Saving..." : "Save Profile"}
                    </button>
                    <button 
                      type="button" 
                      onClick={handleCancelEdit} 
                      className="btn btn-secondary"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
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
          <ProfileSongsTable
            title="Released Songs"
            songs={profile.released_songs}
            currentPage={releasedSongsPage}
            onPageChange={setReleasedSongsPage}
            showStatus={false}
            groupByArtist={groupByArtist}
            setGroupByArtist={setGroupByArtist}
            expandedArtists={expandedArtists}
            setExpandedArtists={setExpandedArtists}
            itemsPerPage={ITEMS_PER_PAGE}
          />
          
          {/* Public WIP Songs */}
          <ProfileSongsTable
            title="Public WIP Songs"
            songs={profile.public_wip_songs}
            currentPage={wipSongsPage}
            onPageChange={setWipSongsPage}
            showStatus={true}
            groupByArtist={groupByArtist}
            setGroupByArtist={setGroupByArtist}
            expandedArtists={expandedArtists}
            setExpandedArtists={setExpandedArtists}
            itemsPerPage={ITEMS_PER_PAGE}
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
