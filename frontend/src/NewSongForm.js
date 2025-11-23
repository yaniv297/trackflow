import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost, apiGet } from "./utils/api";
import { checkAndShowNewAchievements } from "./utils/achievements";
import SmartDropdown from "./components/ui/SmartDropdown";
import DLCWarning from "./components/features/dlc/DLCWarning";

// Utility function to capitalize artist and album names
const capitalizeName = (str) =>
  str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

function NewSongForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    artist: "",
    pack: "",
    status: "Future Plans",
    notes: "",
  });
  const [packStatus, setPackStatus] = useState(null);
  const [isLoadingPackStatus, setIsLoadingPackStatus] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePackChange = async (packName) => {
    setForm({ ...form, pack: packName });

    if (packName && packName.trim()) {
      setIsLoadingPackStatus(true);
      try {
        // First, try to get the pack by name to see if it exists
        const packsResponse = await apiGet(
          `/packs/autocomplete?query=${encodeURIComponent(packName)}`
        );
        const existingPack = packsResponse.find(
          (pack) => pack.name === packName
        );

        if (existingPack) {
          // Pack exists, fetch its songs to determine status
          const response = await apiGet(`/songs/?pack_id=${existingPack.id}`);
          if (response && response.length > 0) {
            // Count status occurrences
            const statusCounts = {};
            response.forEach((song) => {
              statusCounts[song.status] = (statusCounts[song.status] || 0) + 1;
            });

            // Get the most common status
            const mostCommonStatus = Object.entries(statusCounts).sort(
              ([, a], [, b]) => b - a
            )[0][0];

            setPackStatus(mostCommonStatus);
            // Update the form status to match the pack
            setForm((prev) => ({ ...prev, status: mostCommonStatus }));
          } else {
            setPackStatus(null);
            setForm((prev) => ({ ...prev, status: "Future Plans" }));
          }
        } else {
          // Pack doesn't exist, it will be created as a new pack
          setPackStatus(null);
          setForm((prev) => ({ ...prev, status: "Future Plans" }));
        }
      } catch (error) {
        console.error("Failed to fetch pack status:", error);
        setPackStatus(null);
        setForm((prev) => ({ ...prev, status: "Future Plans" }));
      } finally {
        setIsLoadingPackStatus(false);
      }
    } else {
      setPackStatus(null);
      setForm((prev) => ({ ...prev, status: "Future Plans" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate that pack exists (if one is selected)
    if (form.pack && form.pack.trim()) {
      // We'll let the backend handle the validation and return an appropriate error
      // The backend will check if the pack exists and return an error if it doesn't
    }

    const songData = { ...form };

    // Capitalize names
    songData.artist = capitalizeName(songData.artist);
    songData.title = capitalizeName(songData.title);

    apiPost("/songs/", songData)
      .then(async () => {
        window.showNotification("Song added successfully!", "success");
        // Check for new achievements
        await checkAndShowNewAchievements();
        navigate(
          `/${
            form.status === "In Progress"
              ? "wip"
              : form.status === "Future Plans"
              ? "future"
              : form.status === "Released"
              ? "released"
              : "future"
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
              <SmartDropdown
                type="artist"
                value={form.artist}
                onChange={(value) => setForm({ ...form, artist: value })}
                placeholder="Select or add artist name"
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
            <SmartDropdown
              type="pack"
              value={form.pack}
              onChange={handlePackChange}
              placeholder="Select existing pack or type new pack name"
            />
            {isLoadingPackStatus && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#666",
                  marginTop: "0.25rem",
                }}
              >
                Loading pack status...
              </div>
            )}
            {packStatus && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#28a745",
                  marginTop: "0.25rem",
                }}
              >
                Pack status: {packStatus}
              </div>
            )}
            {form.pack && !packStatus && !isLoadingPackStatus && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#007bff",
                  marginTop: "0.25rem",
                }}
              >
                New pack will be created
              </div>
            )}
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
              disabled={!!packStatus}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "1rem",
                backgroundColor: packStatus ? "#f8f9fa" : "#fff",
                transition: "border-color 0.2s, box-shadow 0.2s",
                cursor: packStatus ? "not-allowed" : "pointer",
                opacity: packStatus ? 0.7 : 1,
              }}
              onFocus={(e) => {
                if (!packStatus) {
                  e.target.style.borderColor = "#007bff";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,123,255,0.1)";
                }
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
              Progress Notes
            </label>
            <textarea
              name="notes"
              placeholder="Add notes about your progress, where you left off, etc..."
              value={form.notes}
              onChange={handleChange}
              rows="3"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "1rem",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxSizing: "border-box",
                resize: "vertical",
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

          {/* DLC Warning */}
          <DLCWarning title={form.title} artist={form.artist} />

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
