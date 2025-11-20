import React from "react";

function FeatureRequestForm({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
  submitting,
  submitLabel = "Create Request",
  cancelLabel = "Cancel",
}) {
  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "600",
            color: "#333",
          }}
        >
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Brief title for your feature request"
          maxLength={200}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}
          disabled={submitting}
        />
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "600",
            color: "#333",
          }}
        >
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe the feature you'd like to see..."
          rows={6}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "1rem",
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          disabled={submitting}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          disabled={submitting || !title.trim() || !description.trim()}
          style={{
            flex: 1,
            padding: "0.75rem",
            background:
              submitting || !title.trim() || !description.trim()
                ? "#ccc"
                : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            cursor:
              submitting || !title.trim() || !description.trim()
                ? "not-allowed"
                : "pointer",
            fontWeight: "600",
          }}
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
              cursor: submitting ? "not-allowed" : "pointer",
              fontWeight: "600",
            }}
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}

export default FeatureRequestForm;

