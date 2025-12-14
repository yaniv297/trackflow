import { useState, useCallback, useRef, useEffect } from "react";
import { apiPatch } from "../../utils/api";

/**
 * Custom hook for pack randomizer functionality
 * Handles the slot-machine style animation and pack selection logic
 */
export const usePackRandomizer = (packs, onPackMoved) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [displayPack, setDisplayPack] = useState(null);
  const intervalRef = useRef(null);
  const spinTimeoutRef = useRef(null);
  const hasAutoSpunRef = useRef(false);

  // Filter out invalid packs
  const validPacks = packs.filter(
    (pack) => pack.name !== "(no pack)" && pack.id
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Perform the slot-machine animation and select a random pack
   */
  const spin = useCallback(() => {
    if (validPacks.length === 0) {
      if (window.showNotification) {
        window.showNotification("No packs available to randomize", "warning");
      }
      return;
    }

    setIsSpinning(true);
    setSelectedPack(null);

    // Fast cycling animation - change pack every 100ms
    const duration = 1500 + Math.random() * 1000; // 1.5-2.5 seconds

    intervalRef.current = setInterval(() => {
      const randomPack =
        validPacks[Math.floor(Math.random() * validPacks.length)];
      setDisplayPack(randomPack);
    }, 100);

    // Stop spinning and select final pack
    spinTimeoutRef.current = setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Pick the final random pack
      const finalPack =
        validPacks[Math.floor(Math.random() * validPacks.length)];
      setDisplayPack(finalPack);
      setSelectedPack(finalPack);
      setIsSpinning(false);
    }, duration);
  }, [validPacks]);

  /**
   * Move the selected pack to Work in Progress status
   */
  const movePackToWIP = useCallback(async () => {
    if (!selectedPack) return;

    try {
      await apiPatch(`/packs/${selectedPack.id}/status`, {
        status: "In Progress",
      });

      if (window.showNotification) {
        window.showNotification(
          `Pack "${selectedPack.name}" moved to Work in Progress!`,
          "success"
        );
      }

      // Notify parent to refresh
      if (onPackMoved) {
        onPackMoved();
      }

      return true; // Success
    } catch (error) {
      console.error("Failed to move pack to WIP:", error);
      if (window.showNotification) {
        window.showNotification(
          error.message || "Failed to move pack to WIP",
          "error"
        );
      }
      return false; // Failure
    }
  }, [selectedPack, onPackMoved]);

  /**
   * Reset the randomizer state (for when modal closes)
   */
  const reset = useCallback(() => {
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
  }, []);

  /**
   * Auto-spin when modal opens (only once)
   */
  const initialize = useCallback(() => {
    if (validPacks.length > 0 && !hasAutoSpunRef.current) {
      hasAutoSpunRef.current = true;
      spin();
    }
  }, [validPacks.length, spin]);

  return {
    isSpinning,
    selectedPack,
    displayPack,
    validPacks,
    spin,
    movePackToWIP,
    reset,
    initialize,
  };
};


