import React, { useMemo } from "react";
import { useStatsData } from "../hooks/stats/useStatsData";
import { useYearDetails } from "../hooks/stats/useYearDetails";
import { useDecadeDetails } from "../hooks/stats/useDecadeDetails";
import { filterTopPacks } from "../utils/statsUtils";
import StatCard from "../components/stats/StatCard";
import ExpandableList from "../components/stats/ExpandableList";
import YearDistribution from "../components/stats/YearDistribution";
import DecadeDistribution from "../components/stats/DecadeDistribution";
export default function StatsPage() {
  const { stats, loading } = useStatsData();
  const {
    hoveredYear,
    yearDetails,
    loadingYear,
    handleYearHover,
    handleYearLeave,
  } = useYearDetails();
  const {
    hoveredDecade,
    decadeDetails,
    loadingDecade,
    handleDecadeHover,
    handleDecadeLeave,
  } = useDecadeDetails();

  // Filter out empty/null packs
  const filteredTopPacks = useMemo(() => {
    return filterTopPacks(stats?.top_packs);
  }, [stats?.top_packs]);

  if (!stats) {
    return <p style={{ padding: "2rem" }}>Loading stats...</p>;
  }

  // Check if there are any released songs
  const hasReleasedSongs = (stats.by_status["Released"] || 0) > 0;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📊 TrackFlow Stats</h2>
      
      {!hasReleasedSongs && (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 2rem",
            marginBottom: "2rem",
            background: "#f8f9fa",
            borderRadius: "12px",
            border: "1px solid #dee2e6",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
              opacity: 0.6,
            }}
          >
            📊
          </div>
          <h3
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
              color: "#333",
            }}
          >
            No Stats Yet
          </h3>
          <p
            style={{
              fontSize: "1rem",
              color: "#666",
              maxWidth: "500px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            Complete and release songs to get your stats! Once you release your first song, 
            you'll see your top artists, albums, packs, and more here.
          </p>
        </div>
      )}

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

      {hasReleasedSongs && (
        <>
          {/* TOP ARTISTS */}
          <ExpandableList
            title="🎤 Top Artists"
            items={stats.top_artists}
            imageKey="artist_image_url"
            labelKey="artist"
            countKey="count"
            itemKey="artist"
            maxItems={10}
          />

          {/* TOP ALBUMS */}
          <ExpandableList
            title="💿 Top Albums"
            items={stats.top_albums}
            imageKey="album_cover"
            labelKey="album"
            countKey="count"
            itemKey="album"
            maxItems={10}
          />

          {/* TOP PACKS */}
          <ExpandableList
            title="📦 Top Packs"
            items={filteredTopPacks}
            imageKey="artist_image_url"
            labelKey="pack"
            countKey="count"
            itemKey="pack"
            maxItems={10}
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
          <YearDistribution
            yearDistribution={stats.year_distribution}
            hoveredYear={hoveredYear}
            yearDetails={yearDetails}
            loadingYear={loadingYear}
            onYearHover={handleYearHover}
            onYearLeave={handleYearLeave}
          />

          {/* DECADE DISTRIBUTION */}
          <DecadeDistribution
            decadeDistribution={stats.decade_distribution}
            hoveredDecade={hoveredDecade}
            decadeDetails={decadeDetails}
            loadingDecade={loadingDecade}
            onDecadeHover={handleDecadeHover}
            onDecadeLeave={handleDecadeLeave}
          />
        </>
      )}
    </div>
  );
}
