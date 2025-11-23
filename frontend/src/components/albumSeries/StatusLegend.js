import React from "react";

/**
 * Component for displaying status legend
 */
const StatusLegend = () => {
  return (
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
  );
};

export default StatusLegend;

