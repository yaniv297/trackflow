import React from "react";

const CustomAlert = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // warning, danger, info
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: "⚠️",
          confirmButtonStyle: {
            backgroundColor: "#ef4444",
            color: "white",
          },
          confirmButtonHoverStyle: {
            backgroundColor: "#dc2626",
          },
          borderStyle: {
            borderColor: "#fecaca",
          },
        };
      case "warning":
        return {
          icon: "⚠️",
          confirmButtonStyle: {
            backgroundColor: "#eab308",
            color: "white",
          },
          confirmButtonHoverStyle: {
            backgroundColor: "#ca8a04",
          },
          borderStyle: {
            borderColor: "#fef3c7",
          },
        };
      case "info":
        return {
          icon: "ℹ️",
          confirmButtonStyle: {
            backgroundColor: "#3b82f6",
            color: "white",
          },
          confirmButtonHoverStyle: {
            backgroundColor: "#2563eb",
          },
          borderStyle: {
            borderColor: "#dbeafe",
          },
        };
      default:
        return {
          icon: "⚠️",
          confirmButtonStyle: {
            backgroundColor: "#eab308",
            color: "white",
          },
          confirmButtonHoverStyle: {
            backgroundColor: "#ca8a04",
          },
          borderStyle: {
            borderColor: "#fef3c7",
          },
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

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
          border: `2px solid ${styles.borderStyle.borderColor}`,
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
          <span style={{ fontSize: "24px", marginRight: "12px" }}>
            {styles.icon}
          </span>
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
              margin: 0,
            }}
          >
            {message}
          </p>
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
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
              transition: "background-color 0.2s",
              ...styles.confirmButtonStyle,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor =
                styles.confirmButtonHoverStyle.backgroundColor;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor =
                styles.confirmButtonStyle.backgroundColor;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;
