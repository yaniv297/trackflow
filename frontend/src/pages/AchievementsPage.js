import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  customization: { name: "Customization", icon: "🎨", description: "Profile customization achievements" },
  activity: { name: "Activity", icon: "⚡", description: "Daily engagement and platform interaction" },
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
  'customization',
  'quality',
  'social', 
  'diversity',
  'special'
];

// Progress bar component
function ProgressBar({ current, target, percentage, style = {} }) {
  const clampedPercentage = Math.min(percentage, 100);
  
  return (
    <div style={{ 
      width: "100%", 
      height: "8px", 
      backgroundColor: "#e9ecef", 
      borderRadius: "4px", 
      overflow: "hidden",
      ...style 
    }}>
      <div 
        style={{
          height: "100%",
          width: `${clampedPercentage}%`,
          backgroundColor: clampedPercentage === 100 ? "#28a745" : "#007bff",
          transition: "width 0.3s ease",
          borderRadius: "4px"
        }}
      />
    </div>
  );
}

export default function AchievementsPage() {
  const [achievementsWithProgress, setAchievementsWithProgress] = useState([]);
  const [pointsBreakdown, setPointsBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [hoveredAchievementId, setHoveredAchievementId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);

  useEffect(() => {
    fetchAchievementsAndBreakdown();
  }, []);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleDetailsHover = (achievementId, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 300; // Approximate tooltip width
    const tooltipHeight = 250; // Approximate tooltip height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let top = rect.bottom + 8;
    let left = rect.left;
    
    // Adjust horizontal position if tooltip would go off-screen
    if (left + tooltipWidth > viewportWidth) {
      left = viewportWidth - tooltipWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }
    
    // Adjust vertical position if tooltip would go off-screen
    if (top + tooltipHeight > viewportHeight) {
      top = rect.top - tooltipHeight - 8;
    }
    if (top < 10) {
      top = 10;
    }
    
    setTooltipPosition({ top, left });
    setHoveredAchievementId(achievementId);
  };

  const handleDetailsLeave = () => {
    setHoveredAchievementId(null);
  };

  const fetchAchievementsAndBreakdown = async () => {
    try {
      // Use the optimized combined endpoint
      const response = await apiGet("/achievements/with-progress-and-breakdown");
      setAchievementsWithProgress(response.achievements);
      setPointsBreakdown(response.points_breakdown);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load achievements:", error);
      // Fallback to separate endpoints if combined endpoint fails
      try {
        const achievementsWithProgress = await apiGet("/achievements/with-progress");
        setAchievementsWithProgress(achievementsWithProgress);
        setLoading(false);
        
        // Try to get points breakdown separately
        try {
          const breakdown = await apiGet("/achievements/points-breakdown");
          setPointsBreakdown(breakdown);
        } catch (breakdownError) {
          console.error("Failed to load points breakdown:", breakdownError);
        }
      } catch (fallbackError) {
        console.error("Failed to load achievements (fallback):", fallbackError);
        setLoading(false);
      }
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
  const earnedAchievements = achievementsWithProgress.filter(ach => ach.earned);
  const achievementPoints = earnedAchievements.reduce(
    (sum, ach) => sum + (ach.points || 0),
    0
  );
  
  // Use breakdown data if available, otherwise fall back to achievement points only
  const totalPoints = pointsBreakdown ? pointsBreakdown.total_points : achievementPoints;
  const releasePoints = pointsBreakdown ? pointsBreakdown.release_points : 0;

  // Group achievements by category and sort by points (difficulty)
  const achievementsByCategory = {};
  achievementsWithProgress.forEach((ach) => {
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
          padding: "1rem",
          background: "#f8f9fa",
          borderRadius: "8px",
          border: "1px solid #e9ecef"
        }}>
          {/* Achievements Progress */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "#333" }}>Achievements</span>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#007bff", marginTop: "0.25rem" }}>
                {earnedAchievements.length} / {achievementsWithProgress.length}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "#333" }}>Achievement Points</span>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#28a745", marginTop: "0.25rem" }}>
                +{achievementPoints}
              </div>
            </div>
          </div>

          {/* Released Songs Points */}
          {pointsBreakdown && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "#333" }}>Released Songs</span>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#6f42c1", marginTop: "0.25rem" }}>
                  {pointsBreakdown.released_songs_count}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "#333" }}>Release Points</span>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#6f42c1", marginTop: "0.25rem" }}>
                  +{releasePoints}
                </div>
              </div>
            </div>
          )}

          {/* Total Points */}
          <div style={{ 
            borderTop: "2px solid #dee2e6", 
            paddingTop: "1rem", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <div>
              <span style={{ fontSize: "1.2rem", fontWeight: "600", color: "#333" }}>Total Score</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#dc3545" }}>
                {totalPoints}
              </div>
              <div style={{ fontSize: "0.9rem", color: "#666" }}>points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip Portal - Rendered outside opacity-affected container */}
      {hoveredAchievementId && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: "fixed",
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            backgroundColor: "#ffffff",
            background: "#ffffff",
            border: "2px solid #d0d0d0",
            borderRadius: "8px",
            padding: "1rem",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
            zIndex: 10001,
            minWidth: "250px",
            maxWidth: "400px",
            maxHeight: "400px",
            overflowY: "auto",
            pointerEvents: "auto",
            opacity: 1,
            WebkitBackdropFilter: "none",
            backdropFilter: "none",
          }}
          onMouseEnter={() => {}} // Keep tooltip open
          onMouseLeave={handleDetailsLeave}
        >
          {(() => {
            const ach = achievementsWithProgress.find(a => a.id === hoveredAchievementId);
            if (!ach || !ach.progress?.details) return null;
            
            return (
              <>
                {/* Alphabet Collector Details */}
                {ach.progress.details.missing_letters && ach.progress.details.missing_letters.length > 0 && (
                  <div style={{ marginBottom: "1rem", backgroundColor: "#ffffff" }}>
                    <div style={{ 
                      fontSize: "0.9rem", 
                      fontWeight: "600", 
                      color: "#000000",
                      marginBottom: "0.5rem"
                    }}>
                      Missing Letters ({ach.progress.details.missing_letters.length})
                    </div>
                    <div style={{ 
                      fontSize: "0.85rem", 
                      color: "#000000",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem"
                    }}>
                      {ach.progress.details.missing_letters.map((letter, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: "inline-block",
                            padding: "0.25rem 0.5rem",
                            backgroundColor: "#fff3cd",
                            border: "1px solid #ffc107",
                            borderRadius: "4px",
                            fontWeight: "600",
                            color: "#856404",
                            opacity: 1
                          }}
                        >
                          {letter}
                        </span>
                      ))}
                    </div>
                    {ach.progress.details.found_letters && ach.progress.details.found_letters.length > 0 && (
                      <div style={{ 
                        fontSize: "0.75rem", 
                        color: "#000000",
                        marginTop: "0.5rem"
                      }}>
                        Have: {ach.progress.details.found_letters.join(", ")}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Year-based achievements Details */}
                {ach.metric_type === 'unique_years' && ach.progress.details.found_years !== undefined && (
                  <div style={{ backgroundColor: "#ffffff" }}>
                    <div style={{ 
                      fontSize: "0.9rem", 
                      fontWeight: "600", 
                      color: "#000000",
                      marginBottom: "0.5rem"
                    }}>
                      {ach.progress.details.found_years && ach.progress.details.found_years.length > 0 
                        ? `Missing Years (${ach.progress.target - ach.progress.current} needed)`
                        : `Need ${ach.progress.target} Different Years`}
                    </div>
                    
                    {ach.progress.details.found_years && ach.progress.details.found_years.length > 0 ? (
                      <>
                        {/* Show missing years within range if available */}
                        {ach.progress.details.missing_years_in_range && ach.progress.details.missing_years_in_range.length > 0 && (
                          <div style={{ marginBottom: "0.75rem" }}>
                            <div style={{ 
                              fontSize: "0.8rem", 
                              color: "#000000",
                              marginBottom: "0.4rem"
                            }}>
                              Missing years in your range ({ach.progress.details.year_range?.min} - {ach.progress.details.year_range?.max}):
                            </div>
                            <div style={{ 
                              fontSize: "0.85rem", 
                              color: "#000000",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.4rem",
                              maxHeight: "150px",
                              overflowY: "auto",
                              padding: "0.5rem",
                              backgroundColor: "#fff3cd",
                              border: "1px solid #ffc107",
                              borderRadius: "4px",
                            }}>
                              {ach.progress.details.missing_years_in_range.map((year, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    display: "inline-block",
                                    padding: "0.2rem 0.5rem",
                                    backgroundColor: "#fff3cd",
                                    border: "1px solid #ffc107",
                                    borderRadius: "4px",
                                    fontWeight: "500",
                                    color: "#856404",
                                    opacity: 1
                                  }}
                                >
                                  {year}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Summary */}
                        <div style={{ 
                          fontSize: "0.85rem", 
                          color: "#000000",
                          padding: "0.5rem",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          marginBottom: "0.5rem"
                        }}>
                          <div style={{ marginBottom: "0.25rem" }}>
                            <strong>Progress:</strong> {ach.progress.current} / {ach.progress.target} years
                          </div>
                          {ach.progress.details.found_years.length > 0 && (
                            <div style={{ fontSize: "0.8rem", color: "#000000" }}>
                              Range covered: {ach.progress.details.year_range?.min} - {ach.progress.details.year_range?.max}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ 
                          fontSize: "0.8rem", 
                          color: "#000000",
                          fontStyle: "italic"
                        }}>
                          Add songs from {ach.progress.target - ach.progress.current} more different {ach.progress.target - ach.progress.current === 1 ? 'year' : 'years'} to complete this achievement
                        </div>
                      </>
                    ) : (
                      <>
                        {/* No years yet - show helpful message */}
                        <div style={{ 
                          fontSize: "0.85rem", 
                          color: "#000000",
                          padding: "0.5rem",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          marginBottom: "0.5rem"
                        }}>
                          <div style={{ marginBottom: "0.25rem" }}>
                            <strong>Progress:</strong> 0 / {ach.progress.target} years
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.5rem" }}>
                            Release songs from {ach.progress.target} different years to complete this achievement. Each song's release year counts toward your progress.
                          </div>
                        </div>
                        
                        <div style={{ 
                          fontSize: "0.8rem", 
                          color: "#000000",
                          fontStyle: "italic"
                        }}>
                          Start by releasing songs from any year to begin tracking your progress!
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {/* Decade-based achievements Details */}
                {ach.metric_type === 'unique_decades' && ach.progress.details.found_decades !== undefined && (
                  <div style={{ backgroundColor: "#ffffff" }}>
                    <div style={{ 
                      fontSize: "0.9rem", 
                      fontWeight: "600", 
                      color: "#000000",
                      marginBottom: "0.5rem"
                    }}>
                      {ach.progress.details.found_decades && ach.progress.details.found_decades.length > 0 
                        ? `Missing Decades (${ach.progress.target - ach.progress.current} needed)`
                        : `Need ${ach.progress.target} Different Decades`}
                    </div>
                    
                    {ach.progress.details.found_decades && ach.progress.details.found_decades.length > 0 ? (
                      <>
                        {/* Show missing decades */}
                        {ach.progress.details.missing_decades && ach.progress.details.missing_decades.length > 0 && (
                          <div style={{ marginBottom: "0.75rem" }}>
                            <div style={{ 
                              fontSize: "0.8rem", 
                              color: "#000000",
                              marginBottom: "0.4rem"
                            }}>
                              Missing decades:
                            </div>
                            <div style={{ 
                              fontSize: "0.85rem", 
                              color: "#000000",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.4rem",
                              maxHeight: "150px",
                              overflowY: "auto",
                              padding: "0.5rem",
                              backgroundColor: "#fff3cd",
                              border: "1px solid #ffc107",
                              borderRadius: "4px",
                            }}>
                              {ach.progress.details.missing_decades.map((decade, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    display: "inline-block",
                                    padding: "0.2rem 0.5rem",
                                    backgroundColor: "#fff3cd",
                                    border: "1px solid #ffc107",
                                    borderRadius: "4px",
                                    fontWeight: "500",
                                    color: "#856404",
                                    opacity: 1
                                  }}
                                >
                                  {decade}s
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Summary */}
                        <div style={{ 
                          fontSize: "0.85rem", 
                          color: "#000000",
                          padding: "0.5rem",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          marginBottom: "0.5rem"
                        }}>
                          <div style={{ marginBottom: "0.25rem" }}>
                            <strong>Progress:</strong> {ach.progress.current} / {ach.progress.target} decades
                          </div>
                          {ach.progress.details.found_decades.length > 0 && (
                            <div style={{ fontSize: "0.8rem", color: "#000000" }}>
                              Decades you have: {ach.progress.details.found_decades.map(d => `${d}s`).join(", ")}
                            </div>
                          )}
                        </div>
                        
                        <div style={{ 
                          fontSize: "0.8rem", 
                          color: "#000000",
                          fontStyle: "italic"
                        }}>
                          Add songs from {ach.progress.target - ach.progress.current} more different {ach.progress.target - ach.progress.current === 1 ? 'decade' : 'decades'} to complete this achievement
                        </div>
                      </>
                    ) : (
                      <>
                        {/* No decades yet - show helpful message */}
                        <div style={{ 
                          fontSize: "0.85rem", 
                          color: "#000000",
                          padding: "0.5rem",
                          backgroundColor: "#f8f9fa",
                          borderRadius: "4px",
                          marginBottom: "0.5rem"
                        }}>
                          <div style={{ marginBottom: "0.25rem" }}>
                            <strong>Progress:</strong> 0 / {ach.progress.target} decades
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.5rem" }}>
                            Release songs from {ach.progress.target} different decades to complete this achievement. A decade is calculated from the song's release year (e.g., 1985 = 1980s).
                          </div>
                        </div>
                        
                        <div style={{ 
                          fontSize: "0.8rem", 
                          color: "#000000",
                          fontStyle: "italic"
                        }}>
                          Start by releasing songs from any decade to begin tracking your progress!
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>,
        document.body
      )}

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
                          margin: "0 0 0.5rem 0", 
                          fontSize: "0.9rem", 
                          color: ach.earned ? "#6c757d" : "#adb5bd"
                        }}>
                          {ach.description}
                        </p>
                        
                        {/* Progress Bar for Unearned Achievements */}
                        {!ach.earned && ach.progress && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <div style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              alignItems: "center", 
                              marginBottom: "0.25rem" 
                            }}>
                              <span style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                                {ach.progress.current} / {ach.progress.target}
                              </span>
                              <span style={{ fontSize: "0.8rem", color: "#007bff", fontWeight: "bold" }}>
                                {ach.progress.percentage}%
                              </span>
                            </div>
                            <ProgressBar 
                              current={ach.progress.current}
                              target={ach.progress.target}
                              percentage={ach.progress.percentage}
                            />
                            
                            {/* Missing Details - Hover to view */}
                            {ach.progress.details && (
                              <div style={{ marginTop: "0.5rem" }}>
                                <span
                                  onMouseEnter={(e) => handleDetailsHover(ach.id, e)}
                                  onMouseLeave={handleDetailsLeave}
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "#007bff",
                                    cursor: "pointer",
                                    textDecoration: "none",
                                    borderBottom: "1px dashed #007bff",
                                    transition: "color 0.2s ease",
                                  }}
                                  onMouseOver={(e) => e.target.style.color = "#0056b3"}
                                  onMouseOut={(e) => e.target.style.color = "#007bff"}
                                >
                                  View details
                                </span>
                              </div>
                            )}
                          </div>
                        )}
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

