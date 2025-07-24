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
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
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
      if (e.key === "Enter" && inputValue.trim()) {
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
  }, [isOpen, onClose, inputValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border-2 border-blue-200">
        {/* Header */}
        <div className="flex items-center p-6 border-b border-gray-200">
          <span className="text-2xl mr-3">📝</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed mb-4">{message}</p>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!inputValue.trim()}
            className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors duration-200 font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPrompt;
