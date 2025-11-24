import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiGet } from "../../utils/api";
import { useWorkflowData } from "../../hooks/workflows/useWorkflowData";
import "./UserDashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { authoringFields, getSongCompletionPercentage } =
    useWorkflowData(user);
  const [dashboardData, setDashboardData] = useState({
    suggestions: [],
    loading: true,
    error: null,
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getCompletionPercentage = (song) => {
    if (!song) return 0;
    return getSongCompletionPercentage(song);
  };

  useEffect(() => {
    generateWorkSuggestions();
  }, []);

  const generateWorkSuggestions = async () => {
    try {
      setDashboardData((prev) => ({ ...prev, loading: true }));

      // Fetch all required data in parallel
      const results = await Promise.allSettled([
        apiGet("/songs?status=In%20Progress&limit=100&order=created_at"),
        apiGet("/authoring/recent?limit=20"),
        apiGet("/packs/near-completion?limit=10&threshold=70"),
      ]);

      // Extract values from Promise.allSettled results
      const allSongs =
        results[0].status === "fulfilled" ? results[0].value : [];
      const recentParts =
        results[1].status === "fulfilled" ? results[1].value : [];
      const packs = results[2].status === "fulfilled" ? results[2].value : [];

      // Process songs with completion data (use all songs we fetched)
      const songsToCheck = allSongs;
      const songsWithCompletionPromises = songsToCheck.map(async (song) => {
        try {
          let authoringData = song.authoring;
          if (!authoringData || Object.keys(authoringData).length === 0) {
            try {
              const authoringResponse = await apiGet(`/authoring/${song.id}`);
              authoringData =
                authoringResponse.parts || authoringResponse || {};
            } catch {
              authoringData = {};
            }
          }

          const songWithAuthoring = { ...song, authoring: authoringData };
          const percentage = getSongCompletionPercentage(songWithAuthoring);
          return { ...songWithAuthoring, completionPercentage: percentage };
        } catch {
          return { ...song, completionPercentage: 0 };
        }
      });

      const songsWithAuthoring = await Promise.all(songsWithCompletionPromises);

      const authoredSongMap = new Map();
      songsWithAuthoring.forEach((song) => {
        if (song?.id) {
          authoredSongMap.set(song.id, song);
        }
      });

      const allSongMap = new Map();
      allSongs.forEach((song) => {
        if (song?.id) {
          allSongMap.set(song.id, song);
        }
      });

      const getEnrichedSongData = (songInput) => {
        const base =
          typeof songInput === "number"
            ? { id: songInput }
            : { ...(songInput || {}) };
        const authored = base.id ? authoredSongMap.get(base.id) : null;
        const full = base.id ? allSongMap.get(base.id) : null;
        const merged = {
          ...(full || {}),
          ...(authored || {}),
          ...base,
        };
        merged.authoring =
          merged.authoring || authored?.authoring || full?.authoring || {};
        if (!merged.album_cover) {
          merged.album_cover =
            base.album_cover ||
            authored?.album_cover ||
            full?.album_cover ||
            null;
        }
        if (authored?.completionPercentage !== undefined) {
          merged.completionPercentage = authored.completionPercentage;
        }
        if (
          (merged.completionPercentage === undefined ||
            merged.completionPercentage === null) &&
          merged.authoring &&
          Object.keys(merged.authoring).length > 0
        ) {
          merged.completionPercentage = getSongCompletionPercentage(merged);
        }
        return merged;
      };

      const isSongComplete = (songData) => {
        const completionValue =
          songData?.completionPercentage ?? getCompletionPercentage(songData);
        return completionValue !== null && completionValue >= 100;
      };

      // Generate unified suggestions
      const suggestions = [];
      const usedItems = new Set(); // To prevent duplicates

      // 1. Last worked song
      if (allSongs.length > 0) {
        const lastWorkedSong = allSongs.sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at || 0);
          const dateB = new Date(b.updated_at || b.created_at || 0);
          return dateB - dateA;
        })[0];

        if (lastWorkedSong) {
          const enrichedSong = getEnrichedSongData(lastWorkedSong);
          const completionValue = getSongCompletionPercentage(enrichedSong);
          if (completionValue === null || completionValue < 100) {
            suggestions.push({
              id: `song-${enrichedSong.id}`,
              type: "song",
              data: enrichedSong,
              tags: ["Continue working"],
              priority: 10,
              completion: completionValue,
              lastActivity: enrichedSong.updated_at,
            });
            usedItems.add(`song-${enrichedSong.id}`);
          }
        }
      }

      // 2. Songs close to completion
      const songsCloseToCompletion = songsWithAuthoring
        .filter(
          (song) =>
            song.completionPercentage >= 80 && song.completionPercentage < 100
        )
        .sort((a, b) => b.completionPercentage - a.completionPercentage);

      songsCloseToCompletion.forEach((song) => {
        const itemKey = `song-${song.id}`;
        if (!usedItems.has(itemKey)) {
          const enrichedSong = getEnrichedSongData(song);
          const completionValue = getSongCompletionPercentage(enrichedSong);
          if (completionValue !== null && completionValue >= 100) {
            return;
          }
          suggestions.push({
            id: itemKey,
            type: "song",
            data: {
              ...enrichedSong,
              authoring: enrichedSong.authoring || {},
            },
            tags: ["Almost done"],
            priority: 8 + ((completionValue || 0) / 100) * 2,
            completion: completionValue,
            lastActivity: enrichedSong.updated_at,
          });
          usedItems.add(itemKey);
        } else {
          // Add tag to existing suggestion
          const existing = suggestions.find((s) => s.id === itemKey);
          if (existing && !existing.tags.includes("Almost done")) {
            existing.data = getEnrichedSongData(existing.data);
            existing.tags.push("Almost done");
            existing.priority += 2;
            // Ensure authoring data is available
            if (song.authoring && !existing.data.authoring) {
              existing.data.authoring = song.authoring;
            }
            if (!existing.data.album_cover && song.album_cover) {
              existing.data.album_cover = song.album_cover;
            }
            existing.completion = getSongCompletionPercentage(existing.data);
          }
        }
      });

      // 3. Recent parts completed (group by song)
      const groupedParts = recentParts.reduce((acc, part) => {
        const songKey = `song-${part.song_id}`;
        if (!acc[songKey]) {
          acc[songKey] = {
            song_id: part.song_id,
            song_title: part.song_title,
            artist: part.artist,
            album_cover: part.album_cover,
            parts: [],
            latest_time: part.completed_at,
          };
        }
        const formatPartName = (partName) => {
          return partName
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
        };
        acc[songKey].parts.push(formatPartName(part.part_name));
        if (new Date(part.completed_at) > new Date(acc[songKey].latest_time)) {
          acc[songKey].latest_time = part.completed_at;
        }
        return acc;
      }, {});

      Object.values(groupedParts).forEach((songGroup) => {
        const itemKey = `song-${songGroup.song_id}`;
        if (!usedItems.has(itemKey)) {
          const enrichedSong = getEnrichedSongData({
            id: songGroup.song_id,
            title: songGroup.song_title,
            artist: songGroup.artist,
            album_cover: songGroup.album_cover,
            updated_at: songGroup.latest_time,
          });
          if (isSongComplete(enrichedSong)) {
            return;
          }
          suggestions.push({
            id: itemKey,
            type: "song",
            data: enrichedSong,
            tags: ["Recently worked on"],
            priority: 6,
            completion: getSongCompletionPercentage(enrichedSong),
            lastActivity: songGroup.latest_time,
            recentParts: songGroup.parts,
          });
          usedItems.add(itemKey);
        } else {
          // Add tag to existing suggestion
          const existing = suggestions.find((s) => s.id === itemKey);
          if (existing && !existing.tags.includes("Recently worked on")) {
            existing.data = getEnrichedSongData(existing.data);
            existing.tags.push("Recently worked on");
            existing.priority += 1;
            existing.recentParts = songGroup.parts;
            // Try to add album cover if missing
            if (!existing.data.album_cover) {
              const enrichedSong = getEnrichedSongData(songGroup.song_id);
              if (enrichedSong.album_cover) {
                existing.data.album_cover = enrichedSong.album_cover;
              }
            }
            existing.completion = getSongCompletionPercentage(existing.data);
          }
        }
      });

      // 4. Packs close to completion
      packs.forEach((pack) => {
        const itemKey = `pack-${pack.id}`;
        const stats = getPackCompletionStats(pack);
        suggestions.push({
          id: itemKey,
          type: "pack",
          data: pack,
          tags: ["Pack almost done"],
          priority: 5 + (stats.percentage / 100) * 2,
          completion: stats.percentage,
          lastActivity: pack.updated_at,
          packStats: stats,
        });
      });

      // Sort by priority and add some randomization
      suggestions.sort((a, b) => {
        // Primary sort by priority
        const priorityDiff = b.priority - a.priority;
        if (Math.abs(priorityDiff) > 1) return priorityDiff;
        // Secondary randomization for similar priorities
        return Math.random() - 0.5;
      });

      // Take top 6 suggestions for 2x3 grid
      const finalSuggestions = suggestions.slice(0, 6);

      setDashboardData({
        suggestions: finalSuggestions,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setDashboardData((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to load dashboard",
      }));
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  const getPackCompletionStats = (pack) => {
    // Use values from API if available (more accurate)
    const totalSongs =
      pack.total_songs !== undefined
        ? pack.total_songs
        : pack.songs?.length || 0;
    const completedSongs =
      pack.completed_songs !== undefined
        ? pack.completed_songs
        : pack.songs?.filter((song) => song.status === "Released").length || 0;
    const wipSongs =
      pack.songs?.filter((song) => song.status === "In Progress").length || 0;

    // Use completion_percentage from API if available (matches WIP page calculation)
    // Otherwise fall back to released/total calculation
    const percentage =
      pack.completion_percentage !== undefined
        ? pack.completion_percentage
        : totalSongs > 0
        ? Math.round((completedSongs / totalSongs) * 100)
        : 0;

    return {
      totalSongs,
      completedSongs,
      wipSongs,
      percentage,
    };
  };

  // Generate exciting contextual messages
  const getSuggestionMessage = (suggestion) => {
    if (suggestion.type === "pack" && suggestion.packStats) {
      const remaining =
        suggestion.packStats.totalSongs - suggestion.packStats.completedSongs;
      if (remaining === 1) {
        return "1 song left to finish this pack!";
      } else if (remaining > 1) {
        return `${remaining} songs left to finish this pack`;
      }
    }

    if (suggestion.type === "song") {
      // For songs with recent parts completed
      if (suggestion.recentParts && suggestion.recentParts.length > 0) {
        const formatPartName = (partName) =>
          partName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
        const completedParts = suggestion.recentParts.map(formatPartName);

        // Try to find incomplete parts
        if (suggestion.data.authoring && authoringFields.length > 0) {
          const incompleteParts = authoringFields
            .filter((field) => !suggestion.data.authoring[field])
            .map((field) => {
              // Format field name nicely
              return field
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
            })
            .slice(0, 3); // Limit to 3 parts

          if (incompleteParts.length > 0) {
            const completedText = completedParts.slice(0, 2).join(", ");
            const remainingText = incompleteParts.slice(0, 2).join(", ");
            if (completedParts.length === 1) {
              return `You recently completed ${completedText}, only ${remainingText} next!`;
            } else {
              return `You recently completed ${completedText}, only ${remainingText} next!`;
            }
          }
        }

        // Fallback if we can't determine remaining parts
        const partsText = completedParts.slice(0, 2).join(", ");
        return `You recently completed ${partsText}!`;
      }

      // For songs that are almost done
      if (
        suggestion.completion !== null &&
        suggestion.completion >= 80 &&
        suggestion.completion < 100
      ) {
        if (suggestion.data.authoring && authoringFields.length > 0) {
          const incompleteParts = authoringFields
            .filter((field) => !suggestion.data.authoring[field])
            .map((field) => {
              return field
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());
            })
            .slice(0, 3);

          if (incompleteParts.length > 0) {
            if (incompleteParts.length === 1) {
              return `Only ${incompleteParts[0]} to finish this song!`;
            } else if (incompleteParts.length === 2) {
              return `Only ${incompleteParts.join(
                " and "
              )} to finish this song!`;
            } else {
              return `Only ${incompleteParts.slice(0, 2).join(", ")} and ${
                incompleteParts.length - 2
              } more to finish this song!`;
            }
          }
        }
      }
    }

    // Fallback to time ago
    if (suggestion.lastActivity) {
      return formatTimeAgo(suggestion.lastActivity);
    }

    return null;
  };

  if (dashboardData.loading) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading your work...</p>
        </div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="user-dashboard">
        <div className="dashboard-error">
          <p>Unable to load your latest work</p>
          <button onClick={generateWorkSuggestions} className="retry-btn">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { suggestions } = dashboardData;

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>Pick up where you left off</h2>
          <button
            className="collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={
              isCollapsed ? "Expand suggestions" : "Collapse suggestions"
            }
          >
            {isCollapsed ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="suggestions-container">
          {suggestions.length > 0 ? (
            <div className="suggestions-list">
              {suggestions.slice(0, 6).map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="suggestion-item"
                  onClick={() => {
                    if (suggestion.type === "song") {
                      navigate(`/wip?song=${suggestion.data.id}`);
                    } else if (suggestion.type === "pack") {
                      navigate(`/wip?pack=${suggestion.data.id}`);
                    }
                  }}
                >
                  {suggestion.data.album_cover && (
                    <img
                      src={suggestion.data.album_cover}
                      alt={`${
                        suggestion.data.title ||
                        suggestion.data.display_name ||
                        suggestion.data.name
                      } cover`}
                      className="suggestion-album-art"
                    />
                  )}
                  <div className="suggestion-content">
                    <div className="suggestion-main">
                      <h3
                        className="suggestion-title"
                        title={
                          suggestion.data.title ||
                          suggestion.data.display_name ||
                          suggestion.data.name
                        }
                      >
                        {suggestion.data.title ||
                          suggestion.data.display_name ||
                          suggestion.data.name}
                      </h3>
                      {suggestion.type === "song" && (
                        <p className="suggestion-artist">
                          {suggestion.data.artist}
                        </p>
                      )}
                      {suggestion.type === "pack" && suggestion.packStats && (
                        <p className="suggestion-stats">
                          {suggestion.packStats.completedSongs}/
                          {suggestion.packStats.totalSongs} songs done
                        </p>
                      )}
                      <div className="suggestion-tags">
                        {suggestion.tags.map((tag, index) => (
                          <span key={index} className="suggestion-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {(() => {
                        const message = getSuggestionMessage(suggestion);
                        if (message) {
                          return <p className="suggestion-parts">{message}</p>;
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  {suggestion.completion !== null && (
                    <div className="suggestion-progress">
                      <div className="progress-circle-small">
                        <span>{Math.round(suggestion.completion)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No work suggestions available</p>
              <button onClick={() => navigate("/wip")} className="cta-btn">
                Start working
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
