import React, { useState, useEffect } from "react";
import { apiGet } from "../utils/api";

const RARITY_COLORS = {
  common: "#95a5a6",
  uncommon: "#2ecc71", 
  rare: "#3498db",
  epic: "#9b59b6",
  legendary: "#f39c12",
};

const CATEGORY_INFO = {
  milestone_future: { name: "Future Plans", icon: "💭", description: "Planning and vision achievements" },
  milestone_wip: { name: "WIP Progress", icon: "🎬", description: "Work in progress achievements" },
  milestone_released: { name: "Released", icon: "✨", description: "Released song achievements" },
  milestone_packs: { name: "Packs", icon: "📦", description: "Pack creation achievements" },
  milestone_collaborations: { name: "Collaborations", icon: "🤝", description: "Collaboration achievements" },
  activity: { name: "Activity", icon: "⚡", description: "Daily engagement" },
  quality: { name: "Quality", icon: "🌟", description: "Excellence in work" },
  social: { name: "Social", icon: "👥", description: "Social achievements" },
  diversity: { name: "Diversity", icon: "🌈", description: "Variety and exploration" },
  special: { name: "Special", icon: "✨", description: "Rare and unique" },
};

// Define the desired order of categories (milestones first, then others)
const CATEGORY_ORDER = [
  'milestone_future',
  'milestone_wip', 
  'milestone_released',
  'milestone_packs',
  'milestone_collaborations',
  'activity',
  'quality',
  'social', 
  'diversity',
  'special'
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    fetchAchievements();
  }, []);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const fetchAchievements = async () => {
    try {
      const [userAchievements, allAchievementsList] = await Promise.all([
        apiGet("/achievements/me"),
        apiGet("/achievements/"),
      ]);

      const earnedCodes = new Set(
        userAchievements.map((ua) => ua.achievement.code)
      );

      const achievementsWithStatus = allAchievementsList.map((ach) => ({
        ...ach,
        earned: earnedCodes.has(ach.code),
      }));

      setAchievements(userAchievements);
      setAllAchievements(achievementsWithStatus);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load achievements:", error);
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <div className="loading">Loading achievements...</div>
      </div>
    );
  }

  // Calculate stats
  const totalPoints = achievements.reduce(
    (sum, ua) => sum + (ua.achievement?.points || 0),
    0
  );


  // Group achievements by category and sort by points (difficulty)
  const achievementsByCategory = {};
  allAchievements.forEach((ach) => {
    if (!achievementsByCategory[ach.category]) {
      achievementsByCategory[ach.category] = [];
    }
    achievementsByCategory[ach.category].push(ach);
  });
  
  // Sort within each category by points (easier to harder)
  Object.keys(achievementsByCategory).forEach((category) => {
    achievementsByCategory[category].sort((a, b) => (a.points || 0) - (b.points || 0));
  });

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header with stats */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem", color: "#333" }}>🏆 Achievements</h2>
        <div style={{ 
          display: "flex", 
          gap: "2rem", 
          alignItems: "center",
          padding: "1rem",
          background: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef"
        }}>
          <div>
            <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#007bff" }}>
              {achievements.length}
            </span>
            <span style={{ color: "#666", marginLeft: "0.5rem" }}>
              / {allAchievements.length} earned
            </span>
          </div>
          <div style={{ height: "30px", width: "1px", background: "#dee2e6" }} />
          <div>
            <span style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#28a745" }}>
              {totalPoints}
            </span>
            <span style={{ color: "#666", marginLeft: "0.5rem" }}>points</span>
          </div>
        </div>
      </div>

      {/* Achievement Categories */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {CATEGORY_ORDER
          .filter(category => achievementsByCategory[category]) // Only show categories that have achievements
          .map((category) => {
          const categoryInfo = CATEGORY_INFO[category] || { 
            name: category.charAt(0).toUpperCase() + category.slice(1), 
            icon: "📋", 
            description: "" 
          };
          const categoryAchievements = achievementsByCategory[category];
          const earnedCount = categoryAchievements.filter(ach => ach.earned).length;
          const categoryEarnedPoints = categoryAchievements
            .filter(ach => ach.earned)
            .reduce((sum, ach) => sum + (ach.points || 0), 0);
          const categoryTotalPoints = categoryAchievements
            .reduce((sum, ach) => sum + (ach.points || 0), 0);
          const isExpanded = expandedCategories[category] !== false; // Default to expanded
          
          return (
            <div key={category} style={{
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #e9ecef",
              overflow: "hidden"
            }}>
              {/* Category Header */}
              <div 
                style={{
                  background: "#f8f9fa",
                  padding: "1rem",
                  borderBottom: isExpanded ? "1px solid #e9ecef" : "none",
                  cursor: "pointer",
                  userSelect: "none"
                }}
                onClick={() => toggleCategory(category)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>{categoryInfo.icon}</span>
                      {categoryInfo.name}
                      <span style={{ 
                        fontSize: "0.8rem", 
                        color: "#6c757d", 
                        marginLeft: "0.5rem",
                        transition: "transform 0.2s ease"
                      }}>
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    </h3>
                    {categoryInfo.description && (
                      <p style={{ margin: "0.25rem 0 0 0", color: "#6c757d", fontSize: "0.9rem" }}>
                        {categoryInfo.description}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: earnedCount === categoryAchievements.length ? "#28a745" : "#6c757d" }}>
                      {earnedCount} / {categoryAchievements.length}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6c757d" }}>completed</div>
                    <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#007bff", marginTop: "0.25rem" }}>
                      {categoryEarnedPoints} / {categoryTotalPoints} pts
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Achievements List */}
              {isExpanded && (
                <div style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {categoryAchievements.map((ach) => (
                    <div key={ach.id} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      background: ach.earned ? "#f8f9fa" : "#ffffff",
                      border: ach.earned ? "2px solid #28a745" : "1px solid #e9ecef",
                      opacity: ach.earned ? 1 : 0.7,
                    }}>
                      {/* Achievement Icon & Earned Status */}
                      <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "6px",
                        background: ach.earned ? "#28a745" : "#e9ecef",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        color: ach.earned ? "white" : "#6c757d"
                      }}>
                        {ach.earned ? "✓" : ach.icon}
                      </div>
                      
                      {/* Achievement Details */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <h4 style={{ 
                            margin: 0, 
                            color: ach.earned ? "#333" : "#6c757d",
                            textDecoration: ach.earned ? "none" : "none"
                          }}>
                            {ach.name}
                          </h4>
                          <span style={{
                            padding: "0.1rem 0.4rem",
                            fontSize: "0.7rem",
                            borderRadius: "3px",
                            background: RARITY_COLORS[ach.rarity] || RARITY_COLORS.common,
                            color: "white",
                            textTransform: "uppercase",
                            fontWeight: "bold"
                          }}>
                            {ach.rarity}
                          </span>
                        </div>
                        <p style={{ 
                          margin: 0, 
                          fontSize: "0.9rem", 
                          color: ach.earned ? "#6c757d" : "#adb5bd"
                        }}>
                          {ach.description}
                        </p>
                      </div>
                      
                      {/* Points */}
                      <div style={{ 
                        textAlign: "right",
                        color: ach.earned ? "#28a745" : "#6c757d",
                        fontWeight: "bold"
                      }}>
                        +{ach.points || 0}
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

