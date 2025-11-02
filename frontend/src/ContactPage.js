import React from "react";

function ContactPage() {
  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Contact</h1>

      <div
        style={{
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          padding: "2rem",
        }}
      >
        <p style={{ lineHeight: "1.6", color: "#333", marginBottom: "1.5rem" }}>
          Have questions, feedback, or need help with TrackFlow? Feel free to
          reach out!
        </p>

        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ color: "#007bff", marginBottom: "0.75rem" }}>
            📧 Email
          </h3>
          <a
            href="mailto:yanivb297@gmail.com"
            style={{
              fontSize: "1.1rem",
              color: "#007bff",
              textDecoration: "none",
            }}
          >
            yanivb297@gmail.com
          </a>
        </div>

        <div>
          <h3 style={{ color: "#5865F2", marginBottom: "0.75rem" }}>
            💬 Discord
          </h3>
          <p
            style={{
              fontSize: "1.1rem",
              color: "#333",
              fontFamily: "monospace",
            }}
          >
            yaniv297
          </p>
          <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "0.5rem" }}>
            Feel free to send a friend request or DM
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#e7f3ff",
          borderRadius: "8px",
          border: "1px solid #b3d9ff",
        }}
      >
        <p style={{ lineHeight: "1.6", color: "#333", margin: 0 }}>
          💡 <strong>Tip:</strong> Check out the{" "}
          <a href="/help" style={{ color: "#007bff", textDecoration: "none" }}>
            Help page
          </a>{" "}
          for answers to common questions and feature guides.
        </p>
      </div>
    </div>
  );
}

export default ContactPage;
