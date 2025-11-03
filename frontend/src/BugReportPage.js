import React, { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { apiPost } from "./utils/api";

function BugReportPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subject.trim() || !description.trim()) {
      window.showNotification(
        "Please fill in both subject and description",
        "error"
      );
      return;
    }

    setLoading(true);
    try {
      await apiPost("/bug-reports/submit", {
        subject: subject.trim(),
        description: description.trim(),
      });

      window.showNotification(
        "Bug report sent! Thank you for your feedback.",
        "success"
      );
      setSubmitted(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        setSubject("");
        setDescription("");
        setSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to submit bug report:", error);
      window.showNotification(
        "Failed to send bug report. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Report a Bug</h1>

      <div
        style={{
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          padding: "2rem",
        }}
      >
        {!submitted ? (
          <>
            <p
              style={{
                lineHeight: "1.6",
                color: "#333",
                marginBottom: "1.5rem",
              }}
            >
              Found a bug or issue? Let us know! Your feedback helps improve
              TrackFlow for everyone.
            </p>

            <div
              style={{
                background: "#e7f3ff",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                border: "1px solid #b3d9ff",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#333" }}>
                <strong>Logged in as:</strong> {user?.username} ({user?.email})
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#333",
                  }}
                >
                  Subject *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of the issue"
                  maxLength={200}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                  disabled={loading}
                />
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#666",
                    marginTop: "0.25rem",
                    marginBottom: 0,
                  }}
                >
                  {subject.length}/200 characters
                </p>
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
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened, what you expected, and steps to reproduce the issue..."
                  rows={10}
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
                  disabled={loading}
                />
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#666",
                    marginTop: "0.25rem",
                    marginBottom: 0,
                  }}
                >
                  Be as detailed as possible - it helps us fix the issue faster!
                </p>
              </div>

              <div
                style={{
                  background: "#fff3cd",
                  padding: "1rem",
                  borderRadius: "8px",
                  marginBottom: "1.5rem",
                  border: "1px solid #ffeaa7",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#333" }}>
                  <strong>💡 Tip:</strong> Include browser info, what page you
                  were on, and what you were trying to do when the bug occurred.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !subject.trim() || !description.trim()}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background:
                    loading || !subject.trim() || !description.trim()
                      ? "#ccc"
                      : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  cursor:
                    loading || !subject.trim() || !description.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "600",
                }}
              >
                {loading ? "Sending..." : "Submit Bug Report"}
              </button>
            </form>
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
            }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ color: "#28a745", marginBottom: "1rem" }}>
              Report Submitted!
            </h2>
            <p style={{ color: "#666" }}>
              Thank you for helping improve TrackFlow. We'll look into this
              issue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BugReportPage;
