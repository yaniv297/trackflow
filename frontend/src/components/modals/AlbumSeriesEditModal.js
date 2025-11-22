import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiDelete } from "../../utils/api";

export default function AlbumSeriesEditModal({
  isOpen,
  onClose,
  packId,
  seriesList = [],
  defaultSeriesId,
  onChanged,
  // New props for create mode
  createMode = false,
  createData = null, // { artistName, albumName, status }
}) {
  const [seriesId, setSeriesId] = useState(
    defaultSeriesId || seriesList[0]?.id || null
  );
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [, setPreexisting] = useState({}); // key: spotify_track_id or title_clean -> bool
  const [rowLoading, setRowLoading] = useState({}); // key -> bool
  const [linkingKey, setLinkingKey] = useState(null);
  const [packSongs, setPackSongs] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const canShow = isOpen; // Simplified: just show when isOpen is true

  // Clear state immediately when modal opens to prevent showing old data
  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setLoading(true);
      setRowLoading({});
      setLinkingKey(null);
    }
  }, [isOpen]);

  // Ensure seriesId is initialized when modal opens or when props change
  useEffect(() => {
    if (!isOpen) return;
    const candidate = defaultSeriesId ?? seriesList[0]?.id ?? null;
    const normalized =
      typeof candidate === "string" ? parseInt(candidate, 10) : candidate;
    if (normalized && normalized !== seriesId) {
      setSeriesId(normalized);
    }
  }, [isOpen, defaultSeriesId, seriesList]);

  const getKey = (it) =>
    it.spotify_track_id || (it.title_clean || "").toLowerCase();

  // Sort items by disc number first, then track number
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const discA = parseInt(a.disc_number) || 1;
      const discB = parseInt(b.disc_number) || 1;
      const trackA = parseInt(a.track_number) || 0;
      const trackB = parseInt(b.track_number) || 0;

      if (discA !== discB) {
        return discA - discB;
      }
      return trackA - trackB;
    });
  }, [items]);

  // Group items by disc number for visual separation
  const itemsByDisc = useMemo(() => {
    const grouped = {};
    sortedItems.forEach((item) => {
      const discNumber = parseInt(item.disc_number) || 1;
      if (!grouped[discNumber]) {
        grouped[discNumber] = [];
      }
      grouped[discNumber].push(item);
    });

    // Sort the disc numbers to ensure proper order
    const sortedDiscs = Object.keys(grouped).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    const result = {};
    sortedDiscs.forEach((disc) => {
      result[disc] = grouped[disc];
    });

    return result;
  }, [sortedItems]);

  const reload = async () => {
    try {
      setLoading(true);

      if (createMode && createData) {
        // In create mode, we need to fetch the Spotify tracklist for the album
        const data = await apiGet(
          `/spotify/album-tracklist?artist=${encodeURIComponent(
            createData.artistName
          )}&album=${encodeURIComponent(createData.albumName)}`
        );
        setItems(Array.isArray(data) ? data : []);
        const official = {};
        const preexisting = {};
        (Array.isArray(data) ? data : []).forEach((it) => {
          const key = getKey(it);
          if (it.official) official[key] = true;
          if (it.pre_existing) preexisting[key] = true;
        });
        setPreexisting({ ...official, ...preexisting }); // Combine both for backward compatibility
      } else if (seriesId) {
        // Normal edit mode
        const data = await apiGet(
          `/album-series/${seriesId}/spotify-tracklist`
        );
        setItems(Array.isArray(data) ? data : []);
        const official = {};
        const preexisting = {};
        (Array.isArray(data) ? data : []).forEach((it) => {
          const key = getKey(it);
          if (it.official) official[key] = true;
          if (it.pre_existing) preexisting[key] = true;
        });
        setPreexisting({ ...official, ...preexisting }); // Combine both for backward compatibility
      }
    } catch (e) {
      console.error("Failed to load tracklist", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canShow) {
      // Clear state when modal closes
      setItems([]);
      setLoading(false);
      setRowLoading({});
      setLinkingKey(null);
      return;
    }
    // Only reload if we're in edit mode (seriesId exists and we're not in create mode)
    if (seriesId && !createMode) {
      reload();
    }
  }, [canShow, seriesId, createMode]); // Add createMode back to dependencies

  // Separate useEffect for create mode data changes
  useEffect(() => {
    if (createMode && createData && canShow) {
      reload();
    }
  }, [createData?.artistName, createData?.albumName]); // Only depend on the actual data that matters

  // Load songs from the current pack to support linking and authoring-based status
  useEffect(() => {
    const loadPackSongs = async () => {
      if (createMode) {
        // In create mode, we don't have pack songs yet
        setPackSongs([]);
        return;
      }
      if (!packId) return;
      try {
        const data = await apiGet(`/songs/?pack_id=${packId}`);
        setPackSongs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load pack songs", e);
      }
    };
    loadPackSongs();
  }, [packId, createMode]);

  // Derive current series album name from provided list (used to filter link candidates)
  const currentSeries = useMemo(() => {
    return (seriesList || []).find((s) => s.id === seriesId) || null;
  }, [seriesList, seriesId]);
  const seriesAlbumName = currentSeries?.name || "";

  // eslint-disable-next-line no-unused-vars
  const missingTracks = useMemo(() => {
    return items.filter(
      (it) => !it.in_pack && !it.official && !it.pre_existing && !it.irrelevant
    );
  }, [items]);

  const coverage = useMemo(() => {
    const relevantItems = items.filter((item) => !item.irrelevant);
    const total = relevantItems.length || 0;
    const covered = relevantItems.reduce((acc, it) => {
      // Count as covered if:
      // 1. In pack, or
      // 2. Official DLC, or
      // 3. Preexisting, or
      // 4. Has a meaningful status from database (Released, In Progress, WIP, Future Plans, etc.)
      const hasStatus = it.status && it.status.toLowerCase() !== "missing";
      return (
        acc +
        (it.in_pack || it.official || it.pre_existing || hasStatus ? 1 : 0)
      );
    }, 0);
    const percent = total ? Math.round((covered / total) * 100) : 0;
    return { covered, total, percent };
  }, [items]);

  // Songs already matched to tracklist entries (should not be offered for linking again)
  const usedSongIds = useMemo(() => {
    const ids = new Set();
    (items || []).forEach((it) => {
      if (it.in_pack && it.song_id) ids.add(it.song_id);
    });
    return ids;
  }, [items]);

  // Global link candidates list (same album, not released, not already in any series, not already used)
  const linkCandidates = useMemo(() => {
    if (createMode) {
      // In create mode, we don't have existing songs to link to
      return [];
    }
    return (packSongs || [])
      .filter((s) => {
        const albumA = (s.album || "").trim().toLowerCase();
        const albumB = (seriesAlbumName || "").trim().toLowerCase();
        return albumA && albumA === albumB;
      })
      .filter((s) => (s.status || "").toLowerCase() !== "released")
      .filter((s) => !s.album_series_id)
      .filter((s) => !usedSongIds.has(s.id));
  }, [packSongs, seriesAlbumName, usedSongIds, createMode]);

  // Map for quick lookup by song id
  const packSongById = useMemo(() => {
    const map = new Map();
    (packSongs || []).forEach((s) => map.set(s.id, s));
    return map;
  }, [packSongs]);

  // Detect a fully done WIP based on authoring flags
  // eslint-disable-next-line no-unused-vars
  const isFinishedAuthoring = (song) => {
    if (!song || !song.authoring) return false;
    const fields = [
      "demucs",
      "midi",
      "tempo_map",
      "fake_ending",
      "drums",
      "bass",
      "guitar",
      "vocals",
      "keys",
      "other",
    ];
    return fields.every((field) => song.authoring[field]);
  };

  const isReleased = (it) => {
    // Prefer backend-provided status if present
    const raw = (it.status || "").toLowerCase();
    if (raw.includes("released")) return true;

    // Fallback: check the linked pack song
    if (it.in_pack && it.song_id) {
      const song = packSongById.get(it.song_id);
      const s = (song?.status || "").toLowerCase();
      if (s.includes("released")) return true;
    }

    return false;
  };

  const handleSave = async () => {
    if (!createMode || !createData) return;

    setIsCreating(true);
    try {
      // Create songs from the tracklist items that are selected and not irrelevant
      const songsToCreate = items
        .filter((item) => item.in_pack && !item.irrelevant)
        .map((item) => ({
          title: item.title,
          artist: createData.artistName,
          album: createData.albumName,
          pack_name: `${createData.albumName} Album Series`,
          status: createData.status,
        }));

      if (songsToCreate.length === 0) {
        window.showNotification(
          "Please select at least one song before saving",
          "warning"
        );
        return;
      }

      // Create the songs first
      const createdSongs = await apiPost("/songs/batch", songsToCreate);

      // Create the album series
      const packName = `${createData.albumName} Album Series`;
      // eslint-disable-next-line no-unused-vars
      const seriesResponse = await apiPost("/album-series/create-from-pack", {
        pack_name: packName,
        artist_name: createData.artistName,
        album_name: createData.albumName,
        year: null,
        cover_image_url: null,
        description: null,
      });

      window.showNotification(
        `Album series "${createData.albumName}" created successfully with ${createdSongs.length} songs!`,
        "success"
      );

      // Close the modal and trigger refresh
      onClose();
      if (onChanged) onChanged();
    } catch (error) {
      console.error("Failed to create album series:", error);
      window.showNotification("Failed to create album series", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const togglePreexisting = async (it) => {
    const key = getKey(it);
    const newVal = !it.pre_existing;

    // Update local state immediately
    setItems((prev) =>
      prev.map((item) =>
        item.spotify_track_id === it.spotify_track_id
          ? { ...item, pre_existing: newVal }
          : item
      )
    );

    setRowLoading((p) => ({ ...p, [key]: true }));

    if (createMode) {
      // In create mode, just update local state - no API call needed
      setRowLoading((p) => ({ ...p, [key]: false }));
      return;
    }

    try {
      await apiPost(`/album-series/${seriesId}/preexisting`, {
        updates: [
          {
            spotify_track_id: it.spotify_track_id || null,
            title_clean: it.title_clean,
            pre_existing: newVal,
          },
        ],
      });
      // Do not call onChanged here; no need to refresh background lists
    } catch (e) {
      // revert on failure
      setItems((prev) =>
        prev.map((item) =>
          item.spotify_track_id === it.spotify_track_id
            ? { ...item, pre_existing: !newVal }
            : item
        )
      );
      console.error("Failed to update preexisting status", e);
    } finally {
      setRowLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const toggleIrrelevant = async (it) => {
    const key = getKey(it);
    const newVal = !it.irrelevant;

    // Update local state immediately
    setItems((prev) =>
      prev.map((item) =>
        item.spotify_track_id === it.spotify_track_id
          ? { ...item, irrelevant: newVal }
          : item
      )
    );

    setRowLoading((p) => ({ ...p, [key]: true }));

    if (createMode) {
      // In create mode, just update local state - no API call needed
      setRowLoading((p) => ({ ...p, [key]: false }));
      return;
    }

    try {
      await apiPost(`/album-series/${seriesId}/irrelevant`, {
        updates: [
          {
            spotify_track_id: it.spotify_track_id || null,
            title_clean: it.title_clean,
            irrelevant: newVal,
          },
        ],
      });
    } catch (e) {
      // revert on failure
      setItems((prev) =>
        prev.map((item) =>
          item.spotify_track_id === it.spotify_track_id
            ? { ...item, irrelevant: !newVal }
            : item
        )
      );
      console.error("Failed to update irrelevant status", e);
    } finally {
      setRowLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const markDiscIrrelevant = async (discNumber) => {
    if (createMode) return;

    try {
      await apiPost(`/album-series/${seriesId}/disc-action`, {
        disc_number: discNumber,
        action: "mark_irrelevant",
      });

      // Update local state for all tracks in this disc
      setItems((prev) =>
        prev.map((item) =>
          item.disc_number === discNumber ? { ...item, irrelevant: true } : item
        )
      );
    } catch (e) {
      console.error("Failed to mark disc as irrelevant", e);
    }
  };

  const unmarkDiscIrrelevant = async (discNumber) => {
    if (createMode) return;

    try {
      await apiPost(`/album-series/${seriesId}/disc-action`, {
        disc_number: discNumber,
        action: "unmark_irrelevant",
      });

      // Update local state for all tracks in this disc
      setItems((prev) =>
        prev.map((item) =>
          item.disc_number === discNumber
            ? { ...item, irrelevant: false }
            : item
        )
      );
    } catch (e) {
      console.error("Failed to unmark disc as irrelevant", e);
    }
  };

  const addTrack = async (it) => {
    const key = getKey(it);
    setRowLoading((p) => ({ ...p, [key]: true }));
    try {
      await apiPost(`/album-series/${seriesId}/add-missing`, {
        tracks: [{ title: it.title_clean, year: null }],
        pack_id: packId,
      });
      // Invalidate global cache so parent refreshes
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("songs-invalidate-cache"));
      }
      if (onChanged) await onChanged();
      await reload();
    } catch (e) {
      console.error("Failed to add track", e);
    } finally {
      setRowLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const linkToExisting = async (it, songId) => {
    const key = getKey(it);
    setRowLoading((p) => ({ ...p, [key]: true }));
    try {
      await apiPost(`/album-series/${seriesId}/override`, {
        spotify_track_id: it.spotify_track_id || null,
        title_clean: it.title_clean,
        linked_song_id: songId,
      });
      setLinkingKey(null);
      // Update UI: mark as in pack using chosen song's status
      await reload();
    } catch (e) {
      console.error("Failed to set override", e);
    } finally {
      setRowLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const renderStatus = (it) => {
    // Official DLC (from Rock Band DLC table) - highest priority
    if (it.official) {
      return statusPill("Official DLC", colors.released);
    }

    // Preexisting songs (user-marked as already done)
    if (it.pre_existing) {
      return statusPill("Already Done", colors.pre);
    }

    const statusText = (it.status || "").toLowerCase();

    // If the backend says it's released (even if not in this pack), show Released
    if (statusText.includes("released")) {
      return statusPill("Released", colors.released);
    }

    // Check for other statuses regardless of in_pack status
    if (statusText.includes("progress")) {
      return statusPill("In Progress", colors.inProgress);
    }
    if (statusText.includes("wip")) {
      return statusPill("WIP", colors.planned);
    }
    if (statusText.includes("future")) {
      return statusPill("Future Plans", colors.planned);
    }

    // Songs in pack - check other statuses
    if (it.in_pack) {
      if (statusText) {
        return statusPill(it.status, colors.done);
      }
      return statusPill("In Pack", colors.done);
    }

    return statusPill("Missing", colors.missing);
  };

  const statusPill = (text, color) => (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: color.bg,
        color: color.fg,
      }}
    >
      {text}
    </span>
  );

  const colors = {
    missing: { bg: "#fff1e6", fg: "#b84e00" },
    pre: { bg: "#fff9db", fg: "#8a6d00" },
    released: { bg: "#e6f4ff", fg: "#0b63b3" },
    done: { bg: "#e6fbf0", fg: "#0f7a42" },
    inProgress: { bg: "#fff4e6", fg: "#a85d00" },
    planned: { bg: "#f1e6ff", fg: "#5a2ea6" },
    optional: { bg: "#f0f4f8", fg: "#3a5166" },
    add: { bg: "#0d6efd", fg: "#fff" },
    toggle: { bg: "#f5f5f6", fg: "#444" },
    toggleOn: { bg: "#fff4cc", fg: "#614700" },
  };

  const button = (label, onClick, style = {}, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: 0,
        borderRadius: 6,
        padding: "6px 10px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
        ...style,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );

  const pillToggle = (label, active, onClick, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "1px solid #e6e6e8",
        background: active ? colors.toggleOn.bg : "#fff",
        color: active ? colors.toggleOn.fg : colors.toggle.fg,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 12,
          minWidth: 640,
          maxWidth: 980,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <strong style={{ fontSize: 18 }}>
            {createMode
              ? `Create Album Series: ${createData?.albumName || "Unknown"}`
              : "Edit Album Series"}
          </strong>
          <div style={{ display: "flex", gap: 8 }}>
            {createMode && (
              <button
                onClick={handleSave}
                disabled={isCreating}
                style={{
                  border: 0,
                  background: isCreating ? "#ccc" : "#28a745",
                  color: "white",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: isCreating ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {isCreating ? "Creating..." : "Save"}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                border: 0,
                background: "#eee",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>

        {seriesList.length > 1 && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ marginRight: 8 }}>Series:</label>
            <select
              value={seriesId || ""}
              onChange={(e) => setSeriesId(parseInt(e.target.value, 10))}
            >
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number ? `#${s.number} – ${s.name}` : s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Coverage */}
        <div style={{ margin: "8px 0 16px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span style={{ fontWeight: 600, color: "#333" }}>
              Album coverage:
            </span>
            <span style={{ fontWeight: 700 }}>{coverage.percent}%</span>
            <span style={{ color: "#666" }}>
              ({coverage.covered}/{coverage.total})
            </span>
            {items.filter((item) => item.irrelevant).length > 0 && (
              <span style={{ color: "#999", fontSize: "0.9em" }}>
                • {items.filter((item) => item.irrelevant).length} irrelevant
              </span>
            )}
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 6,
              background: "#eee",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${coverage.percent}%`,
                height: "100%",
                background: "#0d6efd",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        {loading ? (
          <div>Loading tracklist…</div>
        ) : (
          <div>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr style={{ background: "#f7f7f8" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 8,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 8,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 8,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: 8,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    Preexisting
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      padding: 8,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    Irrelevant
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: 8,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(itemsByDisc).map(([discNumber, discItems]) => (
                  <React.Fragment key={discNumber}>
                    {/* Disc Header */}
                    {Object.keys(itemsByDisc).length > 1 && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            background: "#e8f4fd",
                            padding: "12px 8px",
                            borderTop: "2px solid #b3d9ff",
                            borderBottom: "1px solid #b3d9ff",
                            fontWeight: "bold",
                            fontSize: "14px",
                            color: "#1a4a6b",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                            }}
                          >
                            <span>💿 Disc {discNumber}</span>
                            {!createMode && (
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() =>
                                    markDiscIrrelevant(parseInt(discNumber))
                                  }
                                  style={{
                                    border: "1px solid #f1b0b7",
                                    background: "#fff",
                                    color: "#b02a37",
                                    borderRadius: 999,
                                    padding: "6px 12px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#fff5f5")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "#fff")
                                  }
                                  title="Mark entire disc as irrelevant"
                                >
                                  🚫 Mark Disc Irrelevant
                                </button>
                                <button
                                  onClick={() =>
                                    unmarkDiscIrrelevant(parseInt(discNumber))
                                  }
                                  style={{
                                    border: "1px solid #a9e5b1",
                                    background: "#fff",
                                    color: "#2e7d32",
                                    borderRadius: 999,
                                    padding: "6px 12px",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "#f0fff4")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "#fff")
                                  }
                                  title="Unmark entire disc as irrelevant"
                                >
                                  ↩ Unmark Disc
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Songs in this disc */}
                    {discItems.map((it) => {
                      const key = getKey(it);
                      const inPack = it.in_pack;
                      const isPreexisting = !!it.pre_existing;
                      const busy = !!rowLoading[key];
                      return (
                        <React.Fragment key={key}>
                          <tr
                            style={{
                              borderBottom: "1px solid #f0f0f0",
                              opacity: it.irrelevant ? 0.5 : 1,
                              backgroundColor: it.irrelevant
                                ? "#f8f9fa"
                                : "transparent",
                            }}
                          >
                            <td style={{ padding: 8, color: "#666" }}>
                              {it.track_number || ""}
                            </td>
                            <td style={{ padding: 8 }}>{it.title_clean}</td>
                            <td
                              style={{
                                padding: 8,
                                width: 140,
                                minWidth: 140,
                                whiteSpace: "nowrap",
                                textAlign: "center",
                              }}
                            >
                              {renderStatus(it)}
                            </td>
                            <td
                              style={{
                                padding: 4,
                                textAlign: "center",
                                minWidth: 100,
                              }}
                            >
                              {!it.official &&
                                !it.pre_existing &&
                                !isReleased(it) && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {pillToggle(
                                      "Preexisting",
                                      isPreexisting,
                                      () => togglePreexisting(it),
                                      busy
                                    )}
                                  </div>
                                )}
                              {it.pre_existing && !it.official && (
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "center",
                                  }}
                                >
                                  <button
                                    onClick={() => togglePreexisting(it)}
                                    disabled={busy}
                                    style={{
                                      border: "1px solid #f5c2c7",
                                      background: "#fff5f5",
                                      color: "#b02a37",
                                      borderRadius: 999,
                                      padding: "4px 10px",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: busy ? "not-allowed" : "pointer",
                                    }}
                                    title="Unmark as preexisting"
                                  >
                                    Unmark
                                  </button>
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                padding: 4,
                                textAlign: "center",
                                minWidth: 100,
                              }}
                            >
                              {!it.official &&
                                !it.pre_existing &&
                                !isReleased(it) && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <button
                                      onClick={() => toggleIrrelevant(it)}
                                      disabled={busy}
                                      style={{
                                        border: it.irrelevant
                                          ? "1px solid #f5c2c7"
                                          : "1px solid #e6e6e8",
                                        background: it.irrelevant
                                          ? "#fff5f5"
                                          : "#fff",
                                        color: it.irrelevant
                                          ? "#b02a37"
                                          : "#555",
                                        borderRadius: 999,
                                        padding: "4px 10px",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: busy
                                          ? "not-allowed"
                                          : "pointer",
                                      }}
                                      title={
                                        it.irrelevant
                                          ? "Marked as irrelevant"
                                          : "Mark as irrelevant"
                                      }
                                    >
                                      Irrelevant
                                    </button>
                                  </div>
                                )}
                            </td>
                            <td
                              style={{
                                padding: 4,
                                minWidth: 100,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {/* Add/Delete action */}
                                {!it.official &&
                                !it.pre_existing &&
                                !isReleased(it) &&
                                inPack
                                  ? button(
                                      "🗑️",
                                      async () => {
                                        try {
                                          if (!it.song_id) return;
                                          let proceed = true;
                                          const hasProgress = (it.status || "")
                                            .toLowerCase()
                                            .includes("progress");
                                          if (hasProgress) {
                                            proceed = window.confirm(
                                              "This song is already in progress. Are you sure you want to delete it from the pack?"
                                            );
                                          }
                                          if (!proceed) return;

                                          if (
                                            createMode &&
                                            it.song_id.startsWith("temp_")
                                          ) {
                                            // In create mode, just remove from local state for temporary songs
                                            setItems((prev) =>
                                              prev.map((item) =>
                                                item.spotify_track_id ===
                                                it.spotify_track_id
                                                  ? {
                                                      ...item,
                                                      in_pack: false,
                                                      song_id: null,
                                                    }
                                                  : item
                                              )
                                            );
                                          } else {
                                            // Normal delete for existing songs
                                            await apiDelete(
                                              `/songs/${it.song_id}`
                                            );
                                            if (onChanged) await onChanged();
                                            await reload();
                                          }
                                        } catch (err) {
                                          console.error(
                                            "Failed to delete song",
                                            err
                                          );
                                        }
                                      },
                                      {
                                        background: "#f8d7da",
                                        color: "#842029",
                                      },
                                      busy
                                    )
                                  : !it.official &&
                                    !it.pre_existing &&
                                    !isReleased(it) && (
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          gap: 6,
                                          alignItems: "center",
                                        }}
                                      >
                                        {createMode ? (
                                          // In create mode, show only the green "+" button
                                          <button
                                            title="Create song"
                                            onClick={() => {
                                              // In create mode, mark this track as selected for creation
                                              setItems((prev) =>
                                                prev.map((item) =>
                                                  item.spotify_track_id ===
                                                  it.spotify_track_id
                                                    ? {
                                                        ...item,
                                                        in_pack: true,
                                                        song_id: `temp_${it.spotify_track_id}`,
                                                      }
                                                    : item
                                                )
                                              );
                                            }}
                                            style={{
                                              border: "1px solid #28a745",
                                              background: "#28a745",
                                              color: "#fff",
                                              borderRadius: 6,
                                              padding: "6px 10px",
                                              fontSize: 12,
                                              cursor: "pointer",
                                              fontWeight: 600,
                                            }}
                                            aria-label="Create song"
                                          >
                                            ➕
                                          </button>
                                        ) : (
                                          // In edit mode, show the blue "Add" button and link icon
                                          <>
                                            {button(
                                              "➕",
                                              () => addTrack(it),
                                              {
                                                background: "#28a745",
                                                color: "#fff",
                                                padding: "6px 10px",
                                              },
                                              busy || it.official
                                            )}
                                            {linkCandidates.length > 0 && (
                                              <button
                                                title="Link to existing"
                                                onClick={() =>
                                                  setLinkingKey(
                                                    linkingKey === key
                                                      ? null
                                                      : key
                                                  )
                                                }
                                                style={{
                                                  border: "1px solid #e6e6e8",
                                                  background: "#fff",
                                                  color: "#555",
                                                  borderRadius: 6,
                                                  padding: "4px 6px",
                                                  fontSize: 12,
                                                  cursor: "pointer",
                                                }}
                                                aria-label="Link to existing"
                                              >
                                                🔗
                                              </button>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                              </div>
                            </td>
                          </tr>
                          {linkingKey === key && (
                            <tr>
                              <td
                                colSpan={4}
                                style={{ padding: 8, background: "#fafafa" }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <button
                                    onClick={() => setLinkingKey(null)}
                                    style={{
                                      border: 0,
                                      background: "#eee",
                                      borderRadius: 6,
                                      padding: "6px 10px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Close
                                  </button>
                                </div>
                                <div
                                  style={{
                                    marginTop: 8,
                                    maxHeight: 220,
                                    overflow: "auto",
                                    border: "1px solid #eee",
                                    borderRadius: 6,
                                  }}
                                >
                                  {linkCandidates.length === 0 ? (
                                    <div style={{ padding: 8, color: "#777" }}>
                                      No linkable songs available
                                    </div>
                                  ) : (
                                    linkCandidates.map((s) => (
                                      <div
                                        key={s.id}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          padding: "6px 10px",
                                          borderBottom: "1px solid #f2f2f2",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                          }}
                                        >
                                          {s.album_cover && (
                                            <img
                                              src={s.album_cover}
                                              alt=""
                                              style={{
                                                width: 28,
                                                height: 28,
                                                objectFit: "cover",
                                                borderRadius: 4,
                                              }}
                                            />
                                          )}
                                          <div>
                                            <div
                                              style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                              }}
                                            >
                                              {s.title}
                                            </div>
                                            <div
                                              style={{
                                                fontSize: 12,
                                                color: "#777",
                                              }}
                                            >
                                              {s.artist}
                                            </div>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() =>
                                            linkToExisting(it, s.id)
                                          }
                                          style={{
                                            border: 0,
                                            background: "#0d6efd",
                                            color: "#fff",
                                            borderRadius: 6,
                                            padding: "4px 8px",
                                            cursor: "pointer",
                                            fontSize: 12,
                                          }}
                                        >
                                          Link
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
