import React, { useState, useEffect } from "react";

const PackPriorityBadge = ({ 
  priority, 
  packName, 
  onUpdatePriority, 
  disabled = false 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [newPriority, setNewPriority] = useState(priority);


  // Update internal state when priority prop changes
  useEffect(() => {
    setNewPriority(priority);
  }, [priority]);

  const handleClick = () => {
    if (disabled) return;
    setNewPriority(priority);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      await onUpdatePriority(packName, newPriority);
      setShowModal(false);
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  };

  const getPriorityDisplay = (priorityValue) => {
    switch (priorityValue) {
      case 5: return { emoji: "", text: "5" };
      case 4: return { emoji: "", text: "4" };
      case 3: return { emoji: "", text: "3" };
      case 2: return { emoji: "", text: "2" };
      case 1: return { emoji: "", text: "1" };
      default: return { emoji: "➕", text: "" };
    }
  };

  const getPriorityStyle = (priorityValue) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "0.2rem 0.5rem",
    borderRadius: "10px",
    fontSize: "0.9rem",
    fontWeight: "700",
    cursor: disabled ? "default" : "pointer",
    border: "1px solid transparent",
    transition: "all 0.2s ease",
    backgroundColor: 
      priorityValue === 5 ? "#ffebee" :
      priorityValue === 4 ? "#fff3e0" :
      priorityValue === 3 ? "#e8f5e8" :
      priorityValue === 2 ? "#e3f2fd" :
      priorityValue === 1 ? "#f5f5f5" : "#f8f9fa",
    color:
      priorityValue === 5 ? "#d32f2f" :
      priorityValue === 4 ? "#f57c00" :
      priorityValue === 3 ? "#388e3c" :
      priorityValue === 2 ? "#1976d2" :
      priorityValue === 1 ? "#757575" : "#6c757d",
  });

  const display = getPriorityDisplay(priority);
  
  return (
    <>
      <span
        onClick={handleClick}
        style={getPriorityStyle(priority)}
        title={priority ? `Priority: ${priority}/5 (click to change)` : "No priority (click to set)"}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.target.style.borderColor = "#007bff";
            e.target.style.transform = "scale(1.05)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.target.style.borderColor = "transparent";
            e.target.style.transform = "scale(1)";
          }
        }}
      >
        {display.emoji}{display.text}
      </span>

      {/* Priority Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: "1.5rem",
              borderRadius: 12,
              minWidth: 400,
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "1.5rem" }}>Set Pack Priority</h3>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#555",
                }}
              >
                Priority Level for "{packName}"
              </label>
              <select
                value={newPriority || ""}
                onChange={(e) => setNewPriority(e.target.value ? parseInt(e.target.value) : null)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              >
                <option value="">📝 No Priority</option>
                <option value="5">🔥 Urgent (5)</option>
                <option value="4">⚡ High (4)</option>
                <option value="3">📝 Medium (3)</option>
                <option value="2">📋 Low (2)</option>
                <option value="1">💤 Someday (1)</option>
              </select>
            </div>
            
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "#6c757d",
                  color: "#fff",
                  border: 0,
                  padding: "0.5rem 1rem",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                style={{
                  background: "#007bff",
                  color: "#fff",
                  border: 0,
                  padding: "0.5rem 1rem",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Update Priority
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PackPriorityBadge;