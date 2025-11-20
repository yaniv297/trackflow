import React from "react";

const RARITY_COLORS = {
  common: "#95a5a6",      // Gray
  uncommon: "#2ecc71",    // Green
  rare: "#3498db",         // Blue
  epic: "#9b59b6",        // Purple
  legendary: "#f39c12",   // Orange/Gold
};

const RARITY_BORDERS = {
  common: "1px solid #7f8c8d",
  uncommon: "1px solid #27ae60",
  rare: "1px solid #2980b9",
  epic: "1px solid #8e44ad",
  legendary: "2px solid #e67e22",
};

export default function AchievementBadge({ achievement, earned = false, size = "medium" }) {
  const { icon, name, description, rarity, points } = achievement;
  
  const sizeStyles = {
    small: {
      width: "60px",
      height: "60px",
      fontSize: "24px",
      padding: "8px",
    },
    medium: {
      width: "80px",
      height: "80px",
      fontSize: "32px",
      padding: "12px",
    },
    large: {
      width: "100px",
      height: "100px",
      fontSize: "40px",
      padding: "16px",
    },
  };

  const style = {
    ...sizeStyles[size],
    background: earned ? RARITY_COLORS[rarity] || RARITY_COLORS.common : "#ecf0f1",
    border: earned 
      ? (RARITY_BORDERS[rarity] || RARITY_BORDERS.common)
      : "1px solid #bdc3c7",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    opacity: earned ? 1 : 0.5,
    position: "relative",
    boxShadow: earned ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
  };

  const hoverStyle = {
    transform: "scale(1.05)",
    boxShadow: earned ? "0 4px 12px rgba(0,0,0,0.25)" : "0 2px 4px rgba(0,0,0,0.1)",
  };

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      style={{
        ...style,
        ...(isHovered ? hoverStyle : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={earned ? `${name} - ${description} (${points} pts)` : `${name} - ${description} (Locked)`}
    >
      <div style={{ fontSize: style.fontSize, lineHeight: 1 }}>{icon}</div>
      {earned && (
        <div
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            color: "white",
            fontWeight: "bold",
          }}
        >
          ✓
        </div>
      )}
      {isHovered && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            marginBottom: "8px",
            background: "#2c3e50",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            whiteSpace: "nowrap",
            zIndex: 1000,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{name}</div>
          <div style={{ fontSize: "11px", opacity: 0.9 }}>{description}</div>
          <div style={{ fontSize: "10px", marginTop: "4px", opacity: 0.8 }}>
            {points} points • {rarity}
          </div>
        </div>
      )}
    </div>
  );
}

