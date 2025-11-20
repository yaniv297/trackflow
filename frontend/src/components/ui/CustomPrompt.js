import React, { useState, useEffect } from "react";

const CustomPrompt = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Enter Information",
  message = "Please provide the required information:",
  placeholder = "",
  defaultValue = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  allowEmpty = false, // If true, allows empty input
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (allowEmpty || inputValue.trim()) {
      onConfirm(inputValue.trim() || "");
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleEnter = (e) => {
      if (e.key === "Enter" && (allowEmpty || inputValue.trim())) {
        handleConfirm();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("keydown", handleEnter);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleEnter);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, inputValue, handleConfirm]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          maxWidth: "400px",
          width: "100%",
          margin: "0 16px",
          border: "2px solid #dbeafe",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <span style={{ fontSize: "24px", marginRight: "12px" }}>📝</span>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827",
              margin: 0,
            }}
          >
            {title}
          </h3>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          <p
            style={{
              color: "#374151",
              lineHeight: "1.6",
              margin: "0 0 16px 0",
            }}
          >
            {message}
          </p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "14px",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3b82f6";
              e.target.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#d1d5db";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "24px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 16px",
              color: "#374151",
              backgroundColor: "#f3f4f6",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#e5e7eb";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "#f3f4f6";
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allowEmpty && !inputValue.trim()}
            style={{
              padding: "8px 16px",
              color: "white",
              backgroundColor:
                !allowEmpty && !inputValue.trim() ? "#d1d5db" : "#3b82f6",
              border: "none",
              borderRadius: "6px",
              cursor:
                !allowEmpty && !inputValue.trim() ? "not-allowed" : "pointer",
              fontWeight: "500",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!(!allowEmpty && !inputValue.trim())) {
                e.target.style.backgroundColor = "#2563eb";
              }
            }}
            onMouseLeave={(e) => {
              if (!(!allowEmpty && !inputValue.trim())) {
                e.target.style.backgroundColor = "#3b82f6";
              }
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPrompt;
