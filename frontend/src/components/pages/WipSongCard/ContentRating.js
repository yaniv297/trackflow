import React, { useState } from "react";
import { apiPatch } from "../../../utils/api";

/**
 * Content rating component for WipSongCard
 * Allows users to set Family Friendly, Supervision Recommended, or Mature rating
 */

// Rating options with display info
const RATING_OPTIONS = [
  { 
    value: null, 
    label: "Not Rated", 
    icon: "—",
    color: "#999",
    description: "No content rating set"
  },
  { 
    value: "family_friendly", 
    label: "Family Friendly", 
    icon: "👨‍👩‍👧‍👦",
    color: "#28a745",
    description: "Suitable for all ages. No explicit content, mild themes only."
  },
  { 
    value: "supervision", 
    label: "Supervision Recommended", 
    icon: "⚠️",
    color: "#ffc107",
    description: "May contain mild language, suggestive themes, or references to substances."
  },
  { 
    value: "mature", 
    label: "Mature", 
    icon: "🔞",
    color: "#dc3545",
    description: "Contains explicit language, adult themes, or strong content. Not suitable for younger audiences."
  },
];

const ContentRating = ({ song, onSongUpdate, readOnly = false }) => {
  const [saving, setSaving] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const currentRating = RATING_OPTIONS.find(r => r.value === song.content_rating) || RATING_OPTIONS[0];

  const updateRating = async (newValue) => {
    setSaving(true);
    try {
      await apiPatch(`/songs/${song.id}`, {
        content_rating: newValue,
      });
      
      if (onSongUpdate) {
        onSongUpdate(song.id, { content_rating: newValue });
      }
      
      setShowDropdown(false);
      
      const ratingLabel = RATING_OPTIONS.find(r => r.value === newValue)?.label || "Not Rated";
      if (window.showNotification) {
        window.showNotification(`Content rating set to ${ratingLabel}`, "success");
      }
    } catch (error) {
      console.error("Failed to update content rating:", error);
      if (window.showNotification) {
        window.showNotification("Failed to update content rating", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => !readOnly && !saving && setShowDropdown(!showDropdown)}
        disabled={readOnly || saving}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.2rem 0.4rem",
          borderRadius: "4px",
          background: currentRating.value ? `${currentRating.color}15` : "#f8f9fa",
          border: `1px solid ${currentRating.value ? currentRating.color : "#ddd"}`,
          fontSize: "1rem",
          cursor: readOnly ? "default" : "pointer",
          opacity: saving ? 0.5 : (readOnly ? 0.7 : 1),
          minWidth: "28px",
          height: "28px",
        }}
        title={`${currentRating.label}: ${currentRating.description}`}
      >
        {saving ? "…" : currentRating.icon}
      </button>

      {showDropdown && !readOnly && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown menu */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "1px solid #e0e0e0",
              zIndex: 1000,
              minWidth: "280px",
              overflow: "hidden",
            }}
          >
            <div style={{ 
              padding: "0.5rem 0.75rem", 
              borderBottom: "1px solid #eee",
              background: "#f8f9fa",
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#666",
            }}>
              Select Content Rating
            </div>
            
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value || "null"}
                onClick={() => updateRating(option.value)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  border: "none",
                  background: song.content_rating === option.value ? `${option.color}10` : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  borderLeft: song.content_rating === option.value ? `3px solid ${option.color}` : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (song.content_rating !== option.value) {
                    e.currentTarget.style.background = "#f5f5f5";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = song.content_rating === option.value ? `${option.color}10` : "transparent";
                }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{option.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: "600", 
                    fontSize: "0.85rem",
                    color: option.color,
                    marginBottom: "2px",
                  }}>
                    {option.label}
                  </div>
                  <div style={{ 
                    fontSize: "0.75rem", 
                    color: "#666",
                    lineHeight: 1.3,
                  }}>
                    {option.description}
                  </div>
                </div>
                {song.content_rating === option.value && (
                  <span style={{ color: option.color, fontSize: "0.9rem" }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ContentRating;

