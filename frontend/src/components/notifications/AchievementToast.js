import React, { useEffect, useState } from "react";

const RARITY_COLORS = {
  common: "#95a5a6",
  uncommon: "#2ecc71",
  rare: "#3498db",
  epic: "#9b59b6",
  legendary: "#f39c12",
};

export default function AchievementToast({ achievement, onClose, duration = 5000, currentScore = null }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Entrance animation
    setTimeout(() => setIsAnimating(false), 100);

    // Auto-dismiss
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 300); // Wait for fade out
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const rarityColor = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        zIndex: 99999,
        minWidth: "320px",
        maxWidth: "400px",
        border: `3px solid ${rarityColor}`,
        transform: isVisible
          ? isAnimating
            ? "translateX(120%)"
            : "translateX(0)"
          : "translateX(120%)",
        opacity: isVisible ? 1 : 0,
        transition: "all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        overflow: "hidden",
      }}
    >
      {/* Header with gradient */}
      <div
        style={{
          background: `linear-gradient(135deg, ${rarityColor} 0%, ${rarityColor}dd 100%)`,
          padding: "1rem 1.5rem",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            fontSize: "2.5rem",
            lineHeight: 1,
            animation: "pulse 0.6s ease-in-out",
          }}
        >
          {achievement.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: "bold",
              marginBottom: "0.25rem",
            }}
          >
            Achievement Unlocked!
          </div>
          <div style={{ fontSize: "0.9rem", opacity: 0.95 }}>
            {achievement.name}
          </div>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(), 300);
          }}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "50%",
            width: "28px",
            height: "28px",
            color: "white",
            cursor: "pointer",
            fontSize: "1.2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.background = "rgba(255,255,255,0.3)")}
          onMouseLeave={(e) => (e.target.style.background = "rgba(255,255,255,0.2)")}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "1rem 1.5rem" }}>
        <div style={{ color: "#555", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          {achievement.description}
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: "#888",
            marginTop: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid #eee",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: currentScore !== null ? "0.5rem" : "0",
            }}
          >
            <span>
              <strong style={{ color: rarityColor }}>+{achievement.points}</strong> points
            </span>
            <span style={{ textTransform: "capitalize" }}>{achievement.rarity}</span>
          </div>
          {currentScore !== null && (
            <div
              style={{
                fontSize: "0.8rem",
                color: "#666",
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              Current Score: <strong style={{ color: "#333" }}>{currentScore}</strong>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
          }
        `}
      </style>
    </div>
  );
}

