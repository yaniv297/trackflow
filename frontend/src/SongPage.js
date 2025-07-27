import React, { useState, useEffect, useRef } from "react";
import SongRow from "./components/SongRow";
import Fireworks from "./components/Fireworks";
import CustomAlert from "./components/CustomAlert";
import CustomPrompt from "./components/CustomPrompt";
import API_BASE_URL from "./config";

function SongPage({ status }) {
  const [songs, setSongs] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState({}); // { [songId_field]: true }
  const [editValues, setEditValues] = useState({});
  const [spotifyOptions, setSpotifyOptions] = useState({});
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupBy, setGroupBy] = useState("artist");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [fireworksTrigger, setFireworksTrigger] = useState(0);
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning",
  });
  const [promptConfig, setPromptConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    placeholder: "",
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
      // Skip undefined or null songs
      if (!song || typeof song !== "object") {
        console.warn("Skipping invalid song:", song);
        return acc;
      }

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
      // Skip undefined or null songs
      if (!song || typeof song !== "object") {
        console.warn("Skipping invalid song:", song);
        return acc;
      }

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

    setAlertConfig({
      isOpen: true,
      title: "Move to WIP",
      message: `Are you sure you want to move ${selectedSongs.length} song(s) to WIP?`,
      onConfirm: async () => {
        try {
          // Get the songs that are being moved to WIP
          const songsToMove = songs.filter((s) => selectedSongs.includes(s.id));

          // Group songs by album series
          const seriesGroups = {};
          songsToMove.forEach((song) => {
            if (song.album_series_id) {
              if (!seriesGroups[song.album_series_id]) {
                seriesGroups[song.album_series_id] = [];
              }
              seriesGroups[song.album_series_id].push(song);
            }
          });

          // Move songs to WIP
          await Promise.all(
            selectedSongs.map((id) =>
              fetch(`${API_BASE_URL}/songs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "wip" }),
              })
            )
          );

          // Update album series status to "in_progress" if any songs belong to a series
          for (const [seriesId, seriesSongs] of Object.entries(seriesGroups)) {
            if (seriesSongs.length > 0) {
              try {
                await fetch(`${API_BASE_URL}/album-series/${seriesId}/status`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "in_progress" }),
                });
              } catch (err) {
                console.warn(
                  `Failed to update album series ${seriesId} status:`,
                  err
                );
              }
            }
          }

          // Remove them from local state (since this is Future Plans view)
          setSongs((prev) => prev.filter((s) => !selectedSongs.includes(s.id)));
          setSelectedSongs([]);
          window.showNotification("✅ Moved to WIP!", "success");
        } catch (err) {
          console.error("❌ Failed to start work", err);
          window.showNotification("Something went wrong.", "error");
        }
      },
      type: "warning",
    });
  };

  const fetchSpotifyOptions = (song) => {
    setLoadingId(song.id);
    fetch(`${API_BASE_URL}/spotify/${song.id}/spotify-options`)
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
        window.showNotification(err.message, "error");
        setSpotifyOptions((prev) => ({ ...prev, [song.id]: [] })); // set to empty array to avoid .map crash
      })
      .finally(() => setLoadingId(null));
  };

  const applySpotifyEnhancement = (songId, trackId) => {
    fetch(`${API_BASE_URL}/spotify/${songId}/enhance`, {
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
      .catch((err) => window.showNotification(err.message, "error"));
  };

  const handleDelete = (id) => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Song",
      message:
        "Are you sure you want to delete this song? This action cannot be undone.",
      onConfirm: () => {
        fetch(`${API_BASE_URL}/songs/${id}`, {
          method: "DELETE",
        })
          .then((res) => {
            if (!res.ok) throw new Error("Failed to delete");
            setSongs(songs.filter((s) => s.id !== id));
            window.showNotification("Song deleted successfully", "success");
          })
          .catch((err) => window.showNotification(err.message, "error"));
      },
      type: "danger",
    });
  };

  const saveEdit = (id, field) => {
    const value = editValues[`${id}_${field}`];

    if (field === "year" && value && !/^\d{4}$/.test(value)) {
      window.showNotification("Please enter a valid 4-digit year.", "warning");
      return;
    }

    setEditing((prev) => ({ ...prev, [`${id}_${field}`]: false }));

    fetch(`${API_BASE_URL}/songs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
      .then((res) => res.json())
      .then((updated) => {
        setSongs((prev) => {
          const updatedSongs = prev.map((s) =>
            s.id === id ? { ...s, [field]: updated[field] } : s
          );

          // Check if status changed to "Released" and trigger fireworks
          if (field === "status" && value === "Released") {
            setFireworksTrigger((prev) => prev + 1);
          }

          return updatedSongs;
        });
      })
      .catch((err) => window.showNotification("Update failed", "error"));
  };

  const handleCleanTitles = () => {
    if (selectedSongs.length === 0) {
      window.showNotification("Select at least one song to clean.", "warning");
      return;
    }

    fetch(`${API_BASE_URL}/tools/bulk-clean`, {
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

  const handleBulkDelete = () => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Multiple Songs",
      message: `Are you sure you want to delete ${selectedSongs.length} selected song(s)? This action cannot be undone.`,
      onConfirm: () => {
        fetch(`${API_BASE_URL}/songs/bulk-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(selectedSongs),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log(`Deleted ${data.deleted} songs`);
            setSongs((prev) =>
              prev.filter((s) => !selectedSongs.includes(s.id))
            );
            setSelectedSongs([]);
            window.showNotification("Songs deleted successfully", "success");
          })
          .catch((err) =>
            window.showNotification("Bulk delete failed", "error")
          );
      },
      type: "danger",
    });
  };

  const handleBulkEnhance = async () => {
    if (!selectedSongs.length) {
      window.showNotification("Select at least one song.", "warning");
      return;
    }

    setAlertConfig({
      isOpen: true,
      title: "Bulk Enhance Songs",
      message: `Enhance ${selectedSongs.length} songs with the first Spotify match?`,
      onConfirm: async () => {
        for (const songId of selectedSongs) {
          try {
            const res = await fetch(
              `${API_BASE_URL}/spotify/${songId}/spotify-options`
            );
            const options = await res.json();

            if (Array.isArray(options) && options.length > 0) {
              const topMatch = options[0];
              await fetch(`${API_BASE_URL}/spotify/${songId}/enhance`, {
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

        setSelectedSongs([]); // Clear all checkboxes
        window.showNotification(
          "🎉 Bulk enhancement complete. Reload to see changes.",
          "success"
        );
      },
      type: "warning",
    });
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
    {
      label: "Cover Art",
      value: "album_cover",
      type: "text",
      placeholder: "Artwork URL (e.g., https://example.com/cover.jpg)",
    },
    {
      label: "Collaborations",
      value: "collaborations",
      type: "text",
      placeholder: "e.g., jphn, EdTanguy",
    },
  ];
  const [bulkEditField, setBulkEditField] = useState("");
  const [bulkEditValue, setBulkEditValue] = useState("");
  const [albumSeriesForm, setAlbumSeriesForm] = useState({
    artist_name: "",
    album_name: "",
    year: "",
    cover_image_url: "",
    description: "",
  });
  const [showAlbumSeriesModal, setShowAlbumSeriesModal] = useState(false);

  const handleCreateAlbumSeries = async () => {
    if (!albumSeriesForm.artist_name || !albumSeriesForm.album_name) {
      window.showNotification(
        "Please provide artist name and album name.",
        "warning"
      );
      return;
    }

    // Get the pack name from the first selected song
    const firstSong = songs.find((song) => song.id === selectedSongs[0]);
    if (!firstSong || !firstSong.pack) {
      window.showNotification(
        "Selected songs must be from the same pack.",
        "warning"
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/album-series/create-from-pack`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pack_name: firstSong.pack,
            artist_name: albumSeriesForm.artist_name,
            album_name: albumSeriesForm.album_name,
            year:
              albumSeriesForm.year && albumSeriesForm.year.trim()
                ? parseInt(albumSeriesForm.year)
                : null,
            cover_image_url:
              albumSeriesForm.cover_image_url &&
              albumSeriesForm.cover_image_url.trim()
                ? albumSeriesForm.cover_image_url
                : null,
            description:
              albumSeriesForm.description && albumSeriesForm.description.trim()
                ? albumSeriesForm.description
                : null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create album series");
      }

      await response.json();
      window.showNotification(
        `✅ Album series "${albumSeriesForm.album_name}" created successfully!`,
        "success"
      );

      // Reset form and close modal
      setAlbumSeriesForm({
        artist_name: "",
        album_name: "",
        year: "",
        cover_image_url: "",
        description: "",
      });
      setShowAlbumSeriesModal(false);
      setSelectedSongs([]);

      // Refresh songs to show the new album series links
      let url = `${API_BASE_URL}/songs?`;
      if (status) url += `status=${encodeURIComponent(status)}&`;
      if (search) url += `query=${encodeURIComponent(search)}&`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => setSongs(data));
    } catch (error) {
      console.error("Error creating album series:", error);
      window.showNotification("Failed to create album series.", "error");
    }
  };

  const handleMakeDoubleAlbumSeries = async (
    packName,
    albumsWithEnoughSongs
  ) => {
    if (albumsWithEnoughSongs.length < 2) {
      window.showNotification(
        "Need at least 2 albums with 5+ songs each.",
        "warning"
      );
      return;
    }

    // Get the second album (the one that's not already an album series)
    const secondAlbum = albumsWithEnoughSongs[1]; // [albumName, count]
    const secondAlbumName = secondAlbum[0];
    const secondAlbumCount = secondAlbum[1];

    // Find the most common artist for the second album
    const songsInSecondAlbum = songs.filter(
      (song) => song.pack === packName && song.album === secondAlbumName
    );
    const artistCounts = {};
    songsInSecondAlbum.forEach((song) => {
      if (song.artist) {
        artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
      }
    });
    const mostCommonArtist = Object.entries(artistCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    if (!mostCommonArtist) {
      window.showNotification(
        "Could not determine artist for second album.",
        "error"
      );
      return;
    }

    try {
      // Create a new pack name for the second album
      const newPackName = `${packName} - ${secondAlbumName}`;

      // Update all songs from the second album to the new pack
      const songIdsToMove = songsInSecondAlbum.map((song) => song.id);

      // Update pack names for songs in the second album
      await Promise.all(
        songIdsToMove.map((songId) =>
          fetch(`${API_BASE_URL}/songs/${songId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pack: newPackName }),
          })
        )
      );

      // Create album series for the second album
      const response = await fetch(
        `${API_BASE_URL}/album-series/create-from-pack`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pack_name: newPackName,
            artist_name: mostCommonArtist,
            album_name: secondAlbumName,
            year: null,
            cover_image_url: null,
            description: null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create second album series");
      }

      await response.json();
      window.showNotification(
        `✅ Double album series created! "${secondAlbumName}" split into its own album series with ${secondAlbumCount} songs.`,
        "success"
      );

      // Refresh songs to show the updated structure
      let url = `${API_BASE_URL}/songs?`;
      if (status) url += `status=${encodeURIComponent(status)}&`;
      if (search) url += `query=${encodeURIComponent(search)}&`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => setSongs(data));
    } catch (error) {
      console.error("Error creating double album series:", error);
      window.showNotification("Failed to create double album series.", "error");
    }
  };

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
      try {
        if (bulkEditField === "collaborations") {
          // Handle collaborations specially - parse the input and create collaboration records
          const collaborationText = bulkEditValue.trim();
          if (collaborationText) {
            const collaborations = collaborationText
              .split(",")
              .map((collab) => {
                const author = collab.trim();
                return {
                  author: author,
                  parts: null,
                };
              });

            const res = await fetch(
              `${API_BASE_URL}/songs/${id}/collaborations`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collaborations }),
              }
            );
            if (!res.ok) failed++;
          }
        } else {
          const updates = {};
          updates[bulkEditField] =
            bulkEditField === "year" ? Number(bulkEditValue) : bulkEditValue;
          const res = await fetch(`${API_BASE_URL}/songs/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          if (!res.ok) failed++;
        }
      } catch {
        failed++;
      }
    }
    setShowBulkModal(false);
    setBulkEditField("");
    setBulkEditValue("");
    setSelectedSongs([]); // Clear all checkboxes
    if (failed === 0) {
      window.showNotification(
        `Bulk updated ${selectedSongs.length} song(s).`,
        "success"
      );
    } else {
      window.showNotification(`Failed to update ${failed} song(s).`, "error");
    }
    // Optionally, refresh songs
    let url = `${API_BASE_URL}/songs?`;
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
      let url = `${API_BASE_URL}/songs?`;
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
      <Fireworks trigger={fireworksTrigger} />
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
          placeholder="Search title, artist, album, or collaborators..."
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
            Bulk Actions
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
              Bulk Actions for {selectedSongs.length} Song(s)
            </h3>
            <select
              value={bulkEditField}
              onChange={(e) => {
                setBulkEditField(e.target.value);
                setBulkEditValue("");
              }}
              style={bulkEditInputStyle}
            >
              <option value="">-- Choose Action --</option>
              {bulkEditOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Edit {opt.label}
                </option>
              ))}
              <option value="bulk_enhance">Bulk Enhance</option>
              <option value="bulk_delete">Bulk Delete</option>
              <option value="clean_remaster_tags">Clean Remaster Tags</option>
            </select>
            {/* Only show value input for field-based actions */}
            {bulkEditField &&
              bulkEditOptions.some((opt) => opt.value === bulkEditField) &&
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
              onClick={async () => {
                if (
                  bulkEditOptions.some((opt) => opt.value === bulkEditField)
                ) {
                  await handleBulkEditApply();
                } else if (bulkEditField === "bulk_enhance") {
                  await handleBulkEnhance();
                  setShowBulkModal(false);
                } else if (bulkEditField === "bulk_delete") {
                  await handleBulkDelete();
                  setShowBulkModal(false);
                } else if (bulkEditField === "clean_remaster_tags") {
                  await handleCleanTitles();
                  setShowBulkModal(false);
                }
              }}
              style={{
                ...bulkActionBtnStyle,
                background: "#007bff",
                color: "white",
                fontWeight: 600,
                marginTop: 10,
                opacity: bulkEditField ? 1 : 0.5,
                cursor: bulkEditField ? "pointer" : "not-allowed",
              }}
              disabled={
                !bulkEditField ||
                (bulkEditOptions.some((opt) => opt.value === bulkEditField) &&
                  !bulkEditValue)
              }
            >
              Run
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
            </th>
            <th>Collaborations</th>
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
                        colSpan="10"
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
                              Bulk Actions
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
            : Object.entries(groupedSongs)
                .map(([packName, songsInPack]) => {
                  const groupKey = `pack:${packName}`;

                  // Filter out invalid songs
                  const validSongsInPack = songsInPack.filter(
                    (song) => song && typeof song === "object" && song.id
                  );

                  if (validSongsInPack.length === 0) {
                    console.warn("No valid songs in pack:", packName);
                    return null;
                  }

                  // Find the most common artist and their image URL
                  const artistCounts = {};
                  validSongsInPack.forEach((song) => {
                    if (!song.artist) return;
                    artistCounts[song.artist] =
                      (artistCounts[song.artist] || 0) + 1;
                  });
                  const mostCommonArtist = Object.entries(artistCounts).sort(
                    (a, b) => b[1] - a[1]
                  )[0]?.[0];
                  const artistImageUrl = validSongsInPack.find(
                    (s) => s.artist === mostCommonArtist
                  )?.artist_image_url;

                  const allAlbumSeriesId = validSongsInPack.every(
                    (s) => s.album_series_id
                  )
                    ? validSongsInPack[0].album_series_id
                    : null;

                  const uniqueSeries = Array.from(
                    new Set(
                      validSongsInPack
                        .map((s) => s.album_series_id)
                        .filter(Boolean)
                    )
                  );

                  // Count songs per album series and only show if 4+ songs
                  const seriesSongCounts = {};
                  validSongsInPack.forEach((song) => {
                    if (song.album_series_id) {
                      seriesSongCounts[song.album_series_id] =
                        (seriesSongCounts[song.album_series_id] || 0) + 1;
                    }
                  });

                  // Only include series with 4+ songs
                  const validSeries = uniqueSeries.filter(
                    (seriesId) => seriesSongCounts[seriesId] >= 4
                  );

                  const seriesInfo = validSeries
                    .map((id) => {
                      const s = validSongsInPack.find(
                        (song) => song.album_series_id === id
                      );
                      return s
                        ? {
                            id,
                            number: s.album_series_number,
                            name: s.album_series_name,
                          }
                        : null;
                    })
                    .filter(Boolean);

                  seriesInfo.sort((a, b) => {
                    // Handle cases where number might be null/undefined
                    const aNum = a?.number ?? 0;
                    const bNum = b?.number ?? 0;
                    return aNum - bNum;
                  });

                  // Check for double album series opportunity
                  const albumCounts = {};
                  validSongsInPack.forEach((song) => {
                    if (song.album && !song.optional) {
                      albumCounts[song.album] =
                        (albumCounts[song.album] || 0) + 1;
                    }
                  });

                  // Find albums with 5+ songs
                  const albumsWithEnoughSongs = Object.entries(albumCounts)
                    .filter(([album, count]) => count >= 5)
                    .sort((a, b) => b[1] - a[1]); // Sort by count descending

                  // Check if we have an existing album series AND another album with 5+ songs
                  const hasExistingSeries = validSeries.length > 0;
                  const hasSecondAlbum = albumsWithEnoughSongs.length >= 2;
                  const canMakeDoubleAlbumSeries =
                    hasExistingSeries && hasSecondAlbum;

                  return (
                    <React.Fragment key={groupKey}>
                      {/* Pack Header Row */}
                      <tr className="group-header">
                        {/* First column: select-all checkbox, centered */}
                        <td style={{ width: "40px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={validSongsInPack.every((s) =>
                              selectedSongs.includes(s.id)
                            )}
                            onChange={(e) => {
                              const songIds = validSongsInPack.map((s) => s.id);
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
                              {seriesInfo.length === 1 && seriesInfo[0] ? (
                                <a
                                  href={`/album-series/${seriesInfo[0].id}`}
                                  style={{
                                    textDecoration: "none",
                                    color: "#1a237e",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    background: "#e3eaff",
                                    borderRadius: "12px",
                                    padding: "0.15rem 0.7rem 0.15rem 0.5rem",
                                    fontWeight: 600,
                                    fontSize: "1.08em",
                                    boxShadow: "0 1px 4px rgba(26,35,126,0.07)",
                                    transition: "background 0.2s",
                                    marginRight: 8,
                                  }}
                                  title={`Album Series #${
                                    seriesInfo[0].number || "N/A"
                                  }: ${seriesInfo[0].name || "Unknown"}`}
                                >
                                  <span
                                    style={{
                                      fontSize: "1.1em",
                                      marginRight: 4,
                                    }}
                                  >
                                    📀
                                  </span>
                                  Album Series #{seriesInfo[0].number || "N/A"}:{" "}
                                  {seriesInfo[0].name || "Unknown"}
                                </a>
                              ) : seriesInfo.length === 2 ? (
                                <>
                                  {seriesInfo.map((info, idx) => (
                                    <a
                                      key={info.id}
                                      href={`/album-series/${info.id}`}
                                      style={{
                                        textDecoration: "none",
                                        color: "#1a237e",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        background: "#e3eaff",
                                        borderRadius: "12px",
                                        padding:
                                          "0.15rem 0.7rem 0.15rem 0.5rem",
                                        fontWeight: 600,
                                        fontSize: "1.08em",
                                        boxShadow:
                                          "0 1px 4px rgba(26,35,126,0.07)",
                                        transition: "background 0.2s",
                                        marginRight: idx === 0 ? 8 : 0,
                                      }}
                                      title={`Album Series #${
                                        info.number || "N/A"
                                      }: ${info.name || "Unknown"}`}
                                    >
                                      <span
                                        style={{
                                          fontSize: "1.1em",
                                          marginRight: 4,
                                        }}
                                      >
                                        📀
                                      </span>
                                      Album Series #{info.number || "N/A"}:{" "}
                                      {info.name || "Unknown"}
                                    </a>
                                  ))}
                                </>
                              ) : (
                                `${packName} (${validSongsInPack.length})`
                              )}
                            </span>
                            {/* Pack-level action buttons */}
                            <span
                              style={{
                                display: "inline-flex",
                                gap: "0.4rem",
                                marginLeft: "1.2rem",
                                verticalAlign: "middle",
                              }}
                            >
                              {/* Create Album Series Button */}
                              {(() => {
                                // Check if we have 4+ songs from the same album
                                const albumCounts = {};
                                validSongsInPack.forEach((song) => {
                                  if (song.album && !song.optional) {
                                    albumCounts[song.album] =
                                      (albumCounts[song.album] || 0) + 1;
                                  }
                                });

                                // Check if any album has 4+ songs
                                const hasEnoughSongs = Object.values(
                                  albumCounts
                                ).some((count) => count >= 4);

                                return (
                                  validSeries.length === 0 && hasEnoughSongs
                                );
                              })() ? (
                                <button
                                  onClick={() => {
                                    // Auto-populate form with most common artist and album from pack songs
                                    const artistCounts = {};
                                    validSongsInPack.forEach((song) => {
                                      if (song.artist) {
                                        artistCounts[song.artist] =
                                          (artistCounts[song.artist] || 0) + 1;
                                      }
                                    });
                                    const mostCommonArtist =
                                      Object.keys(artistCounts).reduce(
                                        (a, b) =>
                                          artistCounts[a] > artistCounts[b]
                                            ? a
                                            : b,
                                        Object.keys(artistCounts)[0]
                                      ) || "";

                                    const albumCounts = {};
                                    validSongsInPack.forEach((song) => {
                                      if (song.album && !song.optional) {
                                        albumCounts[song.album] =
                                          (albumCounts[song.album] || 0) + 1;
                                      }
                                    });
                                    const mostCommonAlbum =
                                      Object.keys(albumCounts).reduce(
                                        (a, b) =>
                                          albumCounts[a] > albumCounts[b]
                                            ? a
                                            : b,
                                        Object.keys(albumCounts)[0]
                                      ) || "";

                                    const yearCounts = {};
                                    validSongsInPack.forEach((song) => {
                                      if (song.year) {
                                        yearCounts[song.year] =
                                          (yearCounts[song.year] || 0) + 1;
                                      }
                                    });
                                    const mostCommonYear =
                                      Object.keys(yearCounts).reduce(
                                        (a, b) =>
                                          yearCounts[a] > yearCounts[b] ? a : b,
                                        Object.keys(yearCounts)[0]
                                      ) || "";

                                    setAlbumSeriesForm({
                                      artist_name: mostCommonArtist,
                                      album_name: mostCommonAlbum,
                                      year: mostCommonYear,
                                      cover_image_url: "",
                                      description: "",
                                    });
                                    setSelectedSongs(
                                      validSongsInPack.map((s) => s.id)
                                    );
                                    setShowAlbumSeriesModal(true);
                                  }}
                                  style={{
                                    background: "#4CAF50",
                                    color: "white",
                                    border: "1px solid #45a049",
                                    borderRadius: "6px",
                                    padding: "0.28rem 0.9rem",
                                    fontWeight: 600,
                                    fontSize: "0.98rem",
                                    cursor: "pointer",
                                    transition: "background 0.2s, border 0.2s",
                                  }}
                                >
                                  🎵 Create Album Series
                                </button>
                              ) : null}
                              {/* Make Double Album Series Button */}
                              {canMakeDoubleAlbumSeries ? (
                                <button
                                  onClick={() =>
                                    handleMakeDoubleAlbumSeries(
                                      packName,
                                      albumsWithEnoughSongs
                                    )
                                  }
                                  style={{
                                    background: "#FF6B35",
                                    color: "white",
                                    border: "1px solid #E55A2B",
                                    borderRadius: "6px",
                                    padding: "0.28rem 0.9rem",
                                    fontWeight: 600,
                                    fontSize: "0.98rem",
                                    cursor: "pointer",
                                    transition: "background 0.2s, border 0.2s",
                                  }}
                                  title={`Split "${albumsWithEnoughSongs[1][0]}" into its own album series (${albumsWithEnoughSongs[1][1]} songs)`}
                                >
                                  🎵🎵 Make Double Album Series
                                </button>
                              ) : null}
                            </span>
                            {/* Bulk actions for this group if any song in the group is selected */}
                            {validSongsInPack.some((s) =>
                              selectedSongs.includes(s.id)
                            ) ? (
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
                                  Bulk Actions
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
                                {(() => {
                                  // Check if we have 4+ songs from the same album
                                  const selectedSongData = songs.filter(
                                    (song) => selectedSongs.includes(song.id)
                                  );

                                  // Get album counts
                                  const albumCounts = {};
                                  selectedSongData.forEach((song) => {
                                    if (song.album && !song.optional) {
                                      albumCounts[song.album] =
                                        (albumCounts[song.album] || 0) + 1;
                                    }
                                  });

                                  // Check if any album has 4+ songs
                                  const hasEnoughSongs = Object.values(
                                    albumCounts
                                  ).some((count) => count >= 4);

                                  return (
                                    selectedSongs.length > 0 && hasEnoughSongs
                                  );
                                })() ? (
                                  <button
                                    onClick={() => {
                                      // Auto-populate form with most common artist and album from selected songs
                                      const selectedSongData = songs.filter(
                                        (song) =>
                                          selectedSongs.includes(song.id)
                                      );

                                      // Get most common artist
                                      const artistCounts = {};
                                      selectedSongData.forEach((song) => {
                                        if (song.artist) {
                                          artistCounts[song.artist] =
                                            (artistCounts[song.artist] || 0) +
                                            1;
                                        }
                                      });
                                      const mostCommonArtist =
                                        Object.keys(artistCounts).reduce(
                                          (a, b) =>
                                            artistCounts[a] > artistCounts[b]
                                              ? a
                                              : b,
                                          Object.keys(artistCounts)[0]
                                        ) || "";

                                      // Get most common album
                                      const albumCounts = {};
                                      selectedSongData.forEach((song) => {
                                        if (song.album && !song.optional) {
                                          albumCounts[song.album] =
                                            (albumCounts[song.album] || 0) + 1;
                                        }
                                      });
                                      const mostCommonAlbum =
                                        Object.keys(albumCounts).reduce(
                                          (a, b) =>
                                            albumCounts[a] > albumCounts[b]
                                              ? a
                                              : b,
                                          Object.keys(albumCounts)[0]
                                        ) || "";

                                      // Get most common year
                                      const yearCounts = {};
                                      selectedSongData.forEach((song) => {
                                        if (song.year) {
                                          yearCounts[song.year] =
                                            (yearCounts[song.year] || 0) + 1;
                                        }
                                      });
                                      const mostCommonYear =
                                        Object.keys(yearCounts).reduce(
                                          (a, b) =>
                                            yearCounts[a] > yearCounts[b]
                                              ? a
                                              : b,
                                          Object.keys(yearCounts)[0]
                                        ) || "";

                                      setAlbumSeriesForm({
                                        artist_name: mostCommonArtist,
                                        album_name: mostCommonAlbum,
                                        year: mostCommonYear,
                                        cover_image_url: "",
                                        description: "",
                                      });
                                      setShowAlbumSeriesModal(true);
                                    }}
                                    style={{
                                      background: "#4CAF50",
                                      color: "white",
                                      border: "1px solid #45a049",
                                      borderRadius: "6px",
                                      padding: "0.28rem 0.9rem",
                                      fontWeight: 600,
                                      fontSize: "0.98rem",
                                      cursor: "pointer",
                                      transition:
                                        "background 0.2s, border 0.2s",
                                    }}
                                  >
                                    🎵 Create Album Series
                                  </button>
                                ) : selectedSongs.length > 0 ? (
                                  <span
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "#666",
                                      fontStyle: "italic",
                                    }}
                                    title="Need 4+ songs from the same album to create an album series"
                                  >
                                    Need 4+ songs from same album
                                  </span>
                                ) : null}
                              </span>
                            ) : null}
                          </span>
                        </td>
                      </tr>

                      {!collapsedGroups[groupKey] &&
                        validSongsInPack.map((song) => (
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
                })
                .filter(Boolean)}
        </tbody>
      </table>

      {/* Modal for creating album series */}
      {showAlbumSeriesModal && (
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
          onClick={() => setShowAlbumSeriesModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              padding: "2rem 2.5rem",
              minWidth: 400,
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAlbumSeriesModal(false)}
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
              🎵 Create Album Series from Pack
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "#666",
                marginBottom: "0.5rem",
              }}
            >
              Create an album series from {selectedSongs.length} selected song
              {selectedSongs.length !== 1 ? "s" : ""}
            </p>

            {/* Preview of selected songs */}
            <div
              style={{
                background: "#f8f9fa",
                border: "1px solid #e9ecef",
                borderRadius: "6px",
                padding: "0.8rem",
                marginBottom: "1rem",
                maxHeight: "120px",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                  marginBottom: "0.5rem",
                }}
              >
                Selected songs:
              </div>
              {songs
                .filter((song) => selectedSongs.includes(song.id))
                .slice(0, 5)
                .map((song) => (
                  <div
                    key={song.id}
                    style={{
                      fontSize: "0.8rem",
                      color: "#333",
                      marginBottom: "0.2rem",
                    }}
                  >
                    • {song.title} - {song.artist}
                  </div>
                ))}
              {selectedSongs.length > 5 && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#666",
                    fontStyle: "italic",
                  }}
                >
                  ... and {selectedSongs.length - 5} more
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Artist Name *"
              value={albumSeriesForm.artist_name}
              onChange={(e) =>
                setAlbumSeriesForm((prev) => ({
                  ...prev,
                  artist_name: e.target.value,
                }))
              }
              style={bulkEditInputStyle}
            />
            <input
              type="text"
              placeholder="Album Name *"
              value={albumSeriesForm.album_name}
              onChange={(e) =>
                setAlbumSeriesForm((prev) => ({
                  ...prev,
                  album_name: e.target.value,
                }))
              }
              style={bulkEditInputStyle}
            />
            <input
              type="number"
              placeholder="Year (optional)"
              value={albumSeriesForm.year}
              onChange={(e) =>
                setAlbumSeriesForm((prev) => ({
                  ...prev,
                  year: e.target.value,
                }))
              }
              style={bulkEditInputStyle}
            />
            <input
              type="text"
              placeholder="Cover Image URL (optional)"
              value={albumSeriesForm.cover_image_url}
              onChange={(e) =>
                setAlbumSeriesForm((prev) => ({
                  ...prev,
                  cover_image_url: e.target.value,
                }))
              }
              style={bulkEditInputStyle}
            />
            <textarea
              placeholder="Description (optional)"
              value={albumSeriesForm.description}
              onChange={(e) =>
                setAlbumSeriesForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              style={{
                ...bulkEditInputStyle,
                minHeight: "80px",
                resize: "vertical",
              }}
            />

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button
                onClick={handleCreateAlbumSeries}
                style={{
                  ...bulkActionBtnStyle,
                  background: "#4CAF50",
                  color: "white",
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                Create Album Series
              </button>
              <button
                onClick={() => setShowAlbumSeriesModal(false)}
                style={{
                  ...bulkActionBtnStyle,
                  background: "#f3f4f6",
                  color: "#222",
                  flex: 1,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      <CustomAlert
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        onConfirm={alertConfig.onConfirm}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />

      {/* Custom Prompt Modal */}
      <CustomPrompt
        isOpen={promptConfig.isOpen}
        onClose={() => setPromptConfig({ ...promptConfig, isOpen: false })}
        onConfirm={promptConfig.onConfirm}
        title={promptConfig.title}
        message={promptConfig.message}
        placeholder={promptConfig.placeholder}
      />
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
