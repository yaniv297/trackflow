import React from "react";

/**
 * Reusable stat card component
 */
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

export default StatCard;

