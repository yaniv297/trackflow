import { useEffect } from "react";
import { apiPost } from "../../utils/api";

/**
 * Custom hook for handling welcome notification for first-time users
 */
export const useWipWelcomeNotification = () => {
  useEffect(() => {
    const showWelcome = sessionStorage.getItem("show_welcome");
    if (showWelcome === "true") {
      sessionStorage.removeItem("show_welcome");
      setTimeout(async () => {
        try {
          // Create a persistent bell notification instead of a temporary toast
          await apiPost("/notifications/welcome");
        } catch (error) {
          console.error("Failed to create welcome notification:", error);
          // Fallback to temporary toast if API fails
          if (window.showNotification) {
            window.showNotification(
              "🎉 Welcome to TrackFlow! Click ⚙️ → Help & FAQ to learn about features and get started.",
              "success",
              12000
            );
          }
        }
      }, 800);
    }
  }, []);
};

