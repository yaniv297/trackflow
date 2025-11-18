import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "./config";
import SmartDropdown from "./components/SmartDropdown";
import { apiPost, apiGet } from "./utils/api";
import MultipleDLCCheck from "./components/MultipleDLCCheck";
import AlbumSeriesEditModal from "./components/AlbumSeriesEditModal";
import { checkAndShowNewAchievements } from "./utils/achievements";

// Utility function to capitalize artist and album names
const capitalizeName = (name) => {
  if (!name) return name;
  const words = name.split(" ");

  return words
    .map((word, index) => {
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

      // Only lowercase these words if they're NOT the first word
      if (index > 0 && lowerWords.includes(word.toLowerCase())) {
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
    status: "Future Plans",
    isAlbumSeries: false,
    albumSeriesArtist: "",
    albumSeriesAlbum: "",
    openEditorAfterCreate: false,
  });
  const [creationMode, setCreationMode] = useState("manual"); // 'manual' | 'wizard'
  const [entries, setEntries] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState({ phase: "", current: 0, total: 0 });

  // Modal state for album series editor
  const [editSeriesModal, setEditSeriesModal] = useState({
    open: false,
    packId: null,
    series: [],
    defaultSeriesId: null,
    createMode: false,
    createData: null,
  });

  // Event listener for opening the album series modal
  useEffect(() => {
    const createHandler = (e) => {
      console.log(
        "Received open-create-album-series-modal event in NewPackForm",
        e.detail
      );
      const { artistName, albumName, status } = e.detail || {};

      setEditSeriesModal({
        open: true,
        packId: null,
        series: [],
        defaultSeriesId: null,
        createMode: true,
        createData: { artistName, albumName, status },
      });
    };

    window.addEventListener("open-create-album-series-modal", createHandler);

    return () => {
      window.removeEventListener(
        "open-create-album-series-modal",
        createHandler
      );
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const willCreateSeries = meta.isAlbumSeries;
    const effectivePack =
      meta.pack ||
      (willCreateSeries && meta.albumSeriesAlbum
        ? `${capitalizeName(meta.albumSeriesAlbum)} Album Series`
        : "");
    const effectiveArtist =
      mode === "artist"
        ? meta.artist ||
          (willCreateSeries ? capitalizeName(meta.albumSeriesArtist) : "")
        : "";
    if (!effectivePack || (mode === "artist" && !effectiveArtist)) {
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

    // Check if there are any songs to create
    const songLines = entries
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (songLines.length === 0) {
      window.showNotification(
        "Please add at least one song to create a pack",
        "warning"
      );
      return;
    }

    setIsSubmitting(true);

    let payload;
    if (mode === "artist") {
      // Artist mode: one artist, multiple titles
      const titles = entries
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      payload = titles.map((title) => ({
        title,
        artist: capitalizeName(effectiveArtist),
        pack_name: effectivePack,
        status: meta.status,
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
            pack_name: effectivePack,
            status: meta.status,
          };
        });
    }

    // First, create the songs (Manual mode requires input; Wizard still permits adding more via editor)
    apiPost("/songs/batch", payload)
      .then(async (createdSongs) => {
        const newIds = createdSongs.map((s) => s.id);

        // If creating an album series, create it now
        if (meta.isAlbumSeries) {
          setProgress({ phase: "Creating album series", current: 1, total: 1 });
          window.showNotification("Creating album series...", "info");

          try {
            const res = await fetch(
              `${API_BASE_URL}/album-series/create-from-pack`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  pack_name: effectivePack,
                  artist_name: capitalizeName(meta.albumSeriesArtist),
                  album_name: capitalizeName(meta.albumSeriesAlbum),
                  year: null,
                  cover_image_url: null,
                  description: null,
                }),
              }
            );

            if (!res.ok) {
              throw new Error("Failed to create album series");
            }

            const createdSeries = await res.json();
            window.showNotification(
              `Album series "${meta.albumSeriesAlbum}" created successfully!`,
              "success"
            );

            // If user opted in or wizard mode, schedule the Edit modal to open on WIP page
            if (
              (meta.openEditorAfterCreate || creationMode === "wizard") &&
              createdSeries &&
              createdSeries.id
            ) {
              try {
                // Find pack_id from created songs
                const packId = createdSongs[0]?.pack_id;
                if (packId) {
                  const payload = {
                    packName: effectivePack,
                    packId,
                    series: [
                      {
                        id: createdSeries.id,
                        number: createdSeries.series_number,
                        name: createdSeries.album_name,
                      },
                    ],
                  };
                  localStorage.setItem(
                    "tf_open_edit_series",
                    JSON.stringify(payload)
                  );
                }
              } catch (_e) {}
            }
          } catch (err) {
            console.warn("Failed to create album series:", err);
            window.showNotification(
              "Songs created but failed to create album series. You can create it manually later.",
              "warning"
            );
          }
        }

        // Enhancement phase - check user settings first
        let shouldAutoEnhance = true;
        try {
          const userSettings = await apiGet("/user-settings/me");
          // Explicitly check for true/1, default to true if undefined/null
          shouldAutoEnhance = userSettings.auto_spotify_fetch_enabled === true || 
                              userSettings.auto_spotify_fetch_enabled === 1 ||
                              userSettings.auto_spotify_fetch_enabled === undefined ||
                              userSettings.auto_spotify_fetch_enabled === null;
          console.log("Auto-enhance setting:", userSettings.auto_spotify_fetch_enabled, "-> shouldAutoEnhance:", shouldAutoEnhance);
        } catch (err) {
          console.warn("Failed to fetch user settings, defaulting to auto-enhance:", err);
          // Default to true if we can't fetch settings
        }

        if (shouldAutoEnhance) {
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
                `${API_BASE_URL}/spotify/${song.id}/spotify-options/`
              );
              if (!optionsRes.ok) {
                throw new Error(
                  `Failed to fetch Spotify options for song ${song.id}: ${optionsRes.status}`
                );
              }
              const options = await optionsRes.json();

              if (options.length > 0) {
                const enhanceRes = await fetch(
                  `${API_BASE_URL}/spotify/${song.id}/enhance/`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ track_id: options[0].track_id }),
                  }
                );
                if (!enhanceRes.ok) {
                  throw new Error(
                    `Failed to enhance song ${song.id}: ${enhanceRes.status}`
                  );
                }
              }
            } catch (err) {
              console.warn(`Failed to enhance song ${song.id}`, err);
              // Don't fail the entire process for enhancement errors
            }
          }
        }

        // Cleanup phase
        setProgress({ phase: "Cleaning remaster tags", current: 1, total: 1 });
        window.showNotification("Cleaning remaster tags...", "info");
        try {
          const cleanupRes = await fetch(`${API_BASE_URL}/tools/bulk-clean`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newIds),
          });
          if (!cleanupRes.ok) {
            throw new Error(
              `Failed to clean remaster tags: ${cleanupRes.status}`
            );
          }
        } catch (err) {
          console.warn("Failed to clean remaster tags", err);
          // Don't fail the entire process for cleanup errors
        }

        // Build success message based on what actually happened
        const enhancementText = shouldAutoEnhance ? "enhanced & " : "";
        const successMessage = meta.isAlbumSeries
          ? `${createdSongs.length} song(s) added to album series "${meta.albumSeriesAlbum}", ${enhancementText}cleaned.`
          : `${createdSongs.length} song(s) added to "${effectivePack}", ${enhancementText}cleaned.`;

        window.showNotification(successMessage, "success");
        
        // Check for new achievements
        await checkAndShowNewAchievements();
        
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
      .catch((err) => {
        console.error("Pack creation error:", err);

        // Enhanced error handling with specific messages
        let errorMessage = "Failed to create pack";

        if (err.message) {
          const message = err.message.toLowerCase();

          // Check for specific error cases
          if (message.includes("album series already exists")) {
            errorMessage = `Album series "${meta.albumSeriesAlbum}" by ${meta.albumSeriesArtist} already exists. Please use a different name or artist.`;
          } else if (message.includes("some songs could not be created")) {
            // This is a song duplication error, show the actual backend message
            errorMessage = err.message;
          } else if (
            message.includes("already exists") ||
            message.includes("duplicate")
          ) {
            // Generic duplication error, show the backend message
            errorMessage = err.message;
          } else if (message.includes("not found") || message.includes("404")) {
            errorMessage =
              "One or more songs could not be found. Please check the song titles and try again.";
          } else if (
            message.includes("unauthorized") ||
            message.includes("401")
          ) {
            errorMessage =
              "You are not authorized to create packs. Please log in again.";
          } else if (message.includes("forbidden") || message.includes("403")) {
            errorMessage = "You don't have permission to create this pack.";
          } else if (
            message.includes("validation") ||
            message.includes("invalid")
          ) {
            errorMessage =
              "Invalid data provided. Please check your input and try again.";
          } else if (
            message.includes("spotify") ||
            message.includes("spotify")
          ) {
            errorMessage =
              "Failed to fetch data from Spotify. Please check your internet connection and try again.";
          } else if (
            message.includes("timeout") ||
            message.includes("network")
          ) {
            errorMessage =
              "Request timed out. Please check your internet connection and try again.";
          } else {
            // Use the original error message if no specific case matches
            errorMessage = err.message;
          }
        }

        window.showNotification(errorMessage, "error");
      })
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

          {/* Album Series Option (only in Single Artist mode) */}
          {mode === "artist" && (
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
              {meta.isAlbumSeries && (
                <>
                  {/* Manual/Wizard selector */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      margin: "0.5rem 0 0.75rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCreationMode("manual")}
                      style={{
                        border: "1px solid #ccc",
                        background:
                          creationMode === "manual" ? "#eef5ff" : "#fff",
                        color: "#333",
                        borderRadius: 6,
                        padding: "0.35rem 0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Manual (list)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationMode("wizard")}
                      style={{
                        border: "1px solid #ccc",
                        background:
                          creationMode === "wizard" ? "#eef5ff" : "#fff",
                        color: "#333",
                        borderRadius: 6,
                        padding: "0.35rem 0.75rem",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Use Editor
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pack Info */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display:
                  meta.isAlbumSeries && mode === "artist" ? "none" : "block",
              }}
            >
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

            {mode === "artist" && !meta.isAlbumSeries && (
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
                  value={meta.artist}
                  onChange={(value) => setMeta({ ...meta, artist: value })}
                  placeholder="Select or add artist name"
                />
              </div>
            )}
          </div>

          {/* Status stays the same */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: mode === "artist" ? "1fr 1fr" : "1fr",
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

          {/* Album Series Fields (replacement when isAlbumSeries) */}
          {mode === "artist" && meta.isAlbumSeries && (
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
                <SmartDropdown
                  type="artist"
                  value={meta.albumSeriesArtist}
                  onChange={(value) =>
                    setMeta({ ...meta, albumSeriesArtist: value })
                  }
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

          {/* Song Entries (hidden in Wizard mode) */}
          {!(meta.isAlbumSeries && creationMode === "wizard") && (
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
          )}

          {/* DLC Check for multiple songs */}
          {!(meta.isAlbumSeries && creationMode === "wizard") && entries && (
            <MultipleDLCCheck
              songsText={entries}
              mode={mode}
              artistName={mode === "artist" ? meta.artist : null}
            />
          )}

          {meta.isAlbumSeries && creationMode === "wizard" ? (
            <button
              type="button"
              onClick={() => {
                // Open the editor directly without creating anything
                // console.log("Button clicked!");
                // console.log("Form data:", {
                //   artistName: meta.albumSeriesArtist,
                //   albumName: meta.albumSeriesAlbum,
                //   status: meta.status,
                //   isAlbumSeries: meta.isAlbumSeries,
                //   creationMode: creationMode,
                // });

                if (!meta.albumSeriesArtist || !meta.albumSeriesAlbum) {
                  window.showNotification(
                    "Please fill in both Artist and Album fields",
                    "warning"
                  );
                  return;
                }

                const event = new CustomEvent("open-create-album-series", {
                  detail: {
                    artistName: meta.albumSeriesArtist,
                    albumName: meta.albumSeriesAlbum,
                    status: meta.status,
                    skipNavigation: true, // Add flag to skip navigation
                  },
                });
                // console.log("Dispatching event:", event);
                window.dispatchEvent(event);
              }}
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
              Open Editor
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                isSubmitting ||
                entries
                  .trim()
                  .split("\n")
                  .filter((line) => line.trim().length > 0).length === 0
              }
              style={{
                background:
                  isSubmitting ||
                  entries
                    .trim()
                    .split("\n")
                    .filter((line) => line.trim().length > 0).length === 0
                    ? "#ccc"
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "1rem 2rem",
                fontSize: "1.1rem",
                fontWeight: "600",
                cursor:
                  isSubmitting ||
                  entries
                    .trim()
                    .split("\n")
                    .filter((line) => line.trim().length > 0).length === 0
                    ? "not-allowed"
                    : "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                marginTop: "1rem",
                opacity:
                  isSubmitting ||
                  entries
                    .trim()
                    .split("\n")
                    .filter((line) => line.trim().length > 0).length === 0
                    ? 0.7
                    : 1,
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
          )}

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

      {/* Edit Album Series Modal */}
      <AlbumSeriesEditModal
        key={`${editSeriesModal.defaultSeriesId}-${editSeriesModal.packId}`}
        isOpen={editSeriesModal.open}
        onClose={() =>
          setEditSeriesModal({
            open: false,
            packId: null,
            series: [],
            defaultSeriesId: null,
            createMode: false,
            createData: null,
          })
        }
        packId={editSeriesModal.packId}
        seriesList={editSeriesModal.series}
        defaultSeriesId={editSeriesModal.defaultSeriesId}
        createMode={editSeriesModal.createMode || false}
        createData={editSeriesModal.createData || null}
        onChanged={() => {
          // Refresh the form or show success message
          window.showNotification(
            "Album series updated successfully!",
            "success"
          );
        }}
      />
    </div>
  );
}

export default NewPackForm;
