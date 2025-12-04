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

  // Fetch user's total points (achievements + releases)
  const fetchAchievementPoints = async () => {
    try {
      const pointsBreakdown = await apiGet("/achievements/points-breakdown");
      setAchievementPoints(pointsBreakdown.total_points);
    } catch (error) {
      console.error("Failed to fetch total points:", error);
      // Fallback to achievement points only if breakdown fails
      try {
        const achievements = await apiGet("/achievements/me");
        const totalPoints = achievements.reduce(
          (sum, ua) => sum + (ua.achievement?.points || 0),
          0
        );
        setAchievementPoints(totalPoints);
      } catch (fallbackError) {
        console.error("Failed to fetch achievement points fallback:", fallbackError);
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

