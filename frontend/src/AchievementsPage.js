import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "./utils/api";
import AchievementBadge from "./components/AchievementBadge";

const RARITY_COLORS = {
  common: "#95a5a6",
  uncommon: "#2ecc71",
  rare: "#3498db",
  epic: "#9b59b6",
  legendary: "#f39c12",
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRarity, setSelectedRarity] = useState("all");
  const [showEarnedOnly, setShowEarnedOnly] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, []);

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

  const handleCheckAchievements = async () => {
    try {
      await apiPost("/achievements/check");
      // Refresh achievements
      await fetchAchievements();
      if (window.showNotification) {
        window.showNotification("Achievements checked!", "success");
      }
    } catch (error) {
      console.error("Failed to check achievements:", error);
      if (window.showNotification) {
        window.showNotification("Failed to check achievements", "error");
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
  const totalPoints = achievements.reduce(
    (sum, ua) => sum + (ua.achievement?.points || 0),
    0
  );

  const earnedByCategory = {};
  const totalByCategory = {};
  allAchievements.forEach((ach) => {
    earnedByCategory[ach.category] =
      (earnedByCategory[ach.category] || 0) + (ach.earned ? 1 : 0);
    totalByCategory[ach.category] = (totalByCategory[ach.category] || 0) + 1;
  });

  const earnedByRarity = {};
  const totalByRarity = {};
  allAchievements.forEach((ach) => {
    earnedByRarity[ach.rarity] =
      (earnedByRarity[ach.rarity] || 0) + (ach.earned ? 1 : 0);
    totalByRarity[ach.rarity] = (totalByRarity[ach.rarity] || 0) + 1;
  });

  // Filter achievements
  const filteredAchievements = allAchievements.filter((ach) => {
    if (selectedCategory !== "all" && ach.category !== selectedCategory) {
      return false;
    }
    if (selectedRarity !== "all" && ach.rarity !== selectedRarity) {
      return false;
    }
    if (showEarnedOnly && !ach.earned) {
      return false;
    }
    return true;
  });

  // Get recently earned (last 5)
  const recentAchievements = achievements
    .sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
    .slice(0, 5);

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h2>🏆 Achievements</h2>
        <button
          onClick={handleCheckAchievements}
          style={{
            padding: "0.5rem 1rem",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Check Achievements
        </button>
      </div>

      {/* Stats Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "1rem",
            border: "1px solid #eee",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#3498db" }}>
            {achievements.length} / {allAchievements.length}
          </div>
          <div style={{ color: "#666", fontSize: "0.9rem" }}>Earned</div>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "1rem",
            border: "1px solid #eee",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f39c12" }}>
            {totalPoints}
          </div>
          <div style={{ color: "#666", fontSize: "0.9rem" }}>Total Points</div>
        </div>
        {Object.keys(totalByCategory).map((category) => (
          <div
            key={category}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1rem",
              border: "1px solid #eee",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#2ecc71",
              }}
            >
              {earnedByCategory[category]} / {totalByCategory[category]}
            </div>
            <div style={{ color: "#666", fontSize: "0.9rem", textTransform: "capitalize" }}>
              {category}
            </div>
          </div>
        ))}
      </div>

      {/* Recently Earned */}
      {recentAchievements.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            padding: "1.5rem",
            border: "1px solid #eee",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ marginBottom: "1rem" }}>Recently Earned</h3>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {recentAchievements.map((ua) => (
              <AchievementBadge
                key={ua.achievement.id}
                achievement={ua.achievement}
                earned={true}
                size="large"
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "1rem",
          border: "1px solid #eee",
          marginBottom: "1rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: "bold" }}>Filters:</div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        >
          <option value="all">All Categories</option>
          <option value="milestone">Milestone</option>
          <option value="activity">Activity</option>
          <option value="quality">Quality</option>
          <option value="social">Social</option>
          <option value="diversity">Diversity</option>
        </select>
        <select
          value={selectedRarity}
          onChange={(e) => setSelectedRarity(e.target.value)}
          style={{
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid #ddd",
          }}
        >
          <option value="all">All Rarities</option>
          <option value="common">Common</option>
          <option value="uncommon">Uncommon</option>
          <option value="rare">Rare</option>
          <option value="epic">Epic</option>
          <option value="legendary">Legendary</option>
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showEarnedOnly}
            onChange={(e) => setShowEarnedOnly(e.target.checked)}
          />
          Show earned only
        </label>
      </div>

      {/* Achievements Grid */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #eee",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3>
            {filteredAchievements.length} Achievement
            {filteredAchievements.length !== 1 ? "s" : ""}
          </h3>
        </div>

        {filteredAchievements.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            No achievements match your filters.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "1rem",
            }}
          >
            {filteredAchievements.map((ach) => (
              <AchievementBadge
                key={ach.id}
                achievement={ach}
                earned={ach.earned}
                size="medium"
              />
            ))}
          </div>
        )}
      </div>

      {/* Rarity Breakdown */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid #eee",
          marginTop: "2rem",
        }}
      >
        <h3 style={{ marginBottom: "1rem" }}>Progress by Rarity</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {Object.keys(totalByRarity)
            .sort()
            .map((rarity) => {
              const earned = earnedByRarity[rarity] || 0;
              const total = totalByRarity[rarity] || 0;
              const percentage = total > 0 ? (earned / total) * 100 : 0;
              return (
                <div key={rarity}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.25rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span style={{ textTransform: "capitalize", fontWeight: "bold" }}>
                      {rarity}
                    </span>
                    <span>
                      {earned} / {total} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div
                    style={{
                      background: "#ecf0f1",
                      borderRadius: "4px",
                      height: "20px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        background: RARITY_COLORS[rarity] || RARITY_COLORS.common,
                        height: "100%",
                        width: `${percentage}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

