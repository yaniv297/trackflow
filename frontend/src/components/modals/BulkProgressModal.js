import React from "react";
import "./BulkProgressModal.css";

const BulkProgressModal = ({
  isOpen,
  title = "Processing",
  message = "",
  description = "",
  progress = 0,
  completed = 0,
  total = 0,
  isComplete = false,
  isProcessing = false,
  onClose = null,
}) => {
  if (!isOpen) return null;

  // Support both 'progress' and 'completed' props
  const actualProgress = completed !== undefined ? completed : progress;
  const actualIsComplete = isComplete || (!isProcessing && actualProgress > 0);
  const percentage =
    total > 0
      ? Math.round((actualProgress / total) * 100)
      : isProcessing
      ? 0
      : 100;

  return (
    <div className="modal-overlay">
      <div className="modal bulk-progress-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          {actualIsComplete && onClose && (
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        <div className="modal-body">
          {(message || description) && (
            <p className="progress-message">{message || description}</p>
          )}

          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="progress-text">
              {actualProgress} / {total} ({percentage}%)
            </div>
          </div>

          {actualIsComplete && (
            <div className="progress-complete">
              ✅ Operation completed successfully!
            </div>
          )}

          {isProcessing && !actualIsComplete && (
            <div
              className="progress-message"
              style={{ marginTop: "8px", fontSize: "0.9em", color: "#666" }}
            >
              Processing... Please wait.
            </div>
          )}
        </div>

        {actualIsComplete && onClose && (
          <div className="modal-footer">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkProgressModal;
