import React from "react";

/**
 * LoadingSpinner - A reusable loading spinner component
 *
 * @param {Object} props
 * @param {string} [props.message="Loading..."] - The message to display below the spinner
 * @param {string} [props.size="medium"] - Size of the spinner: "small", "medium", "large"
 * @param {string} [props.color="#3498db"] - Color of the spinner (hex color)
 * @param {boolean} [props.showText=true] - Whether to show the message text
 * @param {string} [props.layout="centered"] - Layout style: "centered", "inline", "compact"
 *
 * @example
 * // Basic usage
 * <LoadingSpinner message="Loading songs..." />
 *
 * @example
 * // Compact inline spinner
 * <LoadingSpinner size="small" layout="inline" message="Saving..." />
 *
 * @example
 * // Large spinner without text
 * <LoadingSpinner size="large" showText={false} />
 */
const LoadingSpinner = ({
  message = "Loading...",
  size = "medium",
  color = "#3498db",
  showText = true,
  layout = "centered", // "centered", "inline", "compact"
}) => {
  const sizeMap = {
    small: { width: "20px", height: "20px", borderWidth: "2px" },
    medium: { width: "40px", height: "40px", borderWidth: "4px" },
    large: { width: "60px", height: "60px", borderWidth: "6px" },
  };

  const spinnerSize = sizeMap[size] || sizeMap.medium;

  const containerStyles = {
    centered: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "3rem",
      flexDirection: "column",
      gap: "1rem",
    },
    inline: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "1rem",
      flexDirection: "row",
      gap: "0.5rem",
    },
    compact: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "0.5rem",
      flexDirection: "column",
      gap: "0.5rem",
    },
  };

  const textStyles = {
    centered: { color: "#666", fontSize: "1rem" },
    inline: { color: "#666", fontSize: "0.9rem" },
    compact: { color: "#666", fontSize: "0.8rem" },
  };

  return (
    <div style={containerStyles[layout] || containerStyles.centered}>
      <div
        style={{
          width: spinnerSize.width,
          height: spinnerSize.height,
          border: `${spinnerSize.borderWidth} solid #f3f3f3`,
          borderTop: `${spinnerSize.borderWidth} solid ${color}`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      {showText && (
        <div style={textStyles[layout] || textStyles.centered}>{message}</div>
      )}
    </div>
  );
};

export default LoadingSpinner;
