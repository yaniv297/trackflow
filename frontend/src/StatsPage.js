import React, { useState, useEffect } from "react";
import { apiGet } from "./utils/api";

// Reusable card component
const StatCard = ({ title, value, icon, color = "#3498db" }) => (
  <div
    style={{
      background: color,
      color: "white",
      borderRadius: "12px",
      padding: "1rem",
      minWidth: "150px",
      textAlign: "center",
      flex: 1,
    }}
  >
    <div style={{ fontSize: "1.5rem" }}>{icon}</div>
    <h4 style={{ margin: "0.5rem 0" }}>{title}</h4>
    <p style={{ fontSize: "1.4rem", fontWeight: "bold" }}>{value}</p>
  </div>
);

const ExpandableList = ({
  title,
  items,
  itemKey,
  labelKey,
  countKey,
  imageKey = null,
  maxItems = 10,
  renderLabel,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  let displayItems;
  if (showAll) {
    displayItems = items;
  } else if (expanded) {
    displayItems = items.slice(0, 50);
  } else {
    displayItems = items.slice(0, maxItems);
  }

  const hasMore = items.length > maxItems;
  const hasMoreThan50 = items.length > 50;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "1rem 1.5rem",
        border: "1px solid #eee",
        marginBottom: "2rem",
      }}
    >
      <h3>{title}</h3>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "1rem" }}>
        {displayItems.map((item) => (
          <li
            key={item[itemKey]}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.4rem 0",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flex: 1,
              }}
            >
              {imageKey && item[imageKey] && (
                <img
                  src={item[imageKey]}
                  alt="album cover"
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: "cover",
                    borderRadius: 4,
                  }}
                />
              )}
              {renderLabel ? (
                <span>{renderLabel(item)}</span>
              ) : (
                <span>{item[labelKey] || "(none)"}</span>
              )}
            </div>
            <span style={{ fontWeight: "bold" }}>{item[countKey]}</span>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              style={{
                padding: "0.3rem 0.7rem",
                fontSize: "0.85rem",
                border: "none",
                background: "#eee",
                cursor: "pointer",
                borderRadius: "5px",
              }}
            >
              Show More (up to 50)
            </button>
          )}
          {expanded && !showAll && hasMoreThan50 && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                padding: "0.3rem 0.7rem",
                fontSize: "0.85rem",
                border: "none",
                background: "#007bff",
                color: "white",
                cursor: "pointer",
                borderRadius: "5px",
              }}
            >
              Show All ({items.length} total)
            </button>
          )}
          {(expanded || showAll) && (
            <button
              onClick={() => {
                setExpanded(false);
                setShowAll(false);
              }}
              style={{
                padding: "0.3rem 0.7rem",
                fontSize: "0.85rem",
                border: "none",
                background: "#6c757d",
                color: "white",
                cursor: "pointer",
                borderRadius: "5px",
              }}
            >
              Show Less
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [hoveredYear, setHoveredYear] = useState(null);
  const [yearDetails, setYearDetails] = useState({});
  const [loadingYear, setLoadingYear] = useState(null);

  useEffect(() => {
    apiGet("/stats/").then((data) => setStats(data));
  }, []);

  if (!stats) return <p style={{ padding: "2rem" }}>Loading stats...</p>;

  // Filter out empty/null packs
  const filteredTopPacks = (stats.top_packs || []).filter(
    (p) => p.pack && p.pack !== "(none)"
  );

  const handleYearHover = async (year) => {
    if (!yearDetails[year] && !loadingYear) {
      setLoadingYear(year);
      try {
        const response = await apiGet(`/stats/year/${year}/details`);
        const details = response;
        setYearDetails((prev) => ({ ...prev, [year]: details }));
      } catch (error) {
        console.error("Failed to fetch year details:", error);
      } finally {
        setLoadingYear(null);
      }
    }
    setHoveredYear(year);
  };

  const handleYearLeave = () => {
    setHoveredYear(null);
  };


  return (
    <div style={{ padding: "2rem" }}>
      <h2>📊 TrackFlow Stats</h2>

      {/* OVERVIEW CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard
          title="Released"
          value={stats.by_status["Released"] || 0}
          color="#28a745"
        />
        <StatCard title="Packs" value={stats.total_packs} color="#6f42c1" />
        <StatCard title="Artists" value={stats.total_artists} color="#fd7e14" />
        <StatCard
          title="Collaborators"
          value={stats.total_collaborators || 0}
          color="#e83e8c"
        />
      </div>

      {/* TOP ARTISTS */}
      <ExpandableList
        title="🎤 Top Artists"
        items={stats.top_artists}
        imageKey="artist_image_url"
        labelKey="artist"
        countKey="count"
        maxInitial={10}
        maxExpanded={50}
      />

      {/* TOP ALBUMS */}
      <ExpandableList
        title="💿 Top Albums"
        items={stats.top_albums}
        imageKey="album_cover"
        labelKey="album"
        countKey="count"
        maxInitial={10}
        maxExpanded={50}
      />

      {/* TOP PACKS */}
      <ExpandableList
        title="📦 Top Packs"
        items={filteredTopPacks}
        imageKey="artist_image_url"
        labelKey="pack"
        countKey="count"
        maxInitial={10}
        maxExpanded={50}
      />

      {/* TOP COLLABORATORS */}
      {stats.top_collaborators && stats.top_collaborators.length > 0 && (
        <ExpandableList
          title="🤝 Top Collaborators"
          items={stats.top_collaborators}
          itemKey="author"
          labelKey="author"
          countKey="count"
          maxItems={10}
        />
      )}

      {/* YEAR DISTRIBUTION */}
      {stats.year_distribution && stats.year_distribution.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            border: "1px solid #eee",
            marginBottom: "2rem",
          }}
        >
          <h3>📅 Songs by Year</h3>
          <div style={{ marginTop: "1rem" }}>
            {stats.year_distribution.map(({ year, count }) => (
              <div
                key={year}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                  gap: "1rem",
                  position: "relative",
                  cursor: "pointer",
                }}
                onMouseEnter={() => handleYearHover(year)}
                onMouseLeave={handleYearLeave}
              >
                <div style={{ minWidth: "60px", fontWeight: "bold" }}>
                  {year}
                </div>
                <div
                  style={{
                    background: "#ddd",
                    borderRadius: "4px",
                    height: "20px",
                    flex: 1,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      background: "#3498db",
                      width: `${Math.min(
                        (count /
                          Math.max(
                            ...stats.year_distribution.map((y) => y.count)
                          )) *
                          100,
                        100
                      )}%`,
                      height: "100%",
                      borderRadius: "4px",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <div
                  style={{
                    minWidth: "40px",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  {count}
                </div>

                {/* Hover Popup */}
                {hoveredYear === year && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "-10px",
                      transform: "translateX(-50%)",
                      background: "#fff",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      padding: "1rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      zIndex: 1000,
                      minWidth: "250px",
                    }}
                  >
                    <h4 style={{ margin: "0 0 0.5rem 0", color: "#333" }}>
                      {year} (
                      {yearDetails[year]?.total_songs || loadingYear === year
                        ? "..."
                        : count}{" "}
                      songs)
                    </h4>

                    {loadingYear === year ? (
                      <div style={{ color: "#666", fontSize: "0.9em" }}>
                        Loading...
                      </div>
                    ) : yearDetails[year] ? (
                      <div>
                        {yearDetails[year].top_artists.length > 0 && (
                          <div style={{ marginBottom: "0.5rem" }}>
                            <strong
                              style={{ fontSize: "0.9em", color: "#666" }}
                            >
                              Top Artists:
                            </strong>
                            <div style={{ fontSize: "0.85em" }}>
                              {yearDetails[year].top_artists.map(
                                ({ artist, count }, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      marginTop: "0.2rem",
                                    }}
                                  >
                                    {yearDetails[year].top_artists[idx]
                                      .artist_image_url && (
                                      <img
                                        src={
                                          yearDetails[year].top_artists[idx]
                                            .artist_image_url
                                        }
                                        alt={artist}
                                        style={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: "50%",
                                        }}
                                      />
                                    )}
                                    <span>{artist}</span>
                                    <span
                                      style={{
                                        marginLeft: "auto",
                                        fontWeight: 600,
                                        color: "#3498db",
                                      }}
                                    >
                                      {count}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {yearDetails[year].top_albums.length > 0 && (
                          <div>
                            <strong
                              style={{ fontSize: "0.9em", color: "#666" }}
                            >
                              Top Albums:
                            </strong>
                            <div style={{ fontSize: "0.85em" }}>
                              {yearDetails[year].top_albums.map(
                                ({ album, count }, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                      marginTop: "0.2rem",
                                    }}
                                  >
                                    {yearDetails[year].top_albums[idx]
                                      .album_cover && (
                                      <img
                                        src={
                                          yearDetails[year].top_albums[idx]
                                            .album_cover
                                        }
                                        alt={album}
                                        style={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: "4px",
                                          objectFit: "cover",
                                        }}
                                      />
                                    )}
                                    <span>{album}</span>
                                    <span
                                      style={{
                                        marginLeft: "auto",
                                        fontWeight: 600,
                                        color: "#3498db",
                                      }}
                                    >
                                      {count}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: "#666", fontSize: "0.9em" }}>
                        Hover to load details...
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
