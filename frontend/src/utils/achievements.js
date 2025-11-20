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
    // First, get the current achievements to compare
    const currentAchievements = await apiGet("/achievements/me");
    const currentCodes = new Set(currentAchievements.map(ua => ua.achievement.code));
    
    // Find newly earned achievements by comparing with last known state
    const newlyEarnedCodes = [...currentCodes].filter(code => !lastKnownAchievements.has(code));
    
    // Also trigger backend achievement check to ensure everything is up to date
    const result = await apiPost("/achievements/check", {});
    
    // Combine both newly earned and backend-reported achievements
    const allNewlyAwarded = [...new Set([...newlyEarnedCodes, ...(result?.newly_awarded || [])])];
    
    if (allNewlyAwarded.length > 0) {
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
      allNewlyAwarded.forEach((code) => {
        const achievement = achievementMap.get(code);
        if (achievement) {
          // Try multiple notification methods with fallbacks
          if (window.showAchievementToast) {
            window.showAchievementToast(achievement);
          } else if (window.showNotification) {
            window.showNotification(`🏆 Achievement Unlocked: ${achievement.name}`, "success");
          } else {
            // Achievement logged to console for debugging
          }
        }
      });

      // Update last known achievements to the current state
      lastKnownAchievements = new Set(currentCodes);

      // Trigger achievement update events for UI components
      window.dispatchEvent(new CustomEvent('achievements-updated'));
      window.dispatchEvent(new CustomEvent('achievement-earned', {
        detail: { 
          count: allNewlyAwarded.length,
          achievements: allNewlyAwarded.map(code => achievementMap.get(code)).filter(Boolean)
        }
      }));
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

