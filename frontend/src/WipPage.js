import React, { useEffect, useState, useMemo } from "react";
import WipSongCard from "./components/WipSongCard";

function WipPage() {
  const [songs, setSongs] = useState([]);
  const [newSongData, setNewSongData] = useState({});
  const [addingToPack, setAddingToPack] = useState(null);
  const [collapsedPacks, setCollapsedPacks] = useState({});
  const [showAddForm, setShowAddForm] = useState(null);

  const authoringFields = [
    "demucs",
    "midi",
    "tempo_map",
    "fake_ending",
    "drums",
    "bass",
    "guitar",
    "vocals",
    "harmonies",
    "pro_keys",
    "keys",
    "animations",
    "drum_fills",
    "overdrive",
    "compile",
  ];

  useEffect(() => {
    fetch("http://localhost:8001/songs?status=In%20Progress")
      .then((res) => res.json())
      .then((data) => {
        setSongs(data);
        // Collapse all packs by default after loading songs
        const packs = Array.from(
          new Set(data.map((s) => s.pack || "(no pack)"))
        );
        const collapsed = {};
        packs.forEach((p) => {
          collapsed[p] = true;
        });
        setCollapsedPacks(collapsed);
      });
  }, []);

  const grouped = useMemo(() => {
    const getFilledCount = (song) =>
      authoringFields.filter((f) => song.authoring?.[f]).length;

    const groups = {};
    for (const song of songs) {
      const key = song.pack || "(no pack)";
      if (!groups[key]) groups[key] = [];
      const filledCount = getFilledCount(song);
      groups[key].push({ ...song, filledCount });
    }

    // Calculate completion percent for each pack (core songs only)
    const packStats = Object.entries(groups).map(([pack, songs]) => {
      const coreSongs = songs.filter((s) => !s.optional);
      const totalParts = coreSongs.length * authoringFields.length;
      const filledParts = coreSongs.reduce(
        (acc, song) =>
          acc + authoringFields.filter((f) => song.authoring?.[f]).length,
        0
      );
      const percent =
        totalParts > 0 ? Math.round((filledParts / totalParts) * 100) : 0;
      return { pack, percent, coreSongs, allSongs: songs };
    });

    // Sort packs from closest to completion to farthest
    packStats.sort((a, b) => b.percent - a.percent);

    // Return as an array for rendering
    return packStats;
  }, [songs]);

  const releasePack = (pack) => {
    fetch(
      `http://localhost:8001/songs/release-pack?pack=${encodeURIComponent(
        pack
      )}`,
      {
        method: "POST",
      }
    )
      .then((res) => res.json())
      .then(() => {
        setSongs((prev) => prev.filter((s) => s.pack !== pack));
      });
  };

  const togglePack = (packName) => {
    setCollapsedPacks((prev) => ({
      ...prev,
      [packName]: !prev[packName],
    }));
  };

  const toggleAll = () => {
    const allCollapsed = grouped.every(({ pack }) => collapsedPacks[pack]);
    const newState = {};
    for (const p in grouped) newState[p] = !allCollapsed;
    setCollapsedPacks(newState);
  };

  const bulkEnhancePack = async (songs) => {
    for (const song of songs) {
      try {
        const res = await fetch(
          `http://localhost:8001/spotify/${song.id}/spotify-options`
        );
        const options = await res.json();
        const firstOption = options[0];
        if (!firstOption) continue;

        await fetch(`http://localhost:8001/spotify/${song.id}/enhance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ track_id: firstOption.track_id }),
        });
      } catch (err) {
        console.error(`Error enhancing ${song.title}:`, err);
      }
    }

    window.showNotification(
      "All songs in this pack have been enhanced!",
      "success"
    );
  };

  const handleDeleteSong = (songId) => {
    if (!window.confirm("Delete this song?")) return;

    fetch(`http://localhost:8001/songs/${songId}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete");
        setSongs((prev) => prev.filter((s) => s.id !== songId));
        window.showNotification("Song deleted successfully", "success");
      })
      .catch((err) => window.showNotification(err.message, "error"));
  };

  const updateAuthoringField = (songId, field, value) => {
    setSongs((prev) =>
      prev.map((song) =>
        song.id === songId
          ? { ...song, authoring: { ...song.authoring, [field]: value } }
          : song
      )
    );
  };

  const toggleOptional = (songId, isCurrentlyOptional) => {
    fetch(`http://localhost:8001/songs/${songId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optional: !isCurrentlyOptional }),
    })
      .then((res) => res.json())
      .then((updated) =>
        setSongs((prev) =>
          prev.map((s) => (s.id === songId ? { ...s, ...updated } : s))
        )
      )
      .catch((err) =>
        window.showNotification("Failed to update optional status", "error")
      );
  };

  const addSongToPack = async (packName, songData) => {
    const payload = {
      ...songData,
      pack: packName,
      status: "In Progress",
    };

    try {
      const response = await fetch("http://localhost:8001/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to add song");
      const newSong = await response.json();

      // Automatically enhance from Spotify (top match)
      let enhancedSong = newSong;
      try {
        const optionsRes = await fetch(
          `http://localhost:8001/spotify/${newSong.id}/spotify-options`
        );
        const options = await optionsRes.json();
        if (Array.isArray(options) && options.length > 0) {
          await fetch(`http://localhost:8001/spotify/${newSong.id}/enhance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ track_id: options[0].track_id }),
          });

          // Clean remaster tags
          await fetch("http://localhost:8001/tools/bulk-clean", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([newSong.id]),
          });

          // Fetch the updated song
          const updatedRes = await fetch(
            `http://localhost:8001/songs?status=In%20Progress`
          );
          const allSongs = await updatedRes.json();
          const found = allSongs.find((s) => s.id === newSong.id);
          if (found) enhancedSong = found;
          window.showNotification(
            "✅ Song enhanced from Spotify and cleaned!",
            "success"
          );
        } else {
          window.showNotification(
            "No Spotify match found for this song.",
            "warning"
          );
        }
      } catch (err) {
        window.showNotification("Failed to enhance from Spotify.", "error");
      }

      setSongs((prev) => [...prev, enhancedSong]);
      setShowAddForm(null);
      setNewSongData({});
    } catch (error) {
      window.showNotification(error.message, "error");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🧪 WIP Packs</h2>

      <button
        onClick={toggleAll}
        style={{
          marginBottom: "1.5rem",
          backgroundColor: "#eee",
          border: "1px solid #ccc",
          padding: "0.5rem 1rem",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        {grouped.every(({ pack }) => collapsedPacks[pack])
          ? "🔽 Expand All"
          : "🔼 Collapse All"}
      </button>

      {grouped.map(({ pack: packName, percent, coreSongs, allSongs }) => {
        // Sort core and optional songs by completion (filledCount) descending
        const sortedCoreSongs = coreSongs
          .slice()
          .sort((a, b) => b.filledCount - a.filledCount);
        const optionalSongs = allSongs
          .filter((s) => s.optional)
          .sort((a, b) => b.filledCount - a.filledCount);
        // Only count core songs for header
        const mainSongs = sortedCoreSongs;
        const totalSongs = mainSongs.length;
        const totalParts = totalSongs * authoringFields.length;
        const filledParts = mainSongs.reduce(
          (acc, song) =>
            acc + authoringFields.filter((f) => song.authoring?.[f]).length,
          0
        );
        // const percent = totalParts > 0 ? Math.round((filledParts / totalParts) * 100) : 0;

        // Before rendering the pack header, find the most common artist and their image URL
        const artistCounts = {};
        allSongs.forEach((song) => {
          if (!song.artist) return;
          artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
        });
        const mostCommonArtist = Object.entries(artistCounts).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0];
        const artistImageUrl = allSongs.find(
          (s) => s.artist === mostCommonArtist
        )?.artist_image_url;

        return (
          <div
            key={packName}
            style={{
              marginBottom: "2rem",
              borderBottom: "1px solid #ccc",
              paddingBottom: "1rem",
            }}
          >
            <h3
              style={{
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              {artistImageUrl && (
                <img
                  src={artistImageUrl}
                  alt={mostCommonArtist}
                  style={{
                    width: 54,
                    height: 54,
                    objectFit: "cover",
                    borderRadius: "50%",
                    marginRight: 16,
                    boxShadow: "0 1px 6px rgba(0,0,0,0.13)",
                  }}
                />
              )}
              <button
                onClick={() => togglePack(packName)}
                style={{
                  background: "none",
                  border: "none",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  padding: 0,
                  marginRight: "0.5rem",
                }}
              >
                {collapsedPacks[packName] ? "▶" : "▼"}
              </button>
              {packName} ({totalSongs} song{totalSongs !== 1 ? "s" : ""})
              {/* Progress bar and percent always visible in header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  minWidth: 120,
                }}
              >
                <div
                  style={{
                    background: "#ddd",
                    height: 10,
                    borderRadius: 5,
                    overflow: "hidden",
                    width: 80,
                  }}
                >
                  <div
                    style={{
                      background: percent === 100 ? "#4caf50" : "#3498db",
                      width: `${percent}%`,
                      height: "100%",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "0.95em",
                    color: percent === 100 ? "#4caf50" : "#3498db",
                    fontWeight: 600,
                  }}
                >
                  {percent}%
                </span>
              </div>
              {/* Add Song Button */}
              <button
                onClick={() =>
                  setShowAddForm(showAddForm === packName ? null : packName)
                }
                style={{
                  background: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "24px",
                  height: "24px",
                  fontSize: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: "auto",
                }}
                title="Add song to this pack"
              >
                +
              </button>
            </h3>

            {/* Add Song Form */}
            {showAddForm === packName && (
              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1rem",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  border: "1px solid #dee2e6",
                }}
              >
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
                  Add Song to "{packName}"
                </h4>
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <input
                    type="text"
                    placeholder="Artist"
                    value={newSongData.artist || ""}
                    onChange={(e) =>
                      setNewSongData((prev) => ({
                        ...prev,
                        artist: e.target.value,
                      }))
                    }
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      flex: "1",
                      minWidth: "120px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Title"
                    value={newSongData.title || ""}
                    onChange={(e) =>
                      setNewSongData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      flex: "1",
                      minWidth: "120px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Album (optional)"
                    value={newSongData.album || ""}
                    onChange={(e) =>
                      setNewSongData((prev) => ({
                        ...prev,
                        album: e.target.value,
                      }))
                    }
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      flex: "1",
                      minWidth: "120px",
                    }}
                  />
                  <label style={{ marginRight: "0.5rem", fontSize: "0.95em" }}>
                    <input
                      type="checkbox"
                      checked={!!newSongData.optional}
                      onChange={(e) =>
                        setNewSongData((prev) => ({
                          ...prev,
                          optional: e.target.checked,
                        }))
                      }
                      style={{ marginRight: "0.3em" }}
                    />
                    Optional
                  </label>
                  <button
                    onClick={() => addSongToPack(packName, newSongData)}
                    disabled={!newSongData.artist || !newSongData.title}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(null);
                      setNewSongData({});
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#6c757d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!collapsedPacks[packName] && (
              <>
                {/* Core Songs */}
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {sortedCoreSongs.map((song) => {
                    const isComplete = authoringFields.every(
                      (f) => song.authoring?.[f]
                    );
                    return (
                      <WipSongCard
                        key={song.id}
                        song={song}
                        onAuthoringUpdate={updateAuthoringField}
                        onDelete={handleDeleteSong}
                        onToggleOptional={() =>
                          toggleOptional(song.id, song.optional)
                        }
                        defaultExpanded={!isComplete}
                      />
                    );
                  })}
                </ul>

                {/* Optional Songs */}
                {optionalSongs.length > 0 && (
                  <>
                    <div
                      style={{
                        fontStyle: "italic",
                        color: "#888",
                        marginTop: "1rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Optional songs
                    </div>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {optionalSongs.map((song) => {
                        const isComplete = authoringFields.every(
                          (f) => song.authoring?.[f]
                        );
                        return (
                          <WipSongCard
                            key={song.id}
                            song={song}
                            onAuthoringUpdate={updateAuthoringField}
                            onDelete={handleDeleteSong}
                            onToggleOptional={() =>
                              toggleOptional(song.id, song.optional)
                            }
                            defaultExpanded={!isComplete}
                          />
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WipPage;
