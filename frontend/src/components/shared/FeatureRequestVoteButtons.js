import React from "react";

function FeatureRequestVoteButtons({ request, onVote, getNetVotes }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        minWidth: "60px",
      }}
    >
      <button
        onClick={() => onVote(request.id, "upvote")}
        style={{
          background: "none",
          border: "none",
          fontSize: "1.5rem",
          cursor: "pointer",
          color: request.user_vote === "upvote" ? "#007bff" : "#666",
          padding: "0.25rem",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.2)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
        title="Upvote"
      >
        ▲
      </button>
      <div
        style={{
          fontSize: "1.2rem",
          fontWeight: "600",
          color: "#333",
          minWidth: "30px",
          textAlign: "center",
        }}
      >
        {getNetVotes(request)}
      </div>
      <button
        onClick={() => onVote(request.id, "downvote")}
        style={{
          background: "none",
          border: "none",
          fontSize: "1.5rem",
          cursor: "pointer",
          color: request.user_vote === "downvote" ? "#dc3545" : "#666",
          padding: "0.25rem",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.2)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
        title="Downvote"
      >
        ▼
      </button>
    </div>
  );
}

export default FeatureRequestVoteButtons;

