import React, { useState, useMemo } from "react";
import DecadeHoverPopup from "./DecadeHoverPopup";

/**
 * Component for displaying decade distribution chart
 */
const DecadeDistribution = ({
  decadeDistribution,
  hoveredDecade,
  decadeDetails,
  loadingDecade,
  onDecadeHover,
  onDecadeLeave,
}) => {
  const [sortByCount, setSortByCount] = useState(false);

  const sortedDistribution = useMemo(() => {
    if (!decadeDistribution) return [];
    if (sortByCount) {
      return [...decadeDistribution].sort((a, b) => b.count - a.count);
    }
    return decadeDistribution;
  }, [decadeDistribution, sortByCount]);

  if (!decadeDistribution || decadeDistribution.length === 0) {
    return null;
  }

  const maxCount = Math.max(...decadeDistribution.map((d) => d.count));

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>📅 Songs by Decade</h3>
        <div
          style={{
            display: "flex",
            background: "#f0f0f0",
            borderRadius: "6px",
            padding: "2px",
          }}
        >
          <button
            onClick={() => setSortByCount(false)}
            style={{
              background: !sortByCount ? "#9b59b6" : "transparent",
              color: !sortByCount ? "#fff" : "#666",
              border: "none",
              borderRadius: "4px",
              padding: "0.35rem 0.7rem",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s",
              fontWeight: !sortByCount ? 600 : 400,
            }}
          >
            Chronological
          </button>
          <button
            onClick={() => setSortByCount(true)}
            style={{
              background: sortByCount ? "#9b59b6" : "transparent",
              color: sortByCount ? "#fff" : "#666",
              border: "none",
              borderRadius: "4px",
              padding: "0.35rem 0.7rem",
              fontSize: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s",
              fontWeight: sortByCount ? 600 : 400,
            }}
          >
            By Count
          </button>
        </div>
      </div>
      <div style={{ marginTop: "1rem" }}>
        {sortedDistribution.map(({ decade, decade_value, count }) => (
          <div
            key={decade_value}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "0.5rem",
              gap: "1rem",
              position: "relative",
              cursor: "pointer",
            }}
            onMouseEnter={() => onDecadeHover(decade_value)}
            onMouseLeave={onDecadeLeave}
          >
            <div style={{ minWidth: "60px", fontWeight: "bold" }}>{decade}</div>
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
                  background: "#9b59b6",
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
            {hoveredDecade === decade_value && (
              <DecadeHoverPopup
                decade={decade}
                decadeValue={decade_value}
                count={count}
                decadeDetails={decadeDetails}
                loadingDecade={loadingDecade}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DecadeDistribution;
