import React, { useState, useEffect } from "react";
import { apiGet, apiPut, apiPost } from "../utils/api";

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
      setEditingSteps([...workflowData.steps]);
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
        ...step,
        order_index: index,
      }));

      const updatedWorkflow = await apiPut("/workflows/my-workflow", {
        name: workflow.name,
        description: workflow.description,
        steps: stepsWithCorrectOrder,
      });

      setWorkflow(updatedWorkflow);
      setEditingSteps([...updatedWorkflow.steps]);
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
      description: "",
      order_index: editingSteps.length,
      is_required: true,
      category: "custom",
      is_enabled: true,
    };
    setEditingSteps([...editingSteps, newStep]);
  };

  const updateStep = (index, field, value) => {
    const updated = [...editingSteps];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-generate step_name from display_name
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

      // Reset to default workflow by creating a new workflow from the default template
      await apiPost("/workflows/reset-to-default");

      window.showNotification(
        "Successfully reset to default workflow!",
        "success"
      );
      loadWorkflowData(); // Reload to show new workflow
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
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
          🎵 Workflow Settings
        </h1>
        <p style={{ color: "#666", fontSize: "1rem" }}>
          Customize your authoring workflow. Songs will show progress based on
          these steps.
        </p>
      </div>

      {/* Workflow Basic Info */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          marginBottom: "2rem",
          border: "1px solid #e1e5e9",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
          Workflow Information
        </h2>

        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            Workflow Name
          </label>
          <input
            type="text"
            value={workflow.name}
            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "1rem",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            Description
          </label>
          <textarea
            value={workflow.description || ""}
            onChange={(e) =>
              setWorkflow({ ...workflow, description: e.target.value })
            }
            rows={3}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "1rem",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            onClick={resetToDefault}
            disabled={saving}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "1rem",
              opacity: saving ? 0.6 : 1,
            }}
          >
            🔄 Reset to Default
          </button>

          <div style={{ color: "#666", fontSize: "0.9rem" }}>
            {editingSteps.length} steps total •{" "}
            {editingSteps.filter((s) => s.is_required).length} required
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          marginBottom: "2rem",
          border: "1px solid #e1e5e9",
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
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Workflow Steps</h2>
          <button
            onClick={addStep}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            ➕ Add Step
          </button>
        </div>

        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: "#f3f4f6",
            borderRadius: "4px",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
            💡 <strong>Tip:</strong> Drag steps to reorder them. Required steps
            must be completed for songs to be marked as finished.
          </p>
        </div>

        {editingSteps.map((step, index) => (
          <div
            key={step.step_name || index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "1rem",
              marginBottom: "0.75rem",
              backgroundColor: step.is_enabled ? "white" : "#f9fafb",
              opacity: step.is_enabled ? 1 : 0.7,
              cursor: "move",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "#6b7280",
                  color: "white",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  cursor: "grab",
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
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  fontWeight: "500",
                }}
              />

              <select
                value={step.category || ""}
                onChange={(e) => updateStep(index, "category", e.target.value)}
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">No category</option>
                <option value="preparation">Preparation</option>
                <option value="tracking">Tracking</option>
                <option value="authoring">Authoring</option>
                <option value="production">Production</option>
                <option value="media">Media</option>
                <option value="finishing">Finishing</option>
                <option value="custom">Custom</option>
              </select>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.9rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={step.is_required}
                  onChange={(e) =>
                    updateStep(index, "is_required", e.target.checked)
                  }
                />
                Required
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.9rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={step.is_enabled}
                  onChange={(e) =>
                    updateStep(index, "is_enabled", e.target.checked)
                  }
                />
                Enabled
              </label>

              <button
                onClick={() => deleteStep(index)}
                style={{
                  padding: "0.5rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                🗑️
              </button>
            </div>

            <input
              type="text"
              value={step.description || ""}
              onChange={(e) => updateStep(index, "description", e.target.value)}
              placeholder="Optional description for this step"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "0.9rem",
                color: "#666",
              }}
            />
          </div>
        ))}

        {editingSteps.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#666",
              border: "2px dashed #d1d5db",
              borderRadius: "6px",
            }}
          >
            No workflow steps. Click "Add Step" to get started.
          </div>
        )}
      </div>

      {/* Save Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
        <button
          onClick={() => {
            setEditingSteps([...workflow.steps]);
            window.showNotification("Changes discarded", "info");
          }}
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Reset Changes
        </button>

        <button
          onClick={saveWorkflow}
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: saving ? "#9ca3af" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: saving ? "not-allowed" : "pointer",
            fontSize: "1rem",
          }}
        >
          {saving ? "💾 Saving..." : "💾 Save Workflow"}
        </button>
      </div>
    </div>
  );
};

export default WorkflowSettings;
