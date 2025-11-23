import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import API_BASE_URL from "../config";

const AlbumSeriesDetailPage = () => {
  const { id } = useParams();
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSeriesDetail();
  }, [id]);

  const fetchSeriesDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/album-series/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch album series details");
      }
      const data = await response.json();
      setSeries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.2rem", color: "#666" }}>
          Loading album series details...
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

  if (!series) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.2rem", color: "#666" }}>
          Album series not found
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          to="/album-series"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#666",
            textDecoration: "none",
            fontSize: "0.9rem",
            marginBottom: "1rem",
          }}
        >
          ← Back to Album Series
        </Link>

        <div
          style={{
            display: "flex",
            gap: "2rem",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Album Cover */}
          <div
            style={{
              width: "250px",
              height: "250px",
              backgroundColor: "#f0f0f0",
              borderRadius: "12px",
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
                  fontSize: "4rem",
                  color: "#ccc",
                  textAlign: "center",
                }}
              >
                🎵
              </div>
            )}
          </div>

          {/* Series Info */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                #{series.series_number}
              </div>
              <div
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                  backgroundColor: getStatusColor(series.status) + "20",
                  color: getStatusColor(series.status),
                  border: `1px solid ${getStatusColor(series.status)}40`,
                }}
              >
                {getStatusText(series.status)}
              </div>
            </div>

            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "#333",
                marginBottom: "0.5rem",
                lineHeight: "1.2",
              }}
            >
              {series.album_name}
            </h1>

            <div
              style={{
                fontSize: "1.3rem",
                color: "#666",
                marginBottom: "1rem",
              }}
            >
              {series.artist_name}
            </div>

            {series.year && (
              <div
                style={{
                  fontSize: "1rem",
                  color: "#888",
                  marginBottom: "1rem",
                }}
              >
                Released: {series.year}
              </div>
            )}

            {series.description && (
              <div
                style={{
                  fontSize: "1rem",
                  color: "#666",
                  lineHeight: "1.5",
                  marginBottom: "1rem",
                }}
              >
                {series.description}
              </div>
            )}

            <div
              style={{
                fontSize: "1rem",
                color: "#666",
              }}
            >
              Total songs: {series.total_songs}
            </div>
          </div>
        </div>
      </div>

      {/* Songs Sections */}
      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        {/* Album Songs */}
        <div style={{ flex: "1", minWidth: "400px" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              color: "#333",
              marginBottom: "1rem",
              paddingBottom: "0.5rem",
              borderBottom: "2px solid #4CAF50",
            }}
          >
            Album Songs ({series.album_songs.length})
          </h2>

          {series.album_songs.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {series.album_songs.map((song, index) => (
                <Link
                  key={song.id}
                  to={`/songs/${song.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "white",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                      e.currentTarget.style.borderColor = "#4CAF50";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.borderColor = "#e0e0e0";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "1rem",
                            fontWeight: "500",
                            color: "#333",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {index + 1}. {song.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#666",
                          }}
                        >
                          {song.artist}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          fontWeight: "500",
                          backgroundColor: "#2196F3",
                          color: "white",
                        }}
                      >
                        {song.author || "Unknown"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#666",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
              }}
            >
              No album songs found
            </div>
          )}
        </div>

        {/* Bonus Songs */}
        <div style={{ flex: "1", minWidth: "400px" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              color: "#333",
              marginBottom: "1rem",
              paddingBottom: "0.5rem",
              borderBottom: "2px solid #FF9800",
            }}
          >
            Bonus Songs ({series.bonus_songs.length})
          </h2>

          {series.bonus_songs.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {series.bonus_songs.map((song, index) => (
                <Link
                  key={song.id}
                  to={`/songs/${song.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "white",
                      border: "1px solid #e0e0e0",
                      borderRadius: "8px",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                      e.currentTarget.style.borderColor = "#FF9800";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.borderColor = "#e0e0e0";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "1rem",
                            fontWeight: "500",
                            color: "#333",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {index + 1}. {song.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "#666",
                          }}
                        >
                          {song.artist}
                        </div>
                        {song.album && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#888",
                              fontStyle: "italic",
                            }}
                          >
                            from {song.album}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.8rem",
                          fontWeight: "500",
                          backgroundColor: "#2196F3",
                          color: "white",
                        }}
                      >
                        {song.author || "Unknown"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#666",
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
              }}
            >
              No bonus songs found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumSeriesDetailPage;
