import React, { useState, useEffect, useMemo } from "react";
import { apiGet, apiPut } from "../../utils/api";
import { useWorkflowData } from "../../hooks/workflows/useWorkflowData";

/**
 * Modal for managing irrelevant (N/A) steps for a song.
 * Allows users to mark certain workflow steps as not applicable for a specific song,
 * for example when a song doesn't have Keys or Pro Keys parts.
 * 
 * Irrelevant steps are excluded from completion percentage calculations.
 */
const IrrelevantStepsModal = ({ isOpen, onClose, song, onSuccess, currentUser }) => {
  const [selectedIrrelevant, setSelectedIrrelevant] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [fetchingSteps, setFetchingSteps] = useState(true);
  const [error, setError] = useState("");
  
  // Get workflow fields for the song owner
  const { authoringFields, getStepDisplayInfo } = useWorkflowData(
    song?.user_id === currentUser?.id ? currentUser : { id: song?.user_id }
  );

  // Fetch current irrelevant steps when modal opens
  useEffect(() => {
    if (isOpen && song?.id) {
      fetchIrrelevantSteps();
    }
  }, [isOpen, song?.id]);

  const fetchIrrelevantSteps = async () => {
    setFetchingSteps(true);
    setError("");
    try {
      const response = await apiGet(`/workflows/songs/${song.id}/irrelevant-steps`);
      setSelectedIrrelevant(new Set(response.irrelevant_steps || []));
    } catch (err) {
      console.error("Failed to fetch irrelevant steps:", err);
      // Try to use locally stored data if API fails
      if (song.irrelevantSteps) {
        setSelectedIrrelevant(new Set(song.irrelevantSteps));
      }
    } finally {
      setFetchingSteps(false);
    }
  };

  const handleToggleStep = (stepName) => {
    setSelectedIrrelevant(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepName)) {
        newSet.delete(stepName);
      } else {
        newSet.add(stepName);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const irrelevantSteps = Array.from(selectedIrrelevant);
      await apiPut(`/workflows/songs/${song.id}/irrelevant-steps`, {
        irrelevant_steps: irrelevantSteps,
      });

      if (onSuccess) {
        // Pass the updated irrelevant steps to the callback
        onSuccess(song.id, { irrelevantSteps });
      }
      onClose();
      
      const stepCount = irrelevantSteps.length;
      if (stepCount === 0) {
        window.showNotification("All parts restored for this song", "success");
      } else {
        window.showNotification(
          `${stepCount} part${stepCount === 1 ? '' : 's'} removed from this song`,
          "success"
        );
      }
    } catch (err) {
      console.error("Failed to update removed parts:", err);
      setError(err.message || "Failed to update removed parts");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setLoading(false);
    onClose();
  };

  // Group steps by category if available
  const groupedSteps = useMemo(() => {
    if (!authoringFields || authoringFields.length === 0) {
      return { "Workflow Steps": [] };
    }

    const grouped = {};
    authoringFields.forEach(stepName => {
      const stepInfo = getStepDisplayInfo ? getStepDisplayInfo(stepName) : null;
      const category = stepInfo?.category || "Workflow Steps";
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        name: stepName,
        displayName: stepInfo?.displayName || stepName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: stepInfo?.description,
      });
    });

    return grouped;
  }, [authoringFields, getStepDisplayInfo]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          padding: "2rem",
          maxWidth: "550px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: "0.5rem", color: "#333" }}>
          Remove Parts
        </h2>

        <p
          style={{ marginBottom: "1.5rem", color: "#666", fontSize: "0.9rem" }}
        >
          Remove parts that don't exist in "{song?.title}" by {song?.artist}.
          <br />
          <span style={{ fontSize: "0.85rem", color: "#888" }}>
            Removed parts won't count toward completion.
            Use this for instruments the song doesn't have (e.g., no Keys/Pro Keys).
          </span>
        </p>

        {fetchingSteps ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
            Loading workflow steps...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1.5rem" }}>
              {Object.entries(groupedSteps).map(([category, steps]) => (
                <div key={category} style={{ marginBottom: "1rem" }}>
                  {Object.keys(groupedSteps).length > 1 && (
                    <h4 style={{ 
                      margin: "0 0 0.5rem 0", 
                      color: "#555", 
                      fontSize: "0.9rem",
                      borderBottom: "1px solid #eee",
                      paddingBottom: "0.25rem"
                    }}>
                      {category}
                    </h4>
                  )}
                  <div style={{ 
                    display: "flex", 
                    flexWrap: "wrap", 
                    gap: "0.5rem" 
                  }}>
                    {steps.map(step => {
                      const isIrrelevant = selectedIrrelevant.has(step.name);
                      return (
                        <button
                          key={step.name}
                          type="button"
                          onClick={() => handleToggleStep(step.name)}
                          title={step.description || (isIrrelevant ? "Click to make relevant" : "Click to mark as N/A")}
                          style={{
                            padding: "0.4rem 0.8rem",
                            borderRadius: "16px",
                            border: isIrrelevant ? "2px solid #dc3545" : "2px solid #28a745",
                            background: isIrrelevant ? "#fff5f5" : "#f0fff4",
                            color: isIrrelevant ? "#dc3545" : "#28a745",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            fontWeight: "500",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                        >
                          {isIrrelevant ? (
                            <>
                              <span style={{ fontSize: "0.75rem" }}>✕</span>
                              <span style={{ textDecoration: "line-through", opacity: 0.8 }}>
                                {step.displayName}
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: "0.75rem" }}>✓</span>
                              {step.displayName}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              fontSize: "0.9rem",
              color: "#555",
            }}>
              <strong>{selectedIrrelevant.size}</strong> part{selectedIrrelevant.size === 1 ? '' : 's'} removed
              {selectedIrrelevant.size > 0 && (
                <span style={{ color: "#888" }}>
                  {' '}• Completion calculated from {authoringFields.length - selectedIrrelevant.size} parts
                </span>
              )}
            </div>

            {error && (
              <div
                style={{
                  padding: "0.75rem",
                  marginBottom: "1rem",
                  backgroundColor: "#f8d7da",
                  color: "#721c24",
                  borderRadius: "4px",
                  border: "1px solid #f5c6cb",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  background: "white",
                  color: "#666",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  borderRadius: "6px",
                  background: loading ? "#ccc" : "#007bff",
                  color: "white",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                }}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default IrrelevantStepsModal;

