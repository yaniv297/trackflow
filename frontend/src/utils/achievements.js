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
 * @param {boolean} skipBackendCheck - If true, skip the slow /achievements/check call (useful when backend already checks in background)
 */
export async function checkAndShowNewAchievements(skipBackendCheck = false) {
  if (!isInitialized) {
    await initializeAchievements();
    // After initialization, don't return - continue to check for any new achievements
    // that might have been earned since the last session
  }

  try {
    // Store the previous state before any changes
    const previousCodes = new Set(lastKnownAchievements);
    
    // Only trigger backend achievement check if not skipped (backend may already be checking in background)
    let result = { newly_awarded: [] };
    if (!skipBackendCheck) {
      result = await apiPost("/achievements/check", {});
    }
    
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

      // Get current user data to show total score in achievement toast
      let currentScore = null;
      try {
        const userResponse = await apiGet("/auth/me");
        currentScore = userResponse?.achievement_score || null;
      } catch (error) {
        console.warn("Could not fetch current score for achievement toast:", error);
      }

      // Show toasts for newly earned achievements
      allNewlyAwarded.forEach((code) => {
        const achievement = achievementMap.get(code);
        if (achievement) {
          // Try multiple notification methods with fallbacks
          if (window.showAchievementToast) {
            window.showAchievementToast(achievement, currentScore);
          } else if (window.showNotification) {
            window.showNotification(`🏆 Achievement Unlocked: ${achievement.name}`, "success");
          } else {
            // Achievement logged to console for debugging
          }
          
          // Dispatch achievement earned event for real-time notifications
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
 * Check for newly earned customization achievements only (profile pic, website, contact method)
 * Lightweight version that only checks the 3 relevant customization achievements
 * @param {number} delayMs - Delay before checking (to let backend process)
 */
export async function checkCustomizationAchievements(delayMs = 1000) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        if (!isInitialized) {
          await initializeAchievements();
        }

        // Store previous state
        const previousCodes = new Set(lastKnownAchievements);
        
        // Get current achievements (lightweight - just user's achievements)
        const currentAchievements = await apiGet("/achievements/me");
        const currentCodes = new Set(currentAchievements.map(ua => ua.achievement.code));
        
        // Find newly earned achievements
        const newlyEarnedCodes = [...currentCodes].filter(code => !previousCodes.has(code));
        
        if (newlyEarnedCodes.length === 0) {
          // Update tracking even if no new achievements
          lastKnownAchievements = new Set(currentCodes);
          resolve([]);
          return;
        }

        // Get achievement details only for newly earned ones (not all achievements)
        // Filter to only customization achievements by checking metric_type
        const customizationCodes = [];
        for (const ua of currentAchievements) {
          if (newlyEarnedCodes.includes(ua.achievement.code)) {
            // Check if this is a customization achievement
            const metricType = ua.achievement.metric_type;
            if (metricType === "profile_pic" || metricType === "personal_link" || metricType === "contact_method") {
              customizationCodes.push(ua.achievement.code);
            }
          }
        }

        if (customizationCodes.length === 0) {
          // Update tracking
          lastKnownAchievements = new Set(currentCodes);
          resolve([]);
          return;
        }

        // Fetch achievement details only for customization achievements
        const allAchievements = await apiGet("/achievements/");
        const achievementMap = new Map(
          allAchievements.map((ach) => [ach.code, ach])
        );

        // Get current user score
        let currentScore = null;
        try {
          const userResponse = await apiGet("/auth/me");
          currentScore = userResponse?.achievement_score || null;
        } catch (error) {
          console.warn("Could not fetch current score:", error);
        }

        // Show toasts for customization achievements only
        customizationCodes.forEach((code) => {
          const achievement = achievementMap.get(code);
          if (achievement) {
            if (window.showAchievementToast) {
              window.showAchievementToast(achievement, currentScore);
            } else if (window.showNotification) {
              window.showNotification(`🏆 Achievement Unlocked: ${achievement.name}`, "success");
            }
            
            dispatchAchievementEarnedEvent(achievement);
          }
        });

        // Update tracking
        lastKnownAchievements = new Set(currentCodes);

        // Trigger events
        window.dispatchEvent(new CustomEvent('achievements-updated'));
        window.dispatchEvent(new CustomEvent('achievement-earned', {
          detail: { 
            count: customizationCodes.length,
            achievements: customizationCodes.map(code => achievementMap.get(code)).filter(Boolean)
          }
        }));
        
        if (customizationCodes.length > 0) {
          dispatchNewNotificationEvent();
        }

        resolve(customizationCodes);
      } catch (error) {
        console.error("Failed to check customization achievements:", error);
        resolve([]);
      }
    }, delayMs);
  });
}

/**
 * Reset achievement tracking (useful for development/testing)
 */
export function resetAchievementTracking() {
  lastKnownAchievements = new Set();
  isInitialized = false;
}

