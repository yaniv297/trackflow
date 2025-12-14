import React, { useEffect, useState } from "react";

const Notification = ({ message, type = "info", duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getStyles = () => {
    const baseStyles = {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "1rem 1.5rem",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 10000,
      maxWidth: "400px",
      wordWrap: "break-word",
      transition: "all 0.3s ease",
      transform: isVisible ? "translateX(0)" : "translateX(100%)",
      opacity: isVisible ? 1 : 0,
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    };

    const typeStyles = {
      success: {
        background: "#d4edda",
        color: "#155724",
        border: "1px solid #c3e6cb",
      },
      error: {
        background: "#f8d7da",
        color: "#721c24",
        border: "1px solid #f5c6cb",
      },
      warning: {
        background: "#fff3cd",
        color: "#856404",
        border: "1px solid #ffeaa7",
      },
      info: {
        background: "#d1ecf1",
        color: "#0c5460",
        border: "1px solid #bee5eb",
      },
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  const getIcon = () => {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };
    return icons[type] || icons.info;
  };

  return (
    <div style={getStyles()}>
      <span style={{ fontSize: "1.2rem" }}>{getIcon()}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(), 300);
        }}
        style={{
          background: "none",
          border: "none",
          fontSize: "1.2rem",
          cursor: "pointer",
          padding: "0",
          color: "inherit",
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Notification;
