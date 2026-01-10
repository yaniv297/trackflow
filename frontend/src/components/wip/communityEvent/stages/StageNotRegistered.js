import React from "react";

const StageNotRegistered = ({ onRegister, loading }) => {
  return (
    <div className="stage-not-registered">
      <h3>Join the Community Event!</h3>
      <p>Show your interest and start working on your contribution.</p>
      <button
        className="register-button"
        onClick={onRegister}
        disabled={loading}
      >
        {loading ? "..." : "🎉 Count Me In!"}
      </button>
    </div>
  );
};

export default StageNotRegistered;

