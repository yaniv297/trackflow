import { useState, useEffect } from "react";
import { apiGet } from "../../utils/api";
import { initializeAchievements } from "../../utils/achievements";

/**
 * Hook for managing achievement points and initialization
 */
export const useAppAchievements = (isAuthenticated, user) => {
  const [achievementPoints, setAchievementPoints] = useState(0);

  // Initialize achievement tracking when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeAchievements();
      fetchAchievementPoints();
    }
  }, [isAuthenticated, user]);

  // Fetch user's achievement points from UserStats.total_points (same source as leaderboard)
  // Currently: achievement points only (no release bonus)
  // Future: will include release bonus when migration is updated
  const fetchAchievementPoints = async () => {
    try {
      // Use lightweight points endpoint (fast - just reads UserStats.total_points)
      const pointsData = await apiGet("/achievements/points");
      setAchievementPoints(pointsData.total_points);
    } catch (error) {
      console.error("Failed to fetch achievement points:", error);
      // Fallback to progress endpoint if lightweight endpoint fails
      try {
        const progress = await apiGet("/achievements/me/progress");
        setAchievementPoints(progress.stats.total_points);
      } catch (fallbackError) {
        console.error("Failed to fetch achievement points fallback:", fallbackError);
        // Last resort: calculate from achievements
        try {
          const achievements = await apiGet("/achievements/me");
          const totalPoints = achievements.reduce(
            (sum, ua) => sum + (ua.achievement?.points || 0),
            0
          );
          setAchievementPoints(totalPoints);
        } catch (finalError) {
          console.error("Failed to fetch achievement points final fallback:", finalError);
        }
      }
    }
  };

  // Update points when achievements are earned
  useEffect(() => {
    const handleAchievementUpdate = () => {
      if (isAuthenticated && user) {
        fetchAchievementPoints();
      }
    };

    window.addEventListener("achievement-earned", handleAchievementUpdate);
    window.addEventListener("achievements-updated", handleAchievementUpdate);

    return () => {
      window.removeEventListener("achievement-earned", handleAchievementUpdate);
      window.removeEventListener(
        "achievements-updated",
        handleAchievementUpdate
      );
    };
  }, [isAuthenticated, user]);

  return { achievementPoints };
};

