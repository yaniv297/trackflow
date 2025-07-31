import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "./utils/api";
import UserDropdown from "./components/UserDropdown";

// Utility function to capitalize artist and album names
const capitalizeName = (name) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

function NewSongForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    artist: "",
    album: "",
    pack: "",
    status: "Future Plans",
    collaborations: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Parse collaborations if provided
    const songData = { ...form };
    if (form.collaborations.trim()) {
      const collaborations = form.collaborations.split(",").map((collab) => {
        const author = collab.trim();
        return {
          author: author,
          parts: null,
        };
      });
      songData.collaborations = collaborations;
    } else {
      delete songData.collaborations;
    }

    // Capitalize names
    songData.artist = capitalizeName(songData.artist);
    songData.title = capitalizeName(songData.title);
    songData.album = capitalizeName(songData.album);

    apiPost("/songs/", songData)
      .then(() => {
        window.showNotification("Song added successfully!", "success");
        navigate(
          `/${
            form.status === "In Progress" ? "wip" : form.status.toLowerCase()
          }`
        );
      })
      .catch((err) => window.showNotification(err.message, "error"));
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2.5rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          border: "1px solid #f0f0f0",
        }}
      >
        <h2
          style={{
            margin: "0 0 2rem 0",
            fontSize: "2rem",
            fontWeight: "600",
            color: "#333",
            textAlign: "center",
          }}
        >
          ➕ Add New Song
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#555",
                  fontSize: "0.95rem",
                }}
              >
                Artist *
              </label>
              <input
                name="artist"
                placeholder="e.g., The Beatles"
                value={form.artist}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e1e5e9";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#555",
                  fontSize: "0.95rem",
                }}
              >
                Title *
              </label>
              <input
                name="title"
                placeholder="e.g., Hey Jude"
                value={form.title}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e1e5e9";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#555",
                  fontSize: "0.95rem",
                }}
              >
                Album
              </label>
              <input
                name="album"
                placeholder="e.g., Abbey Road"
                value={form.album}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e1e5e9";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#555",
                  fontSize: "0.95rem",
                }}
              >
                Pack
              </label>
              <input
                name="pack"
                placeholder="e.g., Classic Rock Pack"
                value={form.pack}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "2px solid #e1e5e9",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e1e5e9";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#555",
                fontSize: "0.95rem",
              }}
            >
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "1rem",
                backgroundColor: "#fff",
                transition: "border-color 0.2s, box-shadow 0.2s",
                cursor: "pointer",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#007bff";
                e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e1e5e9";
                e.target.style.boxShadow = "none";
              }}
            >
              <option value="Future Plans">Future Plans</option>
              <option value="In Progress">In Progress</option>
              <option value="Released">Released</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#555",
                fontSize: "0.95rem",
              }}
            >
              Collaborations (Optional)
            </label>
            <UserDropdown
              value={form.collaborations}
              onChange={handleChange}
              placeholder="Select collaborators..."
            />
          </div>

          <button
            type="submit"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              marginTop: "1rem",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 8px 25px rgba(102,126,234,0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            Add Song
          </button>
        </form>
      </div>
    </div>
  );
}

export default NewSongForm;
