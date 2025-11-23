import React from "react";
import SongList from "./SongList";
import {
  getStatusColor,
  getStatusText,
  calculateSeriesCompletion,
} from "../../utils/albumSeriesUtils";

/**
 * Component for rendering a single album series card
 */
const SeriesCard = ({
  series,
  isExpanded,
  details,
  onToggle,
  fetchAlbumArtForSeries,
  seriesDetails,
  fetchSeriesDetails,
}) => {
  return (
    <div
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
        e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
      onClick={() => onToggle(series.id)}
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
          {/* Fetch Album Art Button - only show for WIP and Planned */}
          {!series.cover_image_url &&
            (series.status === "in_progress" ||
              series.status === "planned") && (
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
              {series.series_number ? `#${series.series_number}` : ""}
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
                {series.song_count} song{series.song_count === 1 ? "" : "s"}
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
          // Fetch series details if not already loaded
          if (!seriesDetails[series.id]) {
            fetchSeriesDetails(series.id);
          }
          const completion = calculateSeriesCompletion(series, seriesDetails);
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
                    color: completion === 100 ? "#28a745" : "#007bff",
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
                    background: completion === 100 ? "#28a745" : "#007bff",
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
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
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
          <SongList
            songs={details.album_songs.filter((song) => !song.optional)}
            title="Album Songs"
            color="#4CAF50"
            showCompletion={series.status === "in_progress"}
          />
          <SongList
            songs={details.bonus_songs.filter((song) => !song.optional)}
            title="Bonus Songs"
            color="#FF9800"
            showCompletion={series.status === "in_progress"}
          />
          <SongList
            songs={[...details.album_songs, ...details.bonus_songs].filter(
              (song) => song.optional
            )}
            title="Optional Songs"
            color="#9E9E9E"
            showCompletion={series.status === "in_progress"}
          />
        </div>
      )}
    </div>
  );
};

export default SeriesCard;

