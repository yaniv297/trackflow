import React, { useState, useEffect, useRef } from "react";
import SongRow from "./components/SongRow";

function SongPage({ status }) {
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState({}); // { [songId_field]: true }
  const [editValues, setEditValues] = useState({});
  const [spotifyOptions, setSpotifyOptions] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupBy, setGroupBy] = useState("artist");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState({
    artist: "",
    album: "",
    pack: "",
    year: "",
    status: "",
  });

  const statusOptions = [
    { label: "Future Plans", value: "Future Plans" },
    { label: "In Progress", value: "In Progress" },
    { label: "Released", value: "Released" },
  ];

  const handleSort = (key) => {
    if (sortKey === key) {
      // Toggle direction if clicking the same column
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedSongs = [...songs].sort((a, b) => {
    if (!sortKey) return 0;

    const aVal = a[sortKey];
    const bVal = b[sortKey];

    let comparison = 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal;
    } else {
      comparison = (aVal || "")
        .toString()
        .localeCompare((bVal || "").toString());
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  let groupedSongs;

  if (groupBy === "artist") {
    const groupedByArtist = sortedSongs.reduce((acc, song) => {
      const artist = song.artist || "Unknown Artist";
      const album = song.album || "Unknown Album";

      if (!acc[artist]) acc[artist] = {};
      if (!acc[artist][album]) acc[artist][album] = [];

      acc[artist][album].push(song);
      return acc;
    }, {});

    groupedSongs = Object.fromEntries(
      Object.entries(groupedByArtist)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([artist, albums]) => [
          artist,
          Object.fromEntries(
            Object.entries(albums).sort(([a], [b]) => a.localeCompare(b))
          ),
        ])
    );
  } else {
    // groupBy === "pack"
    const groupedByPack = sortedSongs.reduce((acc, song) => {
      const pack = song.pack || "N/A";
      if (!acc[pack]) acc[pack] = [];
      acc[pack].push(song);
      return acc;
    }, {});

    groupedSongs = Object.fromEntries(
      Object.entries(groupedByPack).sort(([a], [b]) => a.localeCompare(b))
    );
  }

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allCollapsed = Object.keys(groupedSongs || {})
    .map((key) => (groupBy === "pack" ? `pack:${key}` : key))
    .every((k) => collapsedGroups[k]);

  const toggleAllGroups = () => {
    const groupKeys = Object.keys(groupedSongs).map((key) =>
      groupBy === "pack" ? `pack:${key}` : key
    );

    const newState = {};
    groupKeys.forEach((key) => {
      newState[key] = !allCollapsed;
    });

    setCollapsedGroups(newState);
  };

  const handleStartWork = async () => {
    if (!selectedSongs.length) return;

    const confirm = window.confirm(
      `Move ${selectedSongs.length} song(s) to WIP?`
    );
    if (!confirm) return;

    try {
      await Promise.all(
        selectedSongs.map((id) =>
          fetch(`http://localhost:8001/songs/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "wip" }),
          })
        )
      );

      // Remove them from local state (since this is Future Plans view)
      setSongs((prev) => prev.filter((s) => !selectedSongs.includes(s.id)));
      setSelectedSongs([]);
      window.showNotification("✅ Moved to WIP!", "success");
    } catch (err) {
      console.error("❌ Failed to start work", err);
      window.showNotification("Something went wrong.", "error");
    }
  };

  const fetchSpotifyOptions = (song) => {
    setLoadingId(song.id);
    fetch(`http://localhost:8001/spotify/${song.id}/spotify-options`)
      .then((res) => {
        if (!res.ok) throw new Error("Spotify search failed");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data))
          throw new Error("Unexpected Spotify response");
        setSpotifyOptions((prev) => ({ ...prev, [song.id]: data }));
      })
      .catch((err) => {
        alert(err.message);
        setSpotifyOptions((prev) => ({ ...prev, [song.id]: [] })); // set to empty array to avoid .map crash
      })
      .finally(() => setLoadingId(null));
  };

  const applySpotifyEnhancement = (songId, trackId) => {
    fetch(`http://localhost:8001/spotify/${songId}/enhance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track_id: trackId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Enhancement failed");
        return res.json();
      })
      .then((updated) => {
        setSongs((prev) => prev.map((s) => (s.id === songId ? updated : s)));
        setSpotifyOptions((prev) => ({ ...prev, [songId]: undefined }));
      })
      .catch((err) => alert(err.message));
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this song?")) return;

    fetch(`http://localhost:8001/songs/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete");
        setSongs(songs.filter((s) => s.id !== id));
        window.showNotification("Song deleted successfully", "success");
      })
      .catch((err) => window.showNotification(err.message, "error"));
  };

  const saveEdit = (id, field) => {
    const value = editValues[`${id}_${field}`];
    if (field === "year" && value && !/^\d{4}$/.test(value)) {
      alert("Please enter a valid 4-digit year.");
      return;
    }
    setEditing((prev) => ({ ...prev, [`${id}_${field}`]: false }));

    fetch(`http://localhost:8001/songs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
      .then((res) => res.json())
      .then((updated) => {
        setSongs((prev) =>
          prev.map((s) => (s.id === id ? { ...s, [field]: updated[field] } : s))
        );
      })
      .catch((err) => window.showNotification("Update failed", "error"));
  };

  const handleCleanTitles = () => {
    if (selectedSongs.length === 0) {
      window.showNotification("Select at least one song to clean.", "warning");
      return;
    }

    fetch("http://localhost:8001/tools/bulk-clean", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedSongs),
    })
      .then(() => {
        window.showNotification("Bulk clean completed!", "success");
        setSelectedSongs([]);
      })
      .catch((err) => window.showNotification("Bulk clean failed", "error"));
  };

  const handleMakePack = async () => {
    if (!selectedSongs.length) {
      window.showNotification(
        "Select at least one song to create a pack.",
        "warning"
      );
      return;
    }

    const packName = window.prompt("Enter name for the new pack:");
    if (!packName) return;

    try {
      console.log("👉 Assigning songs to pack:", packName);

      // Step 1: Assign pack name
      await Promise.all(
        selectedSongs.map((id) =>
          fetch(`http://localhost:8001/songs/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pack: packName }),
          }).then((res) => res.json())
        )
      );

      console.log(
        "✅ Pack assignment complete. Running Spotify enhancement..."
      );

      // Step 2: Spotify enhancement
      for (const id of selectedSongs) {
        try {
          const optRes = await fetch(
            `http://localhost:8001/spotify/${id}/spotify-options`
          );
          const options = await optRes.json();

          if (Array.isArray(options) && options.length > 0) {
            const top = options[0];
            await fetch(`http://localhost:8001/spotify/${id}/enhance`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ track_id: top.track_id }),
            });
            console.log(
              `🎧 Enhanced song ${id} with Spotify match: ${top.title}`
            );
          } else {
            console.warn(`⚠️ No Spotify options for song ${id}`);
          }
        } catch (e) {
          console.error(`❌ Failed Spotify enhancement for song ${id}`, e);
        }
      }

      console.log("✅ Spotify enhancement done. Running cleanup...");

      // Step 3: Cleanup after enhancement
      await fetch("http://localhost:8001/tools/bulk-clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSongs),
      });

      console.log("🧹 Cleanup done");

      // Final step: Update UI
      setSongs((prev) =>
        prev.map((s) =>
          selectedSongs.includes(s.id) ? { ...s, pack: packName } : s
        )
      );
      setSelectedSongs([]);
      window.showNotification(
        `✅ ${selectedSongs.length} song(s) added to "${packName}", enhanced & cleaned.`,
        "success"
      );
    } catch (err) {
      console.error("❌ Pack creation failed:", err);
      window.showNotification(
        "Something went wrong while making the pack.",
        "error"
      );
    }
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selectedSongs.length} selected song(s)?`))
      return;

    fetch("http://localhost:8001/songs/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedSongs),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(`Deleted ${data.deleted} songs`);
        setSongs((prev) => prev.filter((s) => !selectedSongs.includes(s.id)));
        setSelectedSongs([]);
        window.showNotification("Songs deleted successfully", "success");
      })
      .catch((err) => window.showNotification("Bulk delete failed", "error"));
  };

  const handleBulkEnhance = async () => {
    if (!selectedSongs.length) {
      alert("Select at least one song.");
      return;
    }

    const confirm = window.confirm(
      `Enhance ${selectedSongs.length} songs with the first Spotify match?`
    );
    if (!confirm) return;

    for (const songId of selectedSongs) {
      try {
        const res = await fetch(
          `http://localhost:8001/spotify/${songId}/spotify-options`
        );
        const options = await res.json();

        if (Array.isArray(options) && options.length > 0) {
          const topMatch = options[0];
          await fetch(`http://localhost:8001/spotify/${songId}/enhance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ track_id: topMatch.track_id }),
          });
          console.log(`✅ Enhanced ${songId} with ${topMatch.title}`);
        } else {
          console.warn(`❌ No options found for song ${songId}`);
        }
      } catch (err) {
        console.error(`Failed for ${songId}`, err);
      }
    }

    window.showNotification(
      "🎉 Bulk enhancement complete. Reload to see changes.",
      "success"
    );
  };

  const bulkEditOptions = [
    {
      label: "Artist",
      value: "artist",
      type: "text",
      placeholder: "New artist name",
    },
    {
      label: "Album",
      value: "album",
      type: "text",
      placeholder: "New album name",
    },
    {
      label: "Pack",
      value: "pack",
      type: "text",
      placeholder: "New pack name",
    },
    { label: "Year", value: "year", type: "number", placeholder: "New year" },
    {
      label: "Status",
      value: "status",
      type: "select",
      placeholder: "New status",
    },
  ];
  const [bulkEditField, setBulkEditField] = useState("");
  const [bulkEditValue, setBulkEditValue] = useState("");
  const handleBulkEditApply = async () => {
    if (!bulkEditField || !bulkEditValue) {
      window.showNotification(
        "Please select a field and enter a value.",
        "warning"
      );
      return;
    }
    let failed = 0;
    for (const id of selectedSongs) {
      const updates = {};
      updates[bulkEditField] =
        bulkEditField === "year" ? Number(bulkEditValue) : bulkEditValue;
      try {
        const res = await fetch(`http://localhost:8001/songs/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
    }
    setShowBulkModal(false);
    setBulkEditField("");
    setBulkEditValue("");
    if (failed === 0) {
      window.showNotification(
        `Bulk updated ${selectedSongs.length} song(s).`,
        "success"
      );
    } else {
      window.showNotification(`Failed to update ${failed} song(s).`, "error");
    }
    // Optionally, refresh songs
    let url = `http://localhost:8001/songs?`;
    if (status) url += `status=${encodeURIComponent(status)}&`;
    if (search) url += `query=${encodeURIComponent(search)}&`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setSongs(data));
  };

  const selectAllRef = useRef();

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedSongs.length > 0 && selectedSongs.length < songs.length;
    }
  }, [selectedSongs, songs]);

  useEffect(() => {
    const handler = setTimeout(() => {
      let url = `http://localhost:8001/songs?`;
      if (status) url += `status=${encodeURIComponent(status)}&`;
      if (search) url += `query=${encodeURIComponent(search)}&`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => setSongs(data))
        .catch((err) => console.error("Failed to fetch songs:", err));
    }, 250); // 250ms debounce
    return () => clearTimeout(handler);
  }, [status, search]);

  return (
    <>
      <h2>{status || "All Songs"}</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search title, artist, or album..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            fontSize: "1rem",
            border: "1px solid #ccc",
            borderRadius: "999px",
            minWidth: "260px",
            flex: "1 1 auto",
          }}
        />

        {/* Toggle Switch */}
        <div
          style={{
            display: "flex",
            border: "1px solid #ccc",
            borderRadius: "999px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setGroupBy("artist")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: groupBy === "artist" ? "#2ecc71" : "white",
              color: groupBy === "artist" ? "white" : "black",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            👤 Group by Artist
          </button>
          <button
            onClick={() => setGroupBy("pack")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: groupBy === "pack" ? "#2ecc71" : "white",
              color: groupBy === "pack" ? "white" : "black",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            📦 Group by Pack
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggleAllGroups}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            border: "1px solid #ccc",
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500",
            flexShrink: 0,
          }}
        >
          {allCollapsed ? "Expand All" : "Collapse All"}
        </button>
      </div>

      {groupBy === "artist" && selectedSongs.length > 0 && (
        <div
          className="bulk-actions"
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            background: "#f8f9fa",
            border: "1px solid #e9ecef",
            borderRadius: "8px",
            padding: "0.7rem 1.2rem",
            marginBottom: "1.5rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <span style={{ fontWeight: 500, color: "#333", fontSize: "1rem" }}>
            {selectedSongs.length} selected
          </span>
          <button
            onClick={() => setShowBulkModal(true)}
            style={{
              background: "#f3f4f6",
              color: "#222",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0.5rem 1.1rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.2s, border 0.2s",
            }}
          >
            Bulk Edit
          </button>
          {status === "Future Plans" && (
            <button
              onClick={handleStartWork}
              style={{
                background: "#f3f4f6",
                color: "#222",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                padding: "0.5rem 1.1rem",
                fontWeight: 600,
                fontSize: "1rem",
                cursor: "pointer",
                transition: "background 0.2s, border 0.2s",
              }}
            >
              Start Work
            </button>
          )}
          <button
            onClick={handleCleanTitles}
            style={{
              background: "#f3f4f6",
              color: "#222",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0.5rem 1.1rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.2s, border 0.2s",
            }}
          >
            Clean Remaster Tags
          </button>
          <button
            onClick={handleBulkEnhance}
            style={{
              background: "#f3f4f6",
              color: "#222",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0.5rem 1.1rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.2s, border 0.2s",
            }}
          >
            Bulk Enhance
          </button>
          <button
            onClick={handleBulkDelete}
            style={{
              background: "#f3f4f6",
              color: "#222",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              padding: "0.5rem 1.1rem",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.2s, border 0.2s",
            }}
          >
            Bulk Delete
          </button>
        </div>
      )}

      {/* Modal for bulk edit fields */}
      {showBulkModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.18)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowBulkModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              padding: "2rem 2.5rem",
              minWidth: 340,
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowBulkModal(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 14,
                background: "none",
                border: "none",
                fontSize: 22,
                color: "#888",
                cursor: "pointer",
              }}
              aria-label="Close"
            >
              ×
            </button>
            <h3
              style={{
                margin: 0,
                marginBottom: "1.2rem",
                fontSize: "1.2rem",
                color: "#333",
              }}
            >
              Bulk Edit {selectedSongs.length} Song(s)
            </h3>
            <select
              value={bulkEditField}
              onChange={(e) => {
                setBulkEditField(e.target.value);
                setBulkEditValue("");
              }}
              style={bulkEditInputStyle}
            >
              <option value="">-- Select Field to Edit --</option>
              {bulkEditOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {bulkEditField &&
              (bulkEditField === "status" ? (
                <select
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  style={bulkEditInputStyle}
                >
                  <option value="">-- Select Status --</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    bulkEditOptions.find((opt) => opt.value === bulkEditField)
                      ?.type || "text"
                  }
                  placeholder={
                    bulkEditOptions.find((opt) => opt.value === bulkEditField)
                      ?.placeholder || ""
                  }
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  style={bulkEditInputStyle}
                />
              ))}
            <button
              onClick={handleBulkEditApply}
              style={{
                ...bulkActionBtnStyle,
                background: "#007bff",
                color: "white",
                fontWeight: 600,
                marginTop: 10,
              }}
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}

      <table className="song-table">
        <thead>
          <tr>
            <th>
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={selectedSongs.length === songs.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedSongs(songs.map((s) => s.id));
                  } else {
                    setSelectedSongs([]);
                  }
                }}
                className="pretty-checkbox"
              />
            </th>
            <th>Cover</th>
            <th onClick={() => handleSort("title")} className="sortable">
              Title{" "}
              {sortKey === "title" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            <th onClick={() => handleSort("artist")} className="sortable">
              Artist{" "}
              {sortKey === "artist" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>
            <th onClick={() => handleSort("album")} className="sortable">
              Album{" "}
              {sortKey === "album" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>{" "}
            <th>Pack</th>
            <th>Status</th>
            <th onClick={() => handleSort("year")} className="sortable">
              Year {sortKey === "year" && (sortDirection === "asc" ? "▲" : "▼")}
            </th>{" "}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groupBy === "artist"
            ? Object.entries(groupedSongs).map(([artist, albums]) => {
                const allSongsInArtist = Object.values(albums).flat();

                // Find the artist image URL from any song in the group
                const artistImageUrl = allSongsInArtist.find(
                  (s) => s.artist_image_url
                )?.artist_image_url;

                return (
                  <React.Fragment key={artist}>
                    {/* Artist Header Row */}
                    <tr className="group-header">
                      <td
                        colSpan="9"
                        style={{ background: "#f0f0f0", fontWeight: "bold" }}
                      >
                        <input
                          type="checkbox"
                          checked={allSongsInArtist.every((s) =>
                            selectedSongs.includes(s.id)
                          )}
                          onChange={(e) => {
                            const songIds = allSongsInArtist.map((s) => s.id);
                            if (e.target.checked) {
                              setSelectedSongs((prev) => [
                                ...new Set([...prev, ...songIds]),
                              ]);
                            } else {
                              setSelectedSongs((prev) =>
                                prev.filter((id) => !songIds.includes(id))
                              );
                            }
                          }}
                          style={{ marginRight: "1rem" }}
                          className="pretty-checkbox"
                        />
                        {artistImageUrl && (
                          <img
                            src={artistImageUrl}
                            alt={artist}
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
                          onClick={() => toggleGroup(artist)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {collapsedGroups[artist] ? "▶" : "▼"}
                        </button>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "1.25rem",
                            color: "#222",
                          }}
                        >
                          {artist}
                        </span>
                      </td>
                    </tr>

                    {allSongsInArtist.some((s) =>
                      selectedSongs.includes(s.id)
                    ) && (
                      <tr>
                        <td colSpan="9">
                          <div
                            className="bulk-actions"
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "center",
                              background: "#f8f9fa",
                              border: "1px solid #e9ecef",
                              borderRadius: "8px",
                              padding: "0.7rem 1.2rem",
                              marginBottom: "1.5rem",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 500,
                                color: "#333",
                                fontSize: "1rem",
                              }}
                            >
                              {
                                allSongsInArtist.filter((s) =>
                                  selectedSongs.includes(s.id)
                                ).length
                              }{" "}
                              selected
                            </span>
                            <button
                              onClick={() => setShowBulkModal(true)}
                              style={{
                                background: "#f3f4f6",
                                color: "#222",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "0.5rem 1.1rem",
                                fontWeight: 600,
                                fontSize: "1rem",
                                cursor: "pointer",
                                transition: "background 0.2s, border 0.2s",
                              }}
                            >
                              Bulk Edit
                            </button>
                            {status === "Future Plans" && (
                              <button
                                onClick={handleStartWork}
                                style={{
                                  background: "#f3f4f6",
                                  color: "#222",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  padding: "0.5rem 1.1rem",
                                  fontWeight: 600,
                                  fontSize: "1rem",
                                  cursor: "pointer",
                                  transition: "background 0.2s, border 0.2s",
                                }}
                              >
                                Start Work
                              </button>
                            )}
                            <button
                              onClick={handleCleanTitles}
                              style={{
                                background: "#f3f4f6",
                                color: "#222",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "0.5rem 1.1rem",
                                fontWeight: 600,
                                fontSize: "1rem",
                                cursor: "pointer",
                                transition: "background 0.2s, border 0.2s",
                              }}
                            >
                              Clean Remaster Tags
                            </button>
                            <button
                              onClick={handleBulkEnhance}
                              style={{
                                background: "#f3f4f6",
                                color: "#222",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "0.5rem 1.1rem",
                                fontWeight: 600,
                                fontSize: "1rem",
                                cursor: "pointer",
                                transition: "background 0.2s, border 0.2s",
                              }}
                            >
                              Bulk Enhance
                            </button>
                            <button
                              onClick={handleBulkDelete}
                              style={{
                                background: "#f3f4f6",
                                color: "#222",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                padding: "0.5rem 1.1rem",
                                fontWeight: 600,
                                fontSize: "1rem",
                                cursor: "pointer",
                                transition: "background 0.2s, border 0.2s",
                              }}
                            >
                              Bulk Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!collapsedGroups[artist] &&
                      Object.entries(albums).map(([album, songsInAlbum]) => (
                        <React.Fragment key={`${artist}-${album}`}>
                          {/* Album Header Row */}
                          <tr className="group-subheader">
                            <td colSpan="9" style={{ background: "#fafafa" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                  paddingLeft: "2em",
                                  fontStyle: "italic",
                                  fontSize: "1rem",
                                  fontWeight: 500,
                                }}
                              >
                                <div style={{ flex: "0 0 auto" }}>
                                  <input
                                    type="checkbox"
                                    checked={songsInAlbum.every((song) =>
                                      selectedSongs.includes(song.id)
                                    )}
                                    onChange={(e) => {
                                      const songIds = songsInAlbum.map(
                                        (s) => s.id
                                      );
                                      if (e.target.checked) {
                                        setSelectedSongs((prev) => [
                                          ...new Set([...prev, ...songIds]),
                                        ]);
                                      } else {
                                        setSelectedSongs((prev) =>
                                          prev.filter(
                                            (id) => !songIds.includes(id)
                                          )
                                        );
                                      }
                                    }}
                                    className="pretty-checkbox"
                                  />
                                </div>
                                <div style={{ flex: "1 1 auto" }}>
                                  💿 <em>{album || "Unknown Album"}</em> (
                                  {songsInAlbum.length})
                                </div>
                              </div>
                            </td>
                          </tr>

                          {songsInAlbum.map((song) => (
                            <SongRow
                              key={song.id}
                              song={song}
                              selected={selectedSongs.includes(song.id)}
                              onSelect={(e) => {
                                if (e.target.checked) {
                                  setSelectedSongs([...selectedSongs, song.id]);
                                } else {
                                  setSelectedSongs(
                                    selectedSongs.filter((id) => id !== song.id)
                                  );
                                }
                              }}
                              editing={editing}
                              editValues={editValues}
                              setEditing={setEditing}
                              setEditValues={setEditValues}
                              saveEdit={saveEdit}
                              fetchSpotifyOptions={fetchSpotifyOptions}
                              handleDelete={handleDelete}
                              spotifyOptions={spotifyOptions}
                              setSpotifyOptions={setSpotifyOptions}
                              applySpotifyEnhancement={applySpotifyEnhancement}
                            />
                          ))}
                        </React.Fragment>
                      ))}
                  </React.Fragment>
                );
              })
            : Object.entries(groupedSongs).map(([packName, songsInPack]) => {
                const groupKey = `pack:${packName}`;
                // Find the most common artist and their image URL
                const artistCounts = {};
                songsInPack.forEach((song) => {
                  if (!song.artist) return;
                  artistCounts[song.artist] =
                    (artistCounts[song.artist] || 0) + 1;
                });
                const mostCommonArtist = Object.entries(artistCounts).sort(
                  (a, b) => b[1] - a[1]
                )[0]?.[0];
                const artistImageUrl = songsInPack.find(
                  (s) => s.artist === mostCommonArtist
                )?.artist_image_url;

                return (
                  <React.Fragment key={groupKey}>
                    {/* Pack Header Row */}
                    <tr className="group-header">
                      {/* First column: select-all checkbox, centered */}
                      <td style={{ width: "40px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={songsInPack.every((s) =>
                            selectedSongs.includes(s.id)
                          )}
                          onChange={(e) => {
                            const songIds = songsInPack.map((s) => s.id);
                            if (e.target.checked) {
                              setSelectedSongs((prev) => [
                                ...new Set([...prev, ...songIds]),
                              ]);
                            } else {
                              setSelectedSongs((prev) =>
                                prev.filter((id) => !songIds.includes(id))
                              );
                            }
                          }}
                          className="pretty-checkbox"
                        />
                      </td>
                      {/* Second column: expand/collapse, pack name, bulk actions */}
                      <td
                        colSpan="8"
                        style={{
                          background: "#f5f5f5",
                          fontWeight: "bold",
                          padding: "0.7rem 1.2rem",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.7rem",
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
                            onClick={() => toggleGroup(groupKey)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: 600,
                              fontSize: "1.1rem",
                              color: "#333",
                              padding: 0,
                            }}
                            tabIndex={0}
                          >
                            {collapsedGroups[groupKey] ? "▶" : "▼"}
                          </button>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "1.18rem",
                              color: "#222",
                            }}
                          >
                            {packName} ({songsInPack.length})
                          </span>
                          {/* Bulk actions for this group if any song in the group is selected */}
                          {songsInPack.some((s) =>
                            selectedSongs.includes(s.id)
                          ) && (
                            <span
                              style={{
                                display: "inline-flex",
                                gap: "0.4rem",
                                marginLeft: "1.2rem",
                                verticalAlign: "middle",
                              }}
                            >
                              <button
                                onClick={() => setShowBulkModal(true)}
                                style={{
                                  background: "#f3f4f6",
                                  color: "#222",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  padding: "0.28rem 0.9rem",
                                  fontWeight: 600,
                                  fontSize: "0.98rem",
                                  cursor: "pointer",
                                  transition: "background 0.2s, border 0.2s",
                                }}
                              >
                                Bulk Edit
                              </button>
                              <button
                                onClick={handleStartWork}
                                style={{
                                  background: "#f3f4f6",
                                  color: "#222",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  padding: "0.28rem 0.9rem",
                                  fontWeight: 600,
                                  fontSize: "0.98rem",
                                  cursor: "pointer",
                                  transition: "background 0.2s, border 0.2s",
                                }}
                              >
                                Start Work
                              </button>
                              <button
                                onClick={handleCleanTitles}
                                style={{
                                  background: "#f3f4f6",
                                  color: "#222",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  padding: "0.28rem 0.9rem",
                                  fontWeight: 600,
                                  fontSize: "0.98rem",
                                  cursor: "pointer",
                                  transition: "background 0.2s, border 0.2s",
                                }}
                              >
                                Clean Remaster Tags
                              </button>
                              <button
                                onClick={handleBulkEnhance}
                                style={{
                                  background: "#f3f4f6",
                                  color: "#222",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  padding: "0.28rem 0.9rem",
                                  fontWeight: 600,
                                  fontSize: "0.98rem",
                                  cursor: "pointer",
                                  transition: "background 0.2s, border 0.2s",
                                }}
                              >
                                Bulk Enhance
                              </button>
                              <button
                                onClick={handleBulkDelete}
                                style={{
                                  background: "#f3f4f6",
                                  color: "#222",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  padding: "0.28rem 0.9rem",
                                  fontWeight: 600,
                                  fontSize: "0.98rem",
                                  cursor: "pointer",
                                  transition: "background 0.2s, border 0.2s",
                                }}
                              >
                                Bulk Delete
                              </button>
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>

                    {!collapsedGroups[groupKey] &&
                      songsInPack.map((song) => (
                        <SongRow
                          key={song.id}
                          song={song}
                          selected={selectedSongs.includes(song.id)}
                          onSelect={(e) => {
                            if (e.target.checked) {
                              setSelectedSongs([...selectedSongs, song.id]);
                            } else {
                              setSelectedSongs(
                                selectedSongs.filter((id) => id !== song.id)
                              );
                            }
                          }}
                          editing={editing}
                          editValues={editValues}
                          setEditing={setEditing}
                          setEditValues={setEditValues}
                          saveEdit={saveEdit}
                          fetchSpotifyOptions={fetchSpotifyOptions}
                          handleDelete={handleDelete}
                          spotifyOptions={spotifyOptions}
                          setSpotifyOptions={setSpotifyOptions}
                          applySpotifyEnhancement={applySpotifyEnhancement}
                        />
                      ))}
                  </React.Fragment>
                );
              })}
        </tbody>
      </table>
    </>
  );
}

const bulkActionBtnStyle = {
  background: "#f6f7fa",
  color: "#222",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  padding: "0.5rem 1.1rem",
  fontWeight: 500,
  fontSize: "1rem",
  cursor: "pointer",
  transition: "background 0.2s, border 0.2s",
  textAlign: "left",
};

const bulkEditInputStyle = {
  padding: "0.6rem 1rem",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "1rem",
  marginBottom: "0.2rem",
};

export default SongPage;
