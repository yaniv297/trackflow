import React from 'react';
import './BulkProgressModal.css';

const BulkProgressModal = ({ 
  isOpen, 
  title, 
  message, 
  progress, 
  total, 
  isComplete = false,
  onClose = null 
}) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal bulk-progress-modal">
        <div className="modal-header">
          <h3>{title}</h3>
          {isComplete && onClose && (
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
          <p className="progress-message">{message}</p>
          
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <div className="progress-text">
              {progress} / {total} ({percentage}%)
            </div>
          </div>
          
          {isComplete && (
            <div className="progress-complete">
              ✅ Operation completed successfully!
            </div>
          )}
        </div>
        
        {isComplete && onClose && (
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkProgressModal;