import { useState, useEffect } from "react";

const WELCOME_POPUP_KEY = "trackflow_v2_welcome_dismissed";

/**
 * Custom hook to manage the one-time welcome popup for Trackflow v2.0
 * 
 * Handles:
 * - Checking if popup has been dismissed before
 * - Showing popup on first visit only
 * - Persisting dismissal state in localStorage
 * - Providing methods to show/hide popup
 * 
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @param {boolean} loading - Whether auth is still loading
 * @returns {Object} Hook state and methods
 */
export const useWelcomePopup = (isAuthenticated, loading) => {
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    // Only show popup for authenticated users after loading is complete
    if (loading || !isAuthenticated) {
      return;
    }

    // Check if user has already dismissed the welcome popup
    const dismissed = localStorage.getItem(WELCOME_POPUP_KEY);
    
    if (!dismissed) {
      // Show popup after a brief delay to ensure smooth UI loading
      const timer = setTimeout(() => {
        setShowWelcomePopup(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading]);

  const dismissWelcomePopup = () => {
    setShowWelcomePopup(false);
    localStorage.setItem(WELCOME_POPUP_KEY, "1");
  };

  const resetWelcomePopup = () => {
    localStorage.removeItem(WELCOME_POPUP_KEY);
    setShowWelcomePopup(true);
  };

  return {
    showWelcomePopup,
    dismissWelcomePopup,
    resetWelcomePopup, // For development/testing purposes
  };
};