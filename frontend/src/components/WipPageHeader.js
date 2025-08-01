import React from "react";

const WipPageHeader = ({ grouped, collapsedPacks, onToggleAll }) => {
  return (
    <>
      <h2>🧪 WIP Packs</h2>

      <button
        onClick={onToggleAll}
        style={{
          marginBottom: "1.5rem",
          backgroundColor: "#eee",
          border: "1px solid #ccc",
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        {grouped.every(({ pack }) => collapsedPacks[pack])
          ? "🔽 Expand All"
          : "🔼 Collapse All"}
      </button>
    </>
  );
};

export default WipPageHeader;
