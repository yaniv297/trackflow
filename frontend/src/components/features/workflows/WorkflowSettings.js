import React, { useState, useEffect } from "react";
import { apiGet, apiPut, apiPost } from "../../../utils/api";

const WorkflowSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [editingSteps, setEditingSteps] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);
      const workflowData = await apiGet("/workflows/my-workflow");

      setWorkflow(workflowData);
      // Attach stable client-side ids to avoid remounting on each keystroke
      const withLocalIds = (workflowData.steps || []).map((s, i) => ({
        ...s,
        _localId: s.id || `local-${Date.now()}-${i}`,
      }));
      setEditingSteps(withLocalIds);
    } catch (error) {
      console.error("Failed to load workflow data:", error);
      window.showNotification("Failed to load workflow settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const saveWorkflow = async () => {
    try {
      setSaving(true);

      // Validate steps
      if (editingSteps.length === 0) {
        window.showNotification(
          "Workflow must have at least one step",
          "error"
        );
        return;
      }

      // Ensure order indices are sequential
      const stepsWithCorrectOrder = editingSteps.map((step, index) => ({
        step_name: step.step_name,
        display_name: step.display_name,
        order_index: index,
      }));

      const updatedWorkflow = await apiPut("/workflows/my-workflow", {
        name: workflow.name,
        steps: stepsWithCorrectOrder,
      });

      setWorkflow(updatedWorkflow);
      setEditingSteps([...updatedWorkflow.steps]);
      
      // Always trigger cache invalidation event to clear all workflow caches
      // This ensures the updated workflow (including new steps like "Events") 
      // shows immediately on WIP page and throughout the app
      window.dispatchEvent(new CustomEvent("workflow-updated"));
      
      // Also dispatch a specific WIP refresh event to ensure songs refresh immediately
      // Use a small delay to allow backend to finish updating song_progress
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("wip-refresh"));
      }, 100);
      
      window.showNotification("Workflow updated successfully!", "success");
    } catch (error) {
      console.error("Failed to save workflow:", error);
      window.showNotification("Failed to save workflow", "error");
    } finally {
      setSaving(false);
    }
  };

  const addStep = () => {
    const newStep = {
      step_name: `custom_step_${Date.now()}`,
      display_name: "New Step",
      order_index: editingSteps.length,
      _localId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setEditingSteps([...editingSteps, newStep]);
  };

  const updateStep = (index, field, value) => {
    const updated = [...editingSteps];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-generate step_name from display_name
    // NOTE: display_name is preserved as-is (including slashes, special chars, etc.)
    // Only step_name is sanitized for use as a database identifier
    if (field === "display_name") {
      updated[index].step_name = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "_");
    }

    setEditingSteps(updated);
  };

  const deleteStep = (index) => {
    const updated = editingSteps.filter((_, i) => i !== index);
    setEditingSteps(updated);
  };

  const moveStep = (fromIndex, toIndex) => {
    const updated = [...editingSteps];
    const [movedStep] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedStep);
    setEditingSteps(updated);
  };

  const resetToDefault = async () => {
    try {
      setSaving(true);
      await apiPost("/workflows/reset-to-default");
      window.showNotification(
        "Successfully reset to default workflow!",
        "success"
      );
      loadWorkflowData();
    } catch (error) {
      console.error("Failed to reset to default:", error);
      window.showNotification("Failed to reset to default", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveStep(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div>Loading workflow settings...</div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div>No workflow configured</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem", display: "flex", gap: 12 }}>
        <input
          type="text"
          value={workflow.name}
          onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: "1rem",
          }}
        />
        <button
          onClick={resetToDefault}
          disabled={saving}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
          }}
        >
          Reset to Default
        </button>
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "1rem",
          borderRadius: 8,
          border: "1px solid #e1e5e9",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
          }}
        >
          <button
            onClick={addStep}
            style={{
              padding: "0.4rem 0.9rem",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ➕ Add Step
          </button>
        </div>

        {editingSteps.map((step, index) => (
          <div
            key={step._localId || index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 6,
              padding: "0.75rem",
              marginBottom: "0.6rem",
              backgroundColor: "white",
              cursor: "move",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  backgroundColor: "#6b7280",
                  color: "white",
                  minWidth: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                {index + 1}
              </div>

              <input
                type="text"
                value={step.display_name}
                onChange={(e) =>
                  updateStep(index, "display_name", e.target.value)
                }
                placeholder="Step name"
                style={{
                  flex: 1,
                  padding: "0.4rem 0.6rem",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: "1rem",
                }}
              />

              <button
                onClick={() => deleteStep(index)}
                style={{
                  padding: "0.4rem 0.6rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}

        {editingSteps.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "1.25rem",
              color: "#666",
              border: "2px dashed #d1d5db",
              borderRadius: 6,
            }}
          >
            No workflow steps. Click "Add Step" to get started.
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.75rem",
          marginTop: 12,
        }}
      >
        <button
          onClick={() => {
            setEditingSteps([...workflow.steps]);
            window.showNotification("Changes discarded", "info");
          }}
          disabled={saving}
          style={{
            padding: "0.6rem 1.1rem",
            backgroundColor: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Reset Changes
        </button>

        <button
          onClick={saveWorkflow}
          disabled={saving}
          style={{
            padding: "0.6rem 1.1rem",
            backgroundColor: saving ? "#9ca3af" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "💾 Saving..." : "💾 Save Workflow"}
        </button>
      </div>
    </div>
  );
};

export default WorkflowSettings;
