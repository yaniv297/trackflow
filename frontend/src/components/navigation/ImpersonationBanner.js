import React from "react";

/**
 * Banner shown when admin is impersonating a user
 */
const ImpersonationBanner = ({ impersonatedUsername, onExit }) => {
  return (
    <div
      style={{
        background: "#ffc107",
        color: "#000",
        padding: "10px 20px",
        textAlign: "center",
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "15px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <span>Impersonating: {impersonatedUsername}</span>
      <button
        onClick={onExit}
        style={{
          background: "#333",
          color: "white",
          border: "none",
          padding: "6px 15px",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "13px",
        }}
      >
        Exit Impersonation
      </button>
    </div>
  );
};

export default ImpersonationBanner;

