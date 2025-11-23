import React, { useMemo } from "react";
import { useAlbumSeriesData } from "./hooks/albumSeries/useAlbumSeriesData";
import { useAlbumSeriesOperations } from "./hooks/albumSeries/useAlbumSeriesOperations";
import { useAlbumSeriesUI } from "./hooks/albumSeries/useAlbumSeriesUI";
import { calculateSeriesCompletion } from "./utils/albumSeriesUtils";
import SeriesCard from "./components/albumSeries/SeriesCard";
import StatusLegend from "./components/albumSeries/StatusLegend";
import LoadingSpinner from "./components/ui/LoadingSpinner";

const AlbumSeriesPage = () => {
  // Data fetching
  const {
    albumSeries,
    loading,
    error,
    seriesDetails,
    fetchAlbumSeries,
    fetchSeriesDetails,
  } = useAlbumSeriesData();

  // Operations
  const { fetchAlbumArtForSeries } = useAlbumSeriesOperations(fetchAlbumSeries);

  // UI state
  const { expandedSeries, toggleSeries } = useAlbumSeriesUI(fetchSeriesDetails);

  // Sort and filter series by status
  const wipSeries = useMemo(() => {
    return albumSeries
      .filter((series) => series.status === "in_progress")
      .sort((a, b) => {
        const aCompletion = calculateSeriesCompletion(a, seriesDetails) || 0;
        const bCompletion = calculateSeriesCompletion(b, seriesDetails) || 0;
        return bCompletion - aCompletion; // Highest first
      });
  }, [albumSeries, seriesDetails]);

  const plannedSeries = useMemo(() => {
    return albumSeries
      .filter((series) => series.status === "planned")
      .sort((a, b) => {
        const aCompletion = calculateSeriesCompletion(a, seriesDetails) || 0;
        const bCompletion = calculateSeriesCompletion(b, seriesDetails) || 0;
        return bCompletion - aCompletion; // Highest first
      });
  }, [albumSeries, seriesDetails]);

  const releasedSeries = useMemo(() => {
    return albumSeries.filter((series) => series.status === "released");
  }, [albumSeries]);

  if (loading) {
    return <LoadingSpinner message="Loading album series..." />;
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

  const renderSeriesSection = (title, seriesList) => {
    if (seriesList.length === 0) return null;

    return (
      <div style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            color: "#333",
            marginBottom: "1.5rem",
          }}
        >
          {title}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {seriesList.map((series) => {
            const isExpanded = expandedSeries.has(series.id);
            const details = seriesDetails[series.id];

            return (
              <SeriesCard
                key={series.id}
                series={series}
                isExpanded={isExpanded}
                details={details}
                onToggle={toggleSeries}
                fetchAlbumArtForSeries={fetchAlbumArtForSeries}
                seriesDetails={seriesDetails}
                fetchSeriesDetails={fetchSeriesDetails}
              />
            );
          })}
        </div>
      </div>
    );
  };

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
        <StatusLegend />
      </div>

      {renderSeriesSection("Released", releasedSeries)}
      {renderSeriesSection("Work in Progress", wipSeries)}
      {renderSeriesSection("Planned", plannedSeries)}
    </div>
  );
};

export default AlbumSeriesPage;
