import React, { useState, useEffect, useCallback } from "react";
import { apiGet, apiPut } from "../../../utils/api";

/**
 * Instrument difficulty ratings component for WipSongCard
 * Shows Rock Band-style difficulty ratings: 0-5 dots + devil tier
 */

// Instrument display configuration
const INSTRUMENTS = [
  { key: "drums", label: "Drums", icon: "🥁" },
  { key: "bass", label: "Bass", icon: "🎸" },
  { key: "guitar", label: "Guitar", icon: "🎸" },
  { key: "vocals", label: "Vocals", icon: "🎤" },
  { key: "harmonies", label: "Harmonies", icon: "🎵" },
  { key: "keys", label: "Keys", icon: "🎹" },
  { key: "pro_keys", label: "Pro Keys", icon: "🎹" },
];

// Difficulty options with visual representation
const DIFFICULTY_OPTIONS = [
  { value: null, label: "—", title: "Not set" },
  { value: 0, label: "○○○○○", title: "0 dots" },
  { value: 1, label: "●○○○○", title: "1 dot" },
  { value: 2, label: "●●○○○", title: "2 dots" },
  { value: 3, label: "●●●○○", title: "3 dots" },
  { value: 4, label: "●●●●○", title: "4 dots" },
  { value: 5, label: "●●●●●", title: "5 dots" },
  { value: 6, label: "😈", title: "Devil tier" },
];

// Compact display for the difficulty value
const getDifficultyDisplay = (value) => {
  if (value === null || value === undefined) return "—";
  if (value === 6) return "😈";
  // For 0-5, show filled dots
  return "●".repeat(value) + "○".repeat(5 - value);
};

const getDifficultyColor = (value) => {
  if (value === null || value === undefined) return "#999";
  if (value === 6) return "#dc3545"; // Devil - red
  if (value >= 4) return "#fd7e14"; // Hard - orange
  if (value >= 2) return "#ffc107"; // Medium - yellow
  return "#28a745"; // Easy - green
};

const InstrumentDifficulties = ({ songId, readOnly = false }) => {
  const [difficulties, setDifficulties] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState(null);

  // Fetch difficulties on mount
  const fetchDifficulties = useCallback(async () => {
    try {
      const response = await apiGet(`/songs/${songId}/difficulties`);
      setDifficulties(response.difficulties || {});
    } catch (error) {
      console.error("Failed to fetch difficulties:", error);
      // Initialize with empty values on error
      setDifficulties({});
    } finally {
      setLoading(false);
    }
  }, [songId]);

  useEffect(() => {
    fetchDifficulties();
  }, [fetchDifficulties]);

  // Update a single instrument difficulty
  const updateDifficulty = async (instrument, value) => {
    setSaving(true);
    try {
      await apiPut(`/songs/${songId}/difficulties`, {
        difficulties: { [instrument]: value },
      });
      setDifficulties((prev) => ({ ...prev, [instrument]: value }));
      setEditingInstrument(null);
    } catch (error) {
      console.error("Failed to update difficulty:", error);
      if (window.showNotification) {
        window.showNotification("Failed to update difficulty", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // Count how many instruments have difficulties set
  const setCount = Object.values(difficulties).filter(
    (v) => v !== null && v !== undefined
  ).length;

  if (loading) {
    return (
      <div style={{ fontSize: "0.8rem", color: "#999", padding: "0.25rem" }}>
        Loading...
      </div>
    );
  }

  // Compact collapsed view - styled button
  if (!expanded) {
    return (
      <button
        style={{
          cursor: "pointer",
          padding: "0.25rem 0.5rem",
          borderRadius: "4px",
          background: setCount > 0 ? "#f0f7ff" : "#f8f9fa",
          border: `1px solid ${setCount > 0 ? "#c2d9f2" : "#ddd"}`,
          fontSize: "0.8rem",
          color: setCount > 0 ? "#5a8fcf" : "#666",
          whiteSpace: "nowrap",
          fontWeight: "500",
        }}
        onClick={() => setExpanded(true)}
        title="Click to edit instrument difficulties"
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = setCount > 0 ? "#e3f0ff" : "#f0f0f0";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = setCount > 0 ? "#f0f7ff" : "#f8f9fa";
        }}
      >
        Difficulties{setCount > 0 ? ` (${setCount})` : ""}
      </button>
    );
  }

  // Expanded view - show all instruments
  return (
    <div
      style={{
        background: "#fafafa",
        borderRadius: "8px",
        padding: "0.75rem",
        border: "1px solid #e0e0e0",
        marginTop: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{ fontWeight: "600", fontSize: "0.85rem", color: "#333" }}
        >
          Instrument Difficulties
        </span>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
            color: "#666",
            padding: "0 0.25rem",
          }}
          title="Collapse"
        >
          ▲
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {INSTRUMENTS.map(({ key, label, icon }) => {
          const value = difficulties[key];
          const isEditing = editingInstrument === key;

          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.5rem",
                background: "#fff",
                borderRadius: "6px",
                border: "1px solid #e8e8e8",
              }}
            >
              <span style={{ fontSize: "0.9rem" }} title={label}>
                {icon}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#666",
                  minWidth: "45px",
                }}
              >
                {label}:
              </span>

              {isEditing && !readOnly ? (
                <select
                  value={value === null || value === undefined ? "" : value}
                  onChange={(e) => {
                    const newValue =
                      e.target.value === "" ? null : parseInt(e.target.value);
                    updateDifficulty(key, newValue);
                  }}
                  onBlur={() => setEditingInstrument(null)}
                  autoFocus
                  disabled={saving}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.15rem",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    background: "#fff",
                    cursor: "pointer",
                    minWidth: "70px",
                  }}
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <option
                      key={opt.value === null ? "null" : opt.value}
                      value={opt.value === null ? "" : opt.value}
                    >
                      {opt.title}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  onClick={() => !readOnly && setEditingInstrument(key)}
                  style={{
                    fontSize: "0.75rem",
                    color: getDifficultyColor(value),
                    cursor: readOnly ? "default" : "pointer",
                    fontWeight: "500",
                    letterSpacing: "-1px",
                  }}
                  title={
                    readOnly
                      ? DIFFICULTY_OPTIONS.find(
                          (o) => o.value === value
                        )?.title || "Not set"
                      : "Click to edit"
                  }
                >
                  {getDifficultyDisplay(value)}
                </span>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default InstrumentDifficulties;

