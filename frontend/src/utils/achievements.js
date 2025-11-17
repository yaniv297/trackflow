import { apiGet, apiPost } from "./api";

let lastKnownAchievements = new Set();
let isInitialized = false;

/**
 * Initialize achievement tracking by fetching current achievements
 */
export async function initializeAchievements() {
  try {
    const achievements = await apiGet("/achievements/me");
    lastKnownAchievements = new Set(
      achievements.map((ua) => ua.achievement.code)
    );
    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize achievements:", error);
  }
}

/**
 * Check for newly earned achievements and show toasts
 * Call this after actions that might trigger achievements
 */
export async function checkAndShowNewAchievements() {
  if (!isInitialized) {
    await initializeAchievements();
    return;
  }

  try {
    // Trigger achievement check on backend
    const result = await apiPost("/achievements/check", {});
    
    if (result && result.newly_awarded && result.newly_awarded.length > 0) {
      // Fetch achievement details for newly awarded
      const allAchievements = await apiGet("/achievements/");
      if (!allAchievements || !Array.isArray(allAchievements)) {
        console.error("Invalid achievements data received");
        return;
      }
      
      const achievementMap = new Map(
        allAchievements.map((ach) => [ach.code, ach])
      );

      // Show toasts for newly earned achievements
      result.newly_awarded.forEach((code) => {
        const achievement = achievementMap.get(code);
        if (achievement) {
          // Try multiple notification methods with fallbacks
          if (window.showAchievementToast) {
            window.showAchievementToast(achievement);
          } else if (window.showNotification) {
            window.showNotification(`🏆 Achievement Unlocked: ${achievement.name}`, "success");
          } else {
            console.log(`🏆 Achievement Unlocked: ${achievement.name} - ${achievement.description}`);
          }
        }
      });

      // Update last known achievements
      const currentAchievements = await apiGet("/achievements/me");
      if (currentAchievements && Array.isArray(currentAchievements)) {
        lastKnownAchievements = new Set(
          currentAchievements.map((ua) => ua.achievement.code)
        );
      }
    }
  } catch (error) {
    console.error("Failed to check achievements:", error);
    // Don't throw the error - achievement checking is non-critical
  }
}

/**
 * Manually refresh achievements (useful for testing or manual checks)
 */
export async function refreshAchievements() {
  await initializeAchievements();
  await checkAndShowNewAchievements();
}

