import React, { useState } from "react";

/**
 * Reusable expandable list component
 */
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

export default ExpandableList;

