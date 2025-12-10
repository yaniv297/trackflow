import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiPatch } from "../utils/api";

const PackRandomizerModal = ({
  isOpen,
  onClose,
  packs,
  onPackMoved,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [displayPack, setDisplayPack] = useState(null);
  const intervalRef = useRef(null);
  const spinTimeoutRef = useRef(null);
  const hasAutoSpunRef = useRef(false);

  // Filter out "(no pack)" entries
  const validPacks = packs.filter((pack) => pack.name !== "(no pack)" && pack.id);

  // Define spin function with useCallback
  const spin = useCallback(() => {
    if (validPacks.length === 0) {
      window.showNotification("No packs available to randomize", "warning");
      return;
    }

    setIsSpinning(true);
    setSelectedPack(null);

    // Fast cycling animation - change pack every 100ms
    const duration = 1500 + Math.random() * 1000; // 1.5-2.5 seconds

    intervalRef.current = setInterval(() => {
      const randomPack = validPacks[Math.floor(Math.random() * validPacks.length)];
      setDisplayPack(randomPack);
    }, 100);

    // Stop spinning and select final pack
    spinTimeoutRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Pick the final random pack
      const finalPack = validPacks[Math.floor(Math.random() * validPacks.length)];
      setDisplayPack(finalPack);
      setSelectedPack(finalPack);
      setIsSpinning(false);
    }, duration);
  }, [validPacks]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setIsSpinning(false);
      setSelectedPack(null);
      setDisplayPack(null);
      hasAutoSpunRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
    } else if (isOpen && validPacks.length > 0 && !hasAutoSpunRef.current) {
      // Auto-spin once when modal opens
      hasAutoSpunRef.current = true;
      spin();
    }
  }, [isOpen, spin, validPacks.length]);

  const handleMoveToWIP = async () => {
    if (!selectedPack) return;

    try {
      await apiPatch(`/packs/${selectedPack.id}/status`, {
        status: "In Progress",
      });

      window.showNotification(
        `Pack "${selectedPack.name}" moved to Work in Progress!`,
        "success"
      );

      // Notify parent to refresh
      if (onPackMoved) {
        onPackMoved();
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error("Failed to move pack to WIP:", error);
      window.showNotification(
        error.message || "Failed to move pack to WIP",
        "error"
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "2rem",
          minWidth: "400px",
          maxWidth: "500px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#333",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            🎲 Pack Randomizer
          </h2>
          <p
            style={{
              marginTop: "0.5rem",
              color: "#666",
              fontSize: "0.9rem",
            }}
          >
            Let chance decide which pack to work on next!
          </p>
        </div>

        {/* Display area with slot machine effect */}
        <div
          style={{
            background: "#f8f9fa",
            border: "2px solid #e0e0e0",
            borderRadius: "8px",
            padding: "2rem",
            minHeight: "120px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.5rem",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {displayPack ? (
            <div
              style={{
                textAlign: "center",
                animation: isSpinning
                  ? "none"
                  : "fadeIn 0.3s ease-in",
              }}
            >
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#333",
                  marginBottom: "0.5rem",
                }}
              >
                {displayPack.name}
              </div>
              {displayPack.songCount !== undefined && (
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "#666",
                  }}
                >
                  {displayPack.songCount} song
                  {displayPack.songCount === 1 ? "" : "s"}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize: "1.2rem",
                color: "#999",
                fontStyle: "italic",
              }}
            >
              Click "Spin Again" to start
            </div>
          )}

          {/* Spinning overlay effect */}
          {isSpinning && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
                animation: "spinOverlay 0.1s linear infinite",
              }}
            />
          )}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: "white",
              color: "#333",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "white";
            }}
          >
            Close
          </button>

          <button
            onClick={spin}
            disabled={isSpinning || validPacks.length === 0}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              border: "none",
              background:
                isSpinning || validPacks.length === 0
                  ? "#ccc"
                  : "#007bff",
              color: "white",
              cursor:
                isSpinning || validPacks.length === 0
                  ? "not-allowed"
                  : "pointer",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              if (!isSpinning && validPacks.length > 0) {
                e.target.style.background = "#0056b3";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSpinning && validPacks.length > 0) {
                e.target.style.background = "#007bff";
              }
            }}
          >
            {isSpinning ? "Spinning..." : "Spin Again"}
          </button>

          <button
            onClick={handleMoveToWIP}
            disabled={!selectedPack || isSpinning}
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              border: "none",
              background:
                !selectedPack || isSpinning ? "#ccc" : "#28a745",
              color: "white",
              cursor:
                !selectedPack || isSpinning ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              if (selectedPack && !isSpinning) {
                e.target.style.background = "#218838";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedPack && !isSpinning) {
                e.target.style.background = "#28a745";
              }
            }}
          >
            Move to WIP
          </button>
        </div>

        {/* Add CSS animation */}
        <style>
          {`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: scale(0.95);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
            
            @keyframes spinOverlay {
              0% {
                transform: translateY(-100%);
              }
              100% {
                transform: translateY(100%);
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default PackRandomizerModal;

