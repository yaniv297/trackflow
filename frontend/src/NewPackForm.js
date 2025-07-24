import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "./config";

// Utility function to capitalize artist and album names
const capitalizeName = (name) => {
  if (!name) return name;
  return name
    .split(" ")
    .map((word) => {
      // Handle special cases like "the", "of", "and", etc.
      const lowerWords = [
        "the",
        "of",
        "and",
        "in",
        "on",
        "at",
        "to",
        "for",
        "with",
        "by",
        "from",
        "up",
        "about",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "between",
        "among",
        "within",
        "without",
        "against",
        "toward",
        "towards",
        "upon",
        "across",
        "behind",
        "beneath",
        "beside",
        "beyond",
        "inside",
        "outside",
        "under",
        "over",
        "along",
        "around",
        "down",
        "off",
        "out",
        "up",
        "away",
        "back",
        "forward",
        "backward",
        "upward",
        "downward",
        "inward",
        "outward",
        "northward",
        "southward",
        "eastward",
        "westward",
        "homeward",
        "heavenward",
        "earthward",
        "seaward",
        "landward",
        "leeward",
        "windward",
        "leftward",
        "rightward",
      ];

      if (lowerWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }

      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

function NewPackForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("artist"); // "artist" or "mixed"
  const [meta, setMeta] = useState({
    pack: "",
    artist: "",
    album: "",
    status: "Future Plans",
    collaborations: "",
    isAlbumSeries: false,
    albumSeriesArtist: "",
    albumSeriesAlbum: "",
  });
  const [entries, setEntries] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ phase: "", current: 0, total: 0 });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!meta.pack || (mode === "artist" && !meta.artist)) {
      window.showNotification("Pack name and artist are required", "warning");
      return;
    }

    if (
      meta.isAlbumSeries &&
      (!meta.albumSeriesArtist || !meta.albumSeriesAlbum)
    ) {
      window.showNotification(
        "Album series artist and name are required when creating an album series",
        "warning"
      );
      return;
    }

    setIsSubmitting(true);

    // Parse collaborations if provided
    let collaborations = [];
    if (meta.collaborations.trim()) {
      collaborations = meta.collaborations.split(",").map((collab) => {
        const author = collab.trim();
        return {
          author: author,
          parts: null,
        };
      });
    }

    let payload;
    if (mode === "artist") {
      // Artist mode: one artist, multiple titles
      const titles = entries
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      payload = titles.map((title) => ({
        title,
        artist: capitalizeName(meta.artist),
        album: capitalizeName(meta.album),
        pack: meta.pack,
        status: meta.status,
        collaborations: collaborations.length > 0 ? collaborations : undefined,
      }));
    } else {
      // Mixed mode: "Artist - Title" format
      payload = entries
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [artist, title] = line.split(/[–-]/).map((x) => x.trim());
          return {
            title: capitalizeName(title || "Unknown Title"),
            artist: capitalizeName(artist || "Unknown Artist"),
            album: capitalizeName(meta.album),
            pack: meta.pack,
            status: meta.status,
            collaborations:
              collaborations.length > 0 ? collaborations : undefined,
          };
        });
    }

    // First, create the songs
    fetch(`${API_BASE_URL}/songs/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || "Failed to add songs");
        }
        return res.json();
      })
      .then(async (createdSongs) => {
        const newIds = createdSongs.map((s) => s.id);

        // If creating an album series, create it now
        if (meta.isAlbumSeries) {
          setProgress({ phase: "Creating album series", current: 1, total: 1 });
          window.showNotification("Creating album series...", "info");

          try {
            const albumSeriesResponse = await fetch(
              `${API_BASE_URL}/album-series/create-from-pack`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  pack_name: meta.pack,
                  artist_name: capitalizeName(meta.albumSeriesArtist),
                  album_name: capitalizeName(meta.albumSeriesAlbum),
                  year: null,
                  cover_image_url: null,
                  description: null,
                }),
              }
            );

            if (!albumSeriesResponse.ok) {
              throw new Error("Failed to create album series");
            }

            const albumSeriesResult = await albumSeriesResponse.json();
            window.showNotification(
              `Album series "${meta.albumSeriesAlbum}" created successfully!`,
              "success"
            );
          } catch (err) {
            console.warn("Failed to create album series:", err);
            window.showNotification(
              "Songs created but failed to create album series. You can create it manually later.",
              "warning"
            );
          }
        }

        // Enhancement phase
        setProgress({
          phase: "Enhancing from Spotify",
          current: 0,
          total: createdSongs.length,
        });
        window.showNotification("Enhancing songs from Spotify...", "info");

        for (let i = 0; i < createdSongs.length; i++) {
          const song = createdSongs[i];
          setProgress({
            phase: "Enhancing from Spotify",
            current: i + 1,
            total: createdSongs.length,
          });

          try {
            const optionsRes = await fetch(
              `${API_BASE_URL}/spotify/${song.id}/spotify-options`
            );
            const options = await optionsRes.json();

            if (options.length > 0) {
              await fetch(`${API_BASE_URL}/spotify/${song.id}/enhance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ track_id: options[0].track_id }),
              });
            }
          } catch (err) {
            console.warn(`Failed to enhance song ${song.id}`, err);
          }
        }

        // Cleanup phase
        setProgress({ phase: "Cleaning remaster tags", current: 1, total: 1 });
        window.showNotification("Cleaning remaster tags...", "info");
        await fetch(`${API_BASE_URL}/tools/bulk-clean`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newIds),
        });

        const successMessage = meta.isAlbumSeries
          ? `${createdSongs.length} song(s) added to album series "${meta.albumSeriesAlbum}", enhanced & cleaned.`
          : `${createdSongs.length} song(s) added to "${meta.pack}", enhanced & cleaned.`;

        window.showNotification(successMessage, "success");
        navigate(
          `/${
            meta.status === "In Progress"
              ? "wip"
              : meta.status === "Released"
              ? "released"
              : "future"
          }`
        );
      })
      .catch((err) => window.showNotification(err.message, "error"))
      .finally(() => {
        setIsSubmitting(false);
        setProgress({ phase: "", current: 0, total: 0 });
      });
  };

  return (
    <div
      style={{
        maxWidth: "800px",
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
          🎛️ Create New Pack
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Mode Selection */}
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
              Pack Type
            </label>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                borderRadius: "8px",
                padding: "0.25rem",
                background: "#f8f9fa",
                border: "2px solid #e1e5e9",
              }}
            >
              <button
                type="button"
                onClick={() => setMode("artist")}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  border: "none",
                  borderRadius: "6px",
                  background: mode === "artist" ? "#007bff" : "transparent",
                  color: mode === "artist" ? "white" : "#666",
                  fontWeight: mode === "artist" ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Single Artist
              </button>
              <button
                type="button"
                onClick={() => setMode("mixed")}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  border: "none",
                  borderRadius: "6px",
                  background: mode === "mixed" ? "#007bff" : "transparent",
                  color: mode === "mixed" ? "white" : "#666",
                  fontWeight: mode === "mixed" ? "600" : "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                Mixed Artists
              </button>
            </div>
          </div>

          {/* Pack Info */}
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
                Pack Name *
              </label>
              <input
                type="text"
                value={meta.pack}
                onChange={(e) => setMeta({ ...meta, pack: e.target.value })}
                placeholder="e.g., Classic Rock Pack"
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

            {mode === "artist" && (
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
                  type="text"
                  value={meta.artist}
                  onChange={(e) => setMeta({ ...meta, artist: e.target.value })}
                  placeholder="e.g., The Beatles"
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
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: mode === "artist" ? "1fr 1fr" : "1fr",
              gap: "1rem",
            }}
          >
            {mode === "artist" && (
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
                  type="text"
                  value={meta.album}
                  onChange={(e) => setMeta({ ...meta, album: e.target.value })}
                  placeholder="e.g., Abbey Road"
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
            )}

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
                value={meta.status}
                onChange={(e) => setMeta({ ...meta, status: e.target.value })}
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
              >
                <option value="Future Plans">Future Plans</option>
                <option value="In Progress">In Progress</option>
                <option value="Released">Released</option>
              </select>
            </div>
          </div>

          {/* Collaborations */}
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
            <input
              value={meta.collaborations}
              onChange={(e) =>
                setMeta({ ...meta, collaborations: e.target.value })
              }
              placeholder="e.g., jphn, EdTanguy"
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
            <small
              style={{
                color: "#666",
                fontSize: "0.85rem",
                marginTop: "0.25rem",
                display: "block",
              }}
            >
              Format: author, author (e.g., jphn, EdTanguy)
            </small>
          </div>

          {/* Album Series Option */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#555",
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={meta.isAlbumSeries}
                onChange={(e) =>
                  setMeta({ ...meta, isAlbumSeries: e.target.checked })
                }
                style={{
                  width: "1.2rem",
                  height: "1.2rem",
                  accentColor: "#007bff",
                }}
              />
              Create as Album Series
            </label>
            <small
              style={{
                color: "#666",
                fontSize: "0.85rem",
                marginTop: "0.25rem",
                display: "block",
              }}
            >
              Check this to create an album series instead of a regular pack
            </small>
          </div>

          {/* Album Series Fields */}
          {meta.isAlbumSeries && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                padding: "1rem",
                background: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e1e5e9",
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
                  Album Series Artist *
                </label>
                <input
                  type="text"
                  value={meta.albumSeriesArtist}
                  onChange={(e) =>
                    setMeta({ ...meta, albumSeriesArtist: e.target.value })
                  }
                  placeholder="e.g., The Beatles"
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
                  Album Series Name *
                </label>
                <input
                  type="text"
                  value={meta.albumSeriesAlbum}
                  onChange={(e) =>
                    setMeta({ ...meta, albumSeriesAlbum: e.target.value })
                  }
                  placeholder="e.g., Abbey Road"
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
          )}

          {/* Song Entries */}
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
              {mode === "artist"
                ? "Song Titles (one per line)"
                : "Songs (Artist - Title format, one per line)"}
            </label>
            <textarea
              value={entries}
              onChange={(e) => setEntries(e.target.value)}
              placeholder={
                mode === "artist"
                  ? "Hey Jude\nLet It Be\nYesterday\nHere Comes the Sun"
                  : "The Beatles - Hey Jude\nPink Floyd - Comfortably Numb\nLed Zeppelin - Stairway to Heaven"
              }
              rows={8}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "2px solid #e1e5e9",
                borderRadius: "8px",
                fontSize: "1rem",
                fontFamily: "inherit",
                resize: "vertical",
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

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting
                ? "#ccc"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              fontWeight: "600",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              marginTop: "1rem",
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 25px rgba(102,126,234,0.3)";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "none";
            }}
          >
            {isSubmitting ? "Creating Pack..." : "Create Pack"}
          </button>

          {/* Progress Bar */}
          {isSubmitting && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e9ecef",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <span style={{ fontWeight: "500", color: "#495057" }}>
                  {progress.phase}
                </span>
                <span style={{ fontSize: "0.9rem", color: "#6c757d" }}>
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "#e9ecef",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${
                      progress.total > 0
                        ? (progress.current / progress.total) * 100
                        : 0
                    }%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #007bff, #0056b3)",
                    borderRadius: "4px",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default NewPackForm;
