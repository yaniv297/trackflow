import React from "react";

const WorkflowLoadingSpinner = ({ message = "Loading workflow...", size = "medium" }) => {
  const sizeStyles = {
    small: { width: "16px", height: "16px" },
    medium: { width: "24px", height: "24px" },
    large: { width: "32px", height: "32px" }
  };
  
  const containerStyles = {
    small: { padding: "0.5rem" },
    medium: { padding: "1rem" },
    large: { padding: "2rem" }
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      color: "#6b7280",
      fontSize: "0.9rem",
      ...containerStyles[size]
    }}>
      <div style={{
        ...sizeStyles[size],
        border: "2px solid #e5e7eb",
        borderTop: "2px solid #3b82f6",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <span>{message}</span>
      
      {/* CSS animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WorkflowLoadingSpinner;