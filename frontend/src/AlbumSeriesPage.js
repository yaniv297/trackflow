import React, { useState, useEffect } from "react";
import { apiGet } from "./utils/api";
import API_BASE_URL from "./config";

const AlbumSeriesPage = () => {
  const [albumSeries, setAlbumSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSeries, setExpandedSeries] = useState(new Set());
  const [seriesDetails, setSeriesDetails] = useState({});

  useEffect(() => {
    fetchAlbumSeries();
  }, []);

  const fetchAlbumSeries = async () => {
    try {
      setLoading(true);
      const data = await apiGet("/album-series/");

      // Debug: log completion percentages from API
      const inProgressSeries = data.filter(
        (series) => series.status === "in_progress"
      );

      setAlbumSeries(data);

      // Pre-fetch series details for all "in_progress" series to calculate accurate percentages
      // Only fetch if backend didn't provide completion_percentage
      const seriesNeedingDetails = inProgressSeries.filter(
        (series) =>
          series.completion_percentage === undefined ||
          series.completion_percentage === null
      );

      if (seriesNeedingDetails.length > 0) {
        // Fetch all in_progress series details in parallel
        const detailPromises = seriesNeedingDetails.map((series) =>
          apiGet(`/album-series/${series.id}`).catch((err) => {
            console.error(
              `Error fetching details for series ${series.id}:`,
              err
            );
            return null;
          })
        );

        const details = await Promise.all(detailPromises);
        const detailsMap = {};
        seriesNeedingDetails.forEach((series, index) => {
          if (details[index]) {
            detailsMap[series.id] = details[index];
          }
        });

        setSeriesDetails((prev) => ({ ...prev, ...detailsMap }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeriesDetails = async (seriesId) => {
    if (seriesDetails[seriesId]) return; // Already fetched

    try {
      const data = await apiGet(`/album-series/${seriesId}`);
      setSeriesDetails((prev) => ({
        ...prev,
        [seriesId]: data,
      }));
    } catch (err) {
      console.error("Error fetching series details:", err);
    }
  };

  const fetchAlbumArtForSeries = async (seriesId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/album-series/${seriesId}/fetch-album-art`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to fetch album art");
      }

      const result = await response.json();
      window.showNotification(result.message, "success");

      // Refresh the album series list to show the new cover art
      fetchAlbumSeries();
    } catch (error) {
      window.showNotification(
        `Failed to fetch album art: ${error.message}`,
        "error"
      );
    }
  };

  const toggleSeries = (seriesId) => {
    const newExpanded = new Set(expandedSeries);
    if (newExpanded.has(seriesId)) {
      newExpanded.delete(seriesId);
    } else {
      newExpanded.add(seriesId);
      fetchSeriesDetails(seriesId);
    }
    setExpandedSeries(newExpanded);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "released":
        return "#4CAF50";
      case "in_progress":
        return "#FF9800";
      case "planned":
        return "#2196F3";
      default:
        return "#757575";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "released":
        return "Released";
      case "in_progress":
        return "In Progress";
      case "planned":
        return "Planned";
      default:
        return status;
    }
  };

  const getAuthorsForSong = (song) => {
    const authors = [];
    if (song.author) {
      authors.push(song.author);
    }
    if (song.collaborations) {
      song.collaborations.forEach((collab) => {
        if (collab.author && !authors.includes(collab.author)) {
          authors.push(collab.author);
        }
      });
    }
    return authors;
  };

  const calculateSeriesCompletion = (series) => {
    if (series.status !== "in_progress") return null;

    // Prefer backend-calculated percentage if available (most accurate)
    if (
      series.completion_percentage !== undefined &&
      series.completion_percentage !== null
    ) {
      return series.completion_percentage;
    }

    // Fallback to frontend calculation from series details
    const authoringFields = [
      "demucs",
      "midi",
      "tempo_map",
      "fake_ending",
      "drums",
      "bass",
      "guitar",
      "vocals",
      "harmonies",
      "pro_keys",
      "keys",
      "animations",
      "drum_fills",
      "overdrive",
      "compile",
    ];

    // Get songs for this series (both album songs and bonus songs, but exclude optional songs)
    const albumSongs = seriesDetails[series.id]?.album_songs || [];
    const bonusSongs = seriesDetails[series.id]?.bonus_songs || [];
    const allSongs = [...albumSongs, ...bonusSongs];
    const coreSongs = allSongs.filter((song) => !song.optional);

    if (coreSongs.length === 0) return 0;

    const totalParts = coreSongs.length * authoringFields.length;
    const filledParts = coreSongs.reduce((acc, song) => {
      return (
        acc + authoringFields.filter((field) => song.authoring?.[field]).length
      );
    }, 0);

    return totalParts > 0 ? Math.round((filledParts / totalParts) * 100) : 0;
  };

  const calculateSongCompletion = (song) => {
    // Use the song's actual authoring object (which contains only the song owner's workflow steps)
    // No hardcoded fields - the backend already provides only the relevant workflow steps
    if (!song.authoring) {
      return 0;
    }

    // Get all workflow steps from authoring (exclude 'id' and 'song_id' metadata fields)
    const workflowSteps = Object.keys(song.authoring).filter(
      (key) => key !== "id" && key !== "song_id"
    );

    if (workflowSteps.length === 0) {
      return 0;
    }

    // Count completed steps (where value is true)
    const completedSteps = workflowSteps.filter(
      (step) => song.authoring[step] === true
    ).length;

    return Math.round((completedSteps / workflowSteps.length) * 100);
  };

  const renderSongList = (songs, title, color, showCompletion = false) => {
    if (!songs || songs.length === 0) return null;

    // Sort songs by completion percentage if showCompletion is true
    const sortedSongs = showCompletion
      ? [...songs].sort((a, b) => {
          const aCompletion = calculateSongCompletion(a);
          const bCompletion = calculateSongCompletion(b);
          return bCompletion - aCompletion; // Sort descending (highest first)
        })
      : songs;

    return (
      <div style={{ marginTop: "1rem" }}>
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            color: "#333",
            marginBottom: "0.75rem",
            paddingBottom: "0.25rem",
            borderBottom: `2px solid ${color}`,
          }}
        >
          {title} ({songs.length})
        </h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {sortedSongs.map((song, index) => {
            const authors = getAuthorsForSong(song);
            const songCompletion = showCompletion
              ? calculateSongCompletion(song)
              : null;

            return (
              <div
                key={song.id}
                style={{
                  padding: "0.75rem",
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #e0e0e0",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: "1" }}>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      color: "#333",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {index + 1}. {song.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#666",
                      marginBottom: showCompletion ? "0.5rem" : "0",
                    }}
                  >
                    {song.artist}
                  </div>
                  {showCompletion && songCompletion !== null && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: "600",
                            color: "#495057",
                          }}
                        >
                          Progress
                        </span>
                        <div
                          style={{
                            background: "#e9ecef",
                            borderRadius: "4px",
                            height: "6px",
                            overflow: "hidden",
                            width: "100px",
                          }}
                        >
                          <div
                            style={{
                              background:
                                songCompletion === 100 ? "#28a745" : "#007bff",
                              width: `${songCompletion}%`,
                              height: "100%",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        {songCompletion !== 100 && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: "600",
                              color: "#007bff",
                            }}
                          >
                            {songCompletion}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: "0.25rem",
                  }}
                >
                  {authors.map((author, authorIndex) => (
                    <div
                      key={authorIndex}
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        backgroundColor: "#2196F3",
                        color: "white",
                      }}
                    >
                      {author}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.2rem", color: "#666" }}>
          Loading album series...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ color: "#f44336", fontSize: "1.2rem" }}>
          Error: {error}
        </div>
      </div>
    );
  }

  // Sort WIP series by completion percentage (highest first)
  const wipSeries = albumSeries
    .filter((series) => series.status === "in_progress")
    .sort((a, b) => {
      const aCompletion = calculateSeriesCompletion(a) || 0;
      const bCompletion = calculateSeriesCompletion(b) || 0;
      return bCompletion - aCompletion; // Highest first
    });

  const plannedSeries = albumSeries
    .filter((series) => series.status === "planned")
    .sort((a, b) => {
      const aCompletion = calculateSeriesCompletion(a) || 0;
      const bCompletion = calculateSeriesCompletion(b) || 0;
      return bCompletion - aCompletion; // Highest first
    });

  const releasedSeries = albumSeries.filter(
    (series) => series.status === "released"
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            color: "#333",
            marginBottom: "0.5rem",
          }}
        >
          Album Series
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "#666",
            marginBottom: "1rem",
          }}
        >
          A collaborative project featuring complete album releases and bonus
          tracks
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "20px",
              fontSize: "0.9rem",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#4CAF50",
              }}
            ></div>
            Released
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "20px",
              fontSize: "0.9rem",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#FF9800",
              }}
            ></div>
            In Progress
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "20px",
              fontSize: "0.9rem",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#2196F3",
              }}
            ></div>
            Planned
          </div>
        </div>
      </div>

      {/* Released Series */}
      {releasedSeries.length > 0 && (
        <div style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#333",
              marginBottom: "1.5rem",
            }}
          >
            Released
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {releasedSeries.map((series) => {
              const isExpanded = expandedSeries.has(series.id);
              const details = seriesDetails[series.id];

              return (
                <div
                  key={series.id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    backgroundColor: "white",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    height: "fit-content",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 15px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => toggleSeries(series.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {/* Album Cover */}
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        border: "1px solid #e0e0e0",
                        overflow: "hidden",
                      }}
                    >
                      {series.cover_image_url ? (
                        <img
                          src={series.cover_image_url}
                          alt={`${series.album_name} cover`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: "2rem",
                            color: "#ccc",
                            textAlign: "center",
                          }}
                        >
                          🎵
                        </div>
                      )}
                    </div>

                    {/* Series Info */}
                    <div style={{ flex: "1", minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                            color: "#333",
                            lineHeight: "1.2",
                          }}
                        >
                          #{series.series_number}
                        </div>
                        <div
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            backgroundColor: getStatusColor(series.status),
                            color: "white",
                          }}
                        >
                          {getStatusText(series.status)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "600",
                          color: "#555",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {series.album_name}
                      </div>
                      <div
                        style={{
                          fontSize: "1rem",
                          color: "#777",
                          marginBottom: "0.5rem",
                        }}
                      >
                        by {series.artist_name}
                      </div>
                      {series.year && (
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#999",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {series.year}
                        </div>
                      )}
                      {series.authors && series.authors.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              display: "inline-block",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            {series.song_count} song
                            {series.song_count === 1 ? "" : "s"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#666",
                              fontStyle: "italic",
                            }}
                          >
                            by {series.authors.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {series.description && (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        color: "#666",
                        lineHeight: "1.4",
                        marginBottom: "1rem",
                      }}
                    >
                      {series.description}
                    </div>
                  )}

                  {/* Expand/Collapse Indicator */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "1rem",
                      borderTop: "1px solid #f0f0f0",
                      fontSize: "0.9rem",
                      color: "#888",
                    }}
                  >
                    <span>
                      {isExpanded ? "Click to collapse" : "Click to expand"}
                    </span>
                    <span
                      style={{
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        fontSize: "1.2rem",
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && details && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid #f0f0f0",
                      }}
                    >
                      {renderSongList(
                        details.album_songs.filter((song) => !song.optional),
                        "Album Songs",
                        "#4CAF50",
                        false
                      )}
                      {renderSongList(
                        details.bonus_songs.filter((song) => !song.optional),
                        "Bonus Songs",
                        "#FF9800",
                        false
                      )}
                      {renderSongList(
                        [...details.album_songs, ...details.bonus_songs].filter(
                          (song) => song.optional
                        ),
                        "Optional Songs",
                        "#9E9E9E",
                        false
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WIP Series */}
      {wipSeries.length > 0 && (
        <div style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#333",
              marginBottom: "1.5rem",
            }}
          >
            Work in Progress
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {wipSeries.map((series) => {
              const isExpanded = expandedSeries.has(series.id);
              const details = seriesDetails[series.id];

              return (
                <div
                  key={series.id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    backgroundColor: "white",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    height: "fit-content",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 15px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => toggleSeries(series.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {/* Album Cover */}
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        border: "1px solid #e0e0e0",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {series.cover_image_url ? (
                        <img
                          src={series.cover_image_url}
                          alt={`${series.album_name} cover`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: "2rem",
                            color: "#ccc",
                            textAlign: "center",
                          }}
                        >
                          🎵
                        </div>
                      )}
                      {/* Fetch Album Art Button */}
                      {!series.cover_image_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchAlbumArtForSeries(series.id);
                          }}
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            background: "#9C27B0",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "2px 4px",
                            fontSize: "0.6rem",
                            cursor: "pointer",
                            zIndex: 10,
                          }}
                          title="Fetch album art"
                        >
                          🎨
                        </button>
                      )}
                    </div>

                    {/* Series Info */}
                    <div style={{ flex: "1", minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                            color: "#333",
                            lineHeight: "1.2",
                          }}
                        >
                          {series.series_number
                            ? `#${series.series_number}`
                            : ""}
                        </div>
                        <div
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            backgroundColor: getStatusColor(series.status),
                            color: "white",
                          }}
                        >
                          {getStatusText(series.status)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "600",
                          color: "#555",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {series.album_name}
                      </div>
                      <div
                        style={{
                          fontSize: "1rem",
                          color: "#777",
                          marginBottom: "0.5rem",
                        }}
                      >
                        by {series.artist_name}
                      </div>
                      {series.year && (
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#999",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {series.year}
                        </div>
                      )}
                      {series.authors && series.authors.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              display: "inline-block",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            {series.song_count} song
                            {series.song_count === 1 ? "" : "s"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#666",
                              fontStyle: "italic",
                            }}
                          >
                            by {series.authors.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {series.description && (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        color: "#666",
                        lineHeight: "1.4",
                        marginBottom: "1rem",
                      }}
                    >
                      {series.description}
                    </div>
                  )}

                  {/* Completion Progress for In Progress series */}
                  {series.status === "in_progress" &&
                    (() => {
                      // Fetch series details if not already loaded (fallback)
                      if (!seriesDetails[series.id]) {
                        fetchSeriesDetails(series.id);
                        // Return null while loading to avoid showing incorrect percentage
                        return null;
                      }
                      const completion = calculateSeriesCompletion(series);
                      return completion !== null ? (
                        <div
                          style={{
                            marginBottom: "1rem",
                            padding: "0.75rem",
                            background: "#f8f9fa",
                            borderRadius: "8px",
                            border: "1px solid #e9ecef",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                color: "#495057",
                              }}
                            >
                              Completion Progress
                            </span>
                            <span
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: "600",
                                color:
                                  completion === 100 ? "#28a745" : "#007bff",
                              }}
                            >
                              {completion}%
                            </span>
                          </div>
                          <div
                            style={{
                              background: "#e9ecef",
                              borderRadius: "4px",
                              height: "8px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                background:
                                  completion === 100 ? "#28a745" : "#007bff",
                                width: `${completion}%`,
                                height: "100%",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        </div>
                      ) : null;
                    })()}

                  {/* Expand/Collapse Indicator */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "1rem",
                      borderTop: "1px solid #f0f0f0",
                      fontSize: "0.9rem",
                      color: "#888",
                    }}
                  >
                    <span>
                      {isExpanded ? "Click to collapse" : "Click to expand"}
                    </span>
                    <span
                      style={{
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        fontSize: "1.2rem",
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && details && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid #f0f0f0",
                      }}
                    >
                      {renderSongList(
                        details.album_songs.filter((song) => !song.optional),
                        "Album Songs",
                        "#4CAF50",
                        series.status === "in_progress"
                      )}
                      {renderSongList(
                        details.bonus_songs.filter((song) => !song.optional),
                        "Bonus Songs",
                        "#FF9800",
                        series.status === "in_progress"
                      )}
                      {renderSongList(
                        [...details.album_songs, ...details.bonus_songs].filter(
                          (song) => song.optional
                        ),
                        "Optional Songs",
                        "#9E9E9E",
                        series.status === "in_progress"
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Planned Series */}
      {plannedSeries.length > 0 && (
        <div style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#333",
              marginBottom: "1.5rem",
            }}
          >
            Planned
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {plannedSeries.map((series) => {
              const isExpanded = expandedSeries.has(series.id);
              const details = seriesDetails[series.id];

              return (
                <div
                  key={series.id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    backgroundColor: "white",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                    height: "fit-content",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 15px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => toggleSeries(series.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {/* Album Cover */}
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        border: "1px solid #e0e0e0",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {series.cover_image_url ? (
                        <img
                          src={series.cover_image_url}
                          alt={`${series.album_name} cover`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: "2rem",
                            color: "#ccc",
                            textAlign: "center",
                          }}
                        >
                          🎵
                        </div>
                      )}
                      {/* Fetch Album Art Button */}
                      {!series.cover_image_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchAlbumArtForSeries(series.id);
                          }}
                          style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            background: "#9C27B0",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            padding: "2px 4px",
                            fontSize: "0.6rem",
                            cursor: "pointer",
                            zIndex: 10,
                          }}
                          title="Fetch album art"
                        >
                          🎨
                        </button>
                      )}
                    </div>

                    {/* Series Info */}
                    <div style={{ flex: "1", minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                            color: "#333",
                            lineHeight: "1.2",
                          }}
                        >
                          {series.series_number
                            ? `#${series.series_number}`
                            : ""}
                        </div>
                        <div
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            backgroundColor: getStatusColor(series.status),
                            color: "white",
                          }}
                        >
                          {getStatusText(series.status)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "600",
                          color: "#555",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {series.album_name}
                      </div>
                      <div
                        style={{
                          fontSize: "1rem",
                          color: "#777",
                          marginBottom: "0.5rem",
                        }}
                      >
                        by {series.artist_name}
                      </div>
                      {series.year && (
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#999",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {series.year}
                        </div>
                      )}
                      {series.authors && series.authors.length > 0 && (
                        <div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              display: "inline-block",
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            {series.song_count} song
                            {series.song_count === 1 ? "" : "s"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#666",
                              fontStyle: "italic",
                            }}
                          >
                            by {series.authors.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {series.description && (
                    <div
                      style={{
                        fontSize: "0.9rem",
                        color: "#666",
                        lineHeight: "1.4",
                        marginBottom: "1rem",
                      }}
                    >
                      {series.description}
                    </div>
                  )}

                  {/* Expand/Collapse Indicator */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: "1rem",
                      borderTop: "1px solid #f0f0f0",
                      fontSize: "0.9rem",
                      color: "#888",
                    }}
                  >
                    <span>
                      {isExpanded ? "Click to collapse" : "Click to expand"}
                    </span>
                    <span
                      style={{
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                        fontSize: "1.2rem",
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && details && (
                    <div
                      style={{
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid #f0f0f0",
                      }}
                    >
                      {renderSongList(
                        details.album_songs.filter((song) => !song.optional),
                        "Album Songs",
                        "#4CAF50",
                        false
                      )}
                      {renderSongList(
                        details.bonus_songs.filter((song) => !song.optional),
                        "Bonus Songs",
                        "#FF9800",
                        false
                      )}
                      {renderSongList(
                        [...details.album_songs, ...details.bonus_songs].filter(
                          (song) => song.optional
                        ),
                        "Optional Songs",
                        "#9E9E9E",
                        false
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumSeriesPage;
