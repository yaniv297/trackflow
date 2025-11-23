import React from "react";
import YearHoverPopup from "./YearHoverPopup";

/**
 * Component for displaying year distribution chart
 */
const YearDistribution = ({
  yearDistribution,
  hoveredYear,
  yearDetails,
  loadingYear,
  onYearHover,
  onYearLeave,
}) => {
  if (!yearDistribution || yearDistribution.length === 0) {
    return null;
  }

  const maxCount = Math.max(...yearDistribution.map((y) => y.count));

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
      <h3>📅 Songs by Year</h3>
      <div style={{ marginTop: "1rem" }}>
        {yearDistribution.map(({ year, count }) => (
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
            onMouseEnter={() => onYearHover(year)}
            onMouseLeave={onYearLeave}
          >
            <div style={{ minWidth: "60px", fontWeight: "bold" }}>{year}</div>
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
                  width: `${Math.min((count / maxCount) * 100, 100)}%`,
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
              <YearHoverPopup
                year={year}
                count={count}
                yearDetails={yearDetails}
                loadingYear={loadingYear}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default YearDistribution;

