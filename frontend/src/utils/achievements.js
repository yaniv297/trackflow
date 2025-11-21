import { apiGet, apiPost } from "./api";
import { dispatchAchievementEarnedEvent, dispatchNewNotificationEvent } from "./notificationEvents";

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
    // After initialization, don't return - continue to check for any new achievements
    // that might have been earned since the last session
  }

  try {
    // Store the previous state before any changes
    const previousCodes = new Set(lastKnownAchievements);
    
    // Trigger backend achievement check first to ensure everything is calculated
    const result = await apiPost("/achievements/check", {});
    
    // Get current achievements after backend processing
    const currentAchievements = await apiGet("/achievements/me");
    const currentCodes = new Set(currentAchievements.map(ua => ua.achievement.code));
    
    // Find truly new achievements by comparing with previous known state
    // Only show achievements that were earned in this session, not old ones
    const newlyEarnedCodes = [...currentCodes].filter(code => !previousCodes.has(code));
    
    // Only use backend reported achievements that are also in our newly earned list
    // This prevents showing old achievements that backend might return
    const backendNewAchievements = (result?.newly_awarded || []).filter(code => newlyEarnedCodes.includes(code));
    
    // Final list - prioritize our comparison but include any additional backend ones
    const allNewlyAwarded = [...new Set([...newlyEarnedCodes, ...backendNewAchievements])];
    
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
          
          // Dispatch achievement earned event for real-time notifications
          console.log('🏆 Dispatching achievement earned event for:', achievement.name);
          dispatchAchievementEarnedEvent(achievement);
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
      
      // Trigger new notification event for notification icon
      if (allNewlyAwarded.length > 0) {
        console.log('📢 Dispatching new notification event for achievements');
        dispatchNewNotificationEvent();
      }
    } else {
      // Even if no new achievements, update our tracking to current state
      // This prevents showing old achievements on subsequent calls
      lastKnownAchievements = new Set(currentCodes);
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

/**
 * Reset achievement tracking (useful for development/testing)
 */
export function resetAchievementTracking() {
  lastKnownAchievements = new Set();
  isInitialized = false;
}

