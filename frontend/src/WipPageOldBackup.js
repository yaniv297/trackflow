import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "./contexts/AuthContext";
import WipSongCard from "./components/WipSongCard";
import Fireworks from "./components/Fireworks";
import CustomAlert from "./components/CustomAlert";
import UnifiedCollaborationModal from "./components/UnifiedCollaborationModal";
import { apiGet, apiPost, apiDelete, apiPatch } from "./utils/api";

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

function WipPage() {
  const { user } = useAuth();
  const [songs, setSongs] = useState([]);
  const [newSongData, setNewSongData] = useState({});

  const [collapsedPacks, setCollapsedPacks] = useState({});
  const [showAddForm, setShowAddForm] = useState(null);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [showAlbumSeriesModal, setShowAlbumSeriesModal] = useState(false);
  const [albumSeriesForm, setAlbumSeriesForm] = useState({
    artist_name: "",
    album_name: "",
    year: "",
    cover_image_url: "",
    description: "",
  });
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [selectedItemForCollaboration, setSelectedItemForCollaboration] =
    useState(null);
  const [collaborationType, setCollaborationType] = useState("pack");
  const [userCollaborations, setUserCollaborations] = useState([]);
  const [collaborationsOnMyPacks, setCollaborationsOnMyPacks] = useState([]);
  const [fireworksTrigger, setFireworksTrigger] = useState(0);

  // Helper function to get list of collaborating users for a pack
  const getPackCollaborators = (packId, validSongsInPack) => {
    if (!packId) return null;

    const collaborators = new Set();

    // Check if current user is a collaborator - add pack owner
    const isCollaborator = userCollaborations.some(
      (collab) =>
        collab.pack_id === packId &&
        (collab.collaboration_type === "pack_view" ||
          collab.collaboration_type === "pack_edit")
    );

    if (isCollaborator) {
      const packOwner =
        validSongsInPack[0]?.pack_owner_username ||
        validSongsInPack[0]?.author ||
        "unknown";
      collaborators.add(packOwner);
    }

    // Check if current user owns pack - add all collaborators
    const myPackCollabs = collaborationsOnMyPacks.filter(
      (collab) =>
        collab.pack_id === packId &&
        (collab.collaboration_type === "pack_view" ||
          collab.collaboration_type === "pack_edit")
    );

    myPackCollabs.forEach((collab) => {
      collaborators.add(collab.username);
    });

    // Also check for individual song collaborations within this pack
    // Look through songs in the pack for any that have collaborations
    validSongsInPack.forEach((song) => {
      if (song.collaborations && song.collaborations.length > 0) {
        song.collaborations.forEach((collab) => {
          if (collab.collaboration_type === "song_edit") {
            collaborators.add(collab.username);
          }
        });
      }
    });

    // Filter out current user - you don't collaborate with yourself
    collaborators.delete(user?.username);

    return collaborators.size > 0 ? Array.from(collaborators) : null;
  };
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning",
  });

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
    apiGet("/songs/?status=In%20Progress")
      .then((data) => {
        setSongs(data);
        // Collapse all packs by default after loading songs
        const packs = Array.from(
          new Set(data.map((s) => s.pack_name || "(no pack)"))
        );
        const collapsed = {};
        packs.forEach((p) => {
          collapsed[p] = true;
        });
        setCollapsedPacks(collapsed);
      })
      .catch((error) => {
        console.error("Failed to load songs:", error);
        setSongs([]);
      });
  }, []);

  // Load user collaborations for the current user
  useEffect(() => {
    if (user) {
      // Fetch collaborations where current user is a collaborator
      apiGet("/collaborations/my-collaborations")
        .then((data) => {
          console.log("WipPage - Loaded user collaborations:", data);
          setUserCollaborations(data);
        })
        .catch((err) =>
          console.error("Failed to fetch user collaborations:", err)
        );

      // Fetch collaborations on packs owned by current user
      apiGet("/collaborations/on-my-packs")
        .then((data) => {
          console.log("WipPage - Loaded collaborations on my packs:", data);
          setCollaborationsOnMyPacks(data);
        })
        .catch((err) =>
          console.error("Failed to fetch collaborations on my packs:", err)
        );
    }
  }, [user]);

  const grouped = useMemo(() => {
    const getFilledCount = (song) =>
      authoringFields.filter((f) => song.authoring?.[f]).length;

    const groups = {};
    for (const song of songs) {
      // For songs in album series, use the album series pack name
      let key;
      if (song.album_series_id && song.album_series_name) {
        // Use album series pack name if available, otherwise construct it
        key =
          song.pack_name ||
          `Album Series #${song.album_series_number || "N/A"}: ${
            song.album_series_name
          }`;
      } else {
        // Use pack_name if available, otherwise fall back to pack string
        key = song.pack_name || "(no pack)";
      }

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
  }, [songs, authoringFields]);

  const releasePack = (pack) => {
    apiPost(`/songs/release-pack/?pack=${encodeURIComponent(pack)}`)
      .then(() => {
        setSongs((prev) => prev.filter((s) => s.pack_name !== pack));
        // Trigger fireworks when pack is released! 🎆
        setFireworksTrigger((prev) => prev + 1);
      })
      .catch((error) => {
        console.error("Failed to release pack:", error);
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
        const options = await apiGet(`/spotify/${song.id}/spotify-options/`);
        const firstOption = options[0];
        if (!firstOption) continue;

        await apiPost(`/spotify/${song.id}/enhance`, {
          track_id: firstOption.track_id,
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
    setAlertConfig({
      isOpen: true,
      title: "Delete Song",
      message:
        "Are you sure you want to delete this song? This action cannot be undone.",
      onConfirm: () => {
        apiDelete(`/songs/${songId}/`)
          .then(() => {
            setSongs((prev) => prev.filter((s) => s.id !== songId));
            window.showNotification("Song deleted successfully", "success");
          })
          .catch((err) => window.showNotification(err.message, "error"));
      },
      type: "danger",
    });
  };

  const updateAuthoringField = (songId, field, value) => {
    setSongs((prev) => {
      const updated = prev.map((song) =>
        song.id === songId
          ? { ...song, authoring: { ...song.authoring, [field]: value } }
          : song
      );

      // Check if this song just became complete
      const song = updated.find((s) => s.id === songId);
      if (song && song.authoring) {
        const completedFields = authoringFields.filter(
          (f) => song.authoring[f]
        ).length;
        const wasComplete =
          authoringFields.filter((f) => song.authoring?.[f]).length ===
          authoringFields.length;
        const isNowComplete = completedFields === authoringFields.length;

        // If song just became complete, trigger fireworks
        if (!wasComplete && isNowComplete) {
          setFireworksTrigger((prev) => prev + 1);
        }
      }

      return updated;
    });
  };

  const toggleOptional = (songId, isCurrentlyOptional) => {
    apiPatch(`/songs/${songId}/`, { optional: !isCurrentlyOptional })
      .then((updated) =>
        setSongs((prev) =>
          prev.map((s) => (s.id === songId ? { ...s, ...updated } : s))
        )
      )
      .catch((err) =>
        window.showNotification("Failed to update optional status", "error")
      );
  };

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
    if (!firstSong || !firstSong.pack_name) {
      window.showNotification(
        "Selected songs must be from the same pack.",
        "warning"
      );
      return;
    }

    try {
      const response = await apiPost("/album-series/create-from-pack", {
        pack_name: firstSong.pack_name,
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
      });

      if (!response.ok) {
        throw new Error("Failed to create album series");
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
      apiGet("/songs/?status=In%20Progress")
        .then((data) => setSongs(data))
        .catch((error) => {
          console.error("Failed to refresh songs:", error);
        });
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
      (song) => song.pack_name === packName && song.album === secondAlbumName
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
          apiPatch(`/songs/${songId}/`, { pack: newPackName })
        )
      );

      // Create album series for the second album
      const response = await apiPost("/album-series/create-from-pack", {
        pack_name: newPackName,
        artist_name: mostCommonArtist,
        album_name: secondAlbumName,
        year: null,
        cover_image_url: null,
        description: null,
      });

      window.showNotification(
        `✅ Double album series created! "${secondAlbumName}" split into its own album series with ${secondAlbumCount} songs.`,
        "success"
      );

      // Refresh songs to show the updated structure
      apiGet(`/songs/?status=In%20Progress`)
        .then((data) => setSongs(data))
        .catch((error) => {
          console.error("Failed to refresh songs:", error);
        });
    } catch (error) {
      console.error("Error creating double album series:", error);
      window.showNotification("Failed to create double album series.", "error");
    }
  };

  const addSongToPack = async (packName, songData) => {
    const payload = {
      ...songData,
      pack: packName,
      status: "In Progress",
    };

    try {
      const newSong = await apiPost("/songs/", payload);

      // Automatically enhance from Spotify (top match)
      let enhancedSong = newSong;
      try {
        const options = await apiGet(`/spotify/${newSong.id}/spotify-options/`);
        if (Array.isArray(options) && options.length > 0) {
          await apiPost(`/spotify/${newSong.id}/enhance`, {
            track_id: options[0].track_id,
          });

          // Clean remaster tags
          await apiPost("/tools/bulk-clean", [newSong.id]);

          // Fetch the updated song
          const allSongs = await apiGet("/songs/?status=In%20Progress");
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
      <Fireworks trigger={fireworksTrigger} />
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

        const uniqueSeries = Array.from(
          new Set(allSongs.map((s) => s.album_series_id).filter(Boolean))
        );

        // Filter series to only include those with at least 4 songs
        const seriesWithThreshold = uniqueSeries.filter((seriesId) => {
          const songsInThisSeries = allSongs.filter(
            (song) => song.album_series_id === seriesId
          );
          return songsInThisSeries.length >= 4;
        });

        const seriesInfo = seriesWithThreshold
          .map((id) => {
            const s = allSongs.find((song) => song.album_series_id === id);
            return s
              ? { id, number: s.album_series_number, name: s.album_series_name }
              : null;
          })
          .filter(Boolean);

        seriesInfo.sort((a, b) => a.number - b.number);

        // Check for double album series opportunity
        const albumCounts = {};
        allSongs.forEach((song) => {
          if (song.album && !song.optional) {
            albumCounts[song.album] = (albumCounts[song.album] || 0) + 1;
          }
        });

        // Find albums with 5+ songs
        const albumsWithEnoughSongs = Object.entries(albumCounts)
          .filter(([album, count]) => count >= 5)
          .sort((a, b) => b[1] - a[1]); // Sort by count descending

        // Check if we have an existing album series AND another album with 5+ songs
        const hasExistingSeries = seriesWithThreshold.length > 0;
        const hasSecondAlbum = albumsWithEnoughSongs.length >= 2;
        const canMakeDoubleAlbumSeries = hasExistingSeries && hasSecondAlbum;

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
              {seriesWithThreshold.length === 1 ? (
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
                  title={`Album Series #${seriesInfo[0].number}: ${seriesInfo[0].name}`}
                >
                  <span style={{ fontSize: "1.1em", marginRight: 4 }}>📀</span>
                  Album Series #{seriesInfo[0].number}: {seriesInfo[0].name}
                </a>
              ) : seriesWithThreshold.length === 2 ? (
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
                        padding: "0.15rem 0.7rem 0.15rem 0.5rem",
                        fontWeight: 600,
                        fontSize: "1.08em",
                        boxShadow: "0 1px 4px rgba(26,35,126,0.07)",
                        transition: "background 0.2s",
                        marginRight: idx === 0 ? 8 : 0,
                      }}
                      title={`Album Series #${info.number}: ${info.name}`}
                    >
                      <span style={{ fontSize: "1.1em", marginRight: 4 }}>
                        📀
                      </span>
                      Album Series #{info.number}: {info.name}
                    </a>
                  ))}
                </>
              ) : (
                <div>
                  <span>
                    {`${packName} (${totalSongs} song${
                      totalSongs !== 1 ? "s" : ""
                    })`}
                  </span>
                  {(() => {
                    // For album series, get pack_id from the album series relationship
                    let packId = grouped.find((p) => p.pack === packName)
                      ?.allSongs[0]?.pack_id;

                    if (
                      grouped.find((p) => p.pack === packName)?.allSongs[0]
                        ?.album_series_id &&
                      !packId
                    ) {
                      // If we have an album series but no pack_id, try to get it from the album series
                      const albumSeriesSong = grouped
                        .find((p) => p.pack === packName)
                        ?.allSongs.find((s) => s.album_series_id);
                      if (albumSeriesSong) {
                        packId = albumSeriesSong.pack_id;
                      }
                    }

                    const validSongsInPack =
                      grouped.find((p) => p.pack === packName)?.allSongs || [];
                    const collaborators = getPackCollaborators(
                      packId,
                      validSongsInPack
                    );

                    if (collaborators && collaborators.length > 0) {
                      return (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "#666",
                            fontStyle: "italic",
                            marginTop: "0.15rem",
                          }}
                        >
                          Collaboration with: {collaborators.join(", ")}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
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
              {/* Action Buttons */}
              <div
                style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}
              >
                {/* Manage Collaborations Button - Only show for pack owners */}
                {grouped.find((p) => p.pack === packName)?.allSongs[0]
                  ?.pack_owner_id === user?.id && (
                  <button
                    onClick={() => {
                      // Get pack_id from the first song in the pack
                      let packId = grouped.find((p) => p.pack === packName)
                        ?.allSongs[0]?.pack_id;

                      if (
                        grouped.find((p) => p.pack === packName)?.allSongs[0]
                          ?.album_series_id &&
                        !packId
                      ) {
                        // If we have an album series but no pack_id, try to get it from the album series
                        const albumSeriesSong = grouped
                          .find((p) => p.pack === packName)
                          ?.allSongs.find((s) => s.album_series_id);
                        if (albumSeriesSong) {
                          packId = albumSeriesSong.pack_id;
                        }
                      }

                      if (packId) {
                        setSelectedItemForCollaboration({
                          id: packId,
                          name: packName,
                        });
                        setCollaborationType("pack");
                        setShowCollaborationModal(true);
                      }
                    }}
                    style={{
                      background: "#17a2b8",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      fontWeight: 500,
                    }}
                    title="Manage collaborations for this pack"
                  >
                    👥 Manage Collaborations
                  </button>
                )}

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
                  }}
                  title="Add song to this pack"
                >
                  +
                </button>
              </div>
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

                {/* Pack Action Buttons - Only shown when expanded */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid #eee",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Bulk Enhance Button */}
                  <button
                    onClick={() => bulkEnhancePack(allSongs)}
                    style={{
                      background: "#f3f4f6",
                      color: "#222",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      padding: "0.25rem 0.75rem",
                      fontWeight: 500,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      transition: "background 0.2s, border 0.2s",
                    }}
                    title="Enhance all songs in this pack with Spotify data"
                  >
                    🔍 Bulk Enhance
                  </button>

                  {/* Release Pack Button - Only shown when pack is complete */}
                  {percent === 100 && (
                    <button
                      onClick={() => releasePack(packName)}
                      style={{
                        background: "#28a745",
                        color: "white",
                        border: "1px solid #1e7e34",
                        borderRadius: "4px",
                        padding: "0.25rem 0.75rem",
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        transition: "background 0.2s, border 0.2s",
                      }}
                      title="Release this pack"
                    >
                      🚀 Release Pack
                    </button>
                  )}

                  {/* Create Album Series Button */}
                  {(() => {
                    // Check if we have 4+ songs from the same album
                    const albumCounts = {};
                    allSongs.forEach((song) => {
                      if (song.album && !song.optional) {
                        albumCounts[song.album] =
                          (albumCounts[song.album] || 0) + 1;
                      }
                    });

                    // Check if any album has 4+ songs
                    const hasEnoughSongs = Object.values(albumCounts).some(
                      (count) => count >= 4
                    );

                    return seriesWithThreshold.length === 0 && hasEnoughSongs;
                  })() ? (
                    <button
                      onClick={() => {
                        // Auto-populate form with most common artist and album from pack songs
                        const artistCounts = {};
                        allSongs.forEach((song) => {
                          if (song.artist) {
                            artistCounts[song.artist] =
                              (artistCounts[song.artist] || 0) + 1;
                          }
                        });
                        const mostCommonArtist =
                          Object.keys(artistCounts).reduce(
                            (a, b) =>
                              artistCounts[a] > artistCounts[b] ? a : b,
                            Object.keys(artistCounts)[0]
                          ) || "";

                        const albumCounts = {};
                        allSongs.forEach((song) => {
                          if (song.album && !song.optional) {
                            albumCounts[song.album] =
                              (albumCounts[song.album] || 0) + 1;
                          }
                        });
                        const mostCommonAlbum =
                          Object.keys(albumCounts).reduce(
                            (a, b) => (albumCounts[a] > albumCounts[b] ? a : b),
                            Object.keys(albumCounts)[0]
                          ) || "";

                        const yearCounts = {};
                        allSongs.forEach((song) => {
                          if (song.year) {
                            yearCounts[song.year] =
                              (yearCounts[song.year] || 0) + 1;
                          }
                        });
                        const mostCommonYear =
                          Object.keys(yearCounts).reduce(
                            (a, b) => (yearCounts[a] > yearCounts[b] ? a : b),
                            Object.keys(yearCounts)[0]
                          ) || "";

                        setAlbumSeriesForm({
                          artist_name: mostCommonArtist,
                          album_name: mostCommonAlbum,
                          year: mostCommonYear,
                          cover_image_url: "",
                          description: "",
                        });
                        setSelectedSongs(allSongs.map((s) => s.id));
                        setShowAlbumSeriesModal(true);
                      }}
                      style={{
                        background: "#4CAF50",
                        color: "white",
                        border: "1px solid #45a049",
                        borderRadius: "4px",
                        padding: "0.25rem 0.75rem",
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        transition: "background 0.2s, border 0.2s",
                      }}
                      title="Create an album series from this pack"
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
                        borderRadius: "4px",
                        padding: "0.25rem 0.75rem",
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        transition: "background 0.2s, border 0.2s",
                      }}
                      title={`Split "${albumsWithEnoughSongs[1][0]}" into its own album series (${albumsWithEnoughSongs[1][1]} songs)`}
                    >
                      🎵🎵 Make Double Album Series
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Album Series Creation Modal */}
      {showAlbumSeriesModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "12px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>
              Create Album Series
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
                padding: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}
            >
              <strong>Songs in this pack:</strong>
              <ul style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem" }}>
                {songs
                  .filter((song) => selectedSongs.includes(song.id))
                  .slice(0, 5)
                  .map((song) => (
                    <li key={song.id}>
                      {song.artist} - {song.title}
                    </li>
                  ))}
                {selectedSongs.length > 5 && (
                  <li>... and {selectedSongs.length - 5} more</li>
                )}
              </ul>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Artist Name *
                </label>
                <input
                  type="text"
                  value={albumSeriesForm.artist_name}
                  onChange={(e) =>
                    setAlbumSeriesForm((prev) => ({
                      ...prev,
                      artist_name: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "1rem",
                  }}
                  placeholder="Artist name"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Album Name *
                </label>
                <input
                  type="text"
                  value={albumSeriesForm.album_name}
                  onChange={(e) =>
                    setAlbumSeriesForm((prev) => ({
                      ...prev,
                      album_name: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "1rem",
                  }}
                  placeholder="Album name"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Year
                </label>
                <input
                  type="number"
                  value={albumSeriesForm.year}
                  onChange={(e) =>
                    setAlbumSeriesForm((prev) => ({
                      ...prev,
                      year: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "1rem",
                  }}
                  placeholder="Year (optional)"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={albumSeriesForm.cover_image_url}
                  onChange={(e) =>
                    setAlbumSeriesForm((prev) => ({
                      ...prev,
                      cover_image_url: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "1rem",
                  }}
                  placeholder="Cover image URL (optional)"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: 600,
                  }}
                >
                  Description
                </label>
                <textarea
                  value={albumSeriesForm.description}
                  onChange={(e) =>
                    setAlbumSeriesForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    minHeight: "80px",
                    resize: "vertical",
                  }}
                  placeholder="Description (optional)"
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "2rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setShowAlbumSeriesModal(false);
                  setAlbumSeriesForm({
                    artist_name: "",
                    album_name: "",
                    year: "",
                    cover_image_url: "",
                    description: "",
                  });
                  setSelectedSongs([]);
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAlbumSeries}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: 600,
                }}
              >
                Create Album Series
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Collaboration Modal */}
      <UnifiedCollaborationModal
        packId={
          collaborationType === "pack" ? selectedItemForCollaboration?.id : null
        }
        packName={
          collaborationType === "pack"
            ? selectedItemForCollaboration?.name
            : null
        }
        songId={
          collaborationType === "song" ? selectedItemForCollaboration?.id : null
        }
        songTitle={
          collaborationType === "song"
            ? selectedItemForCollaboration?.name
            : null
        }
        collaborationType={collaborationType}
        isOpen={showCollaborationModal}
        onClose={() => {
          setShowCollaborationModal(false);
          setSelectedItemForCollaboration(null);
        }}
        currentUser={user}
        onCollaborationSaved={() => {
          // Refresh both types of collaborations data and reload songs
          Promise.all([
            apiGet("/collaborations/my-collaborations"),
            apiGet("/collaborations/on-my-packs"),
          ])
            .then(([userCollabs, myPackCollabs]) => {
              console.log(
                "WipPage - Refreshed user collaborations:",
                userCollabs
              );
              console.log(
                "WipPage - Refreshed collaborations on my packs:",
                myPackCollabs
              );
              setUserCollaborations(userCollabs);
              setCollaborationsOnMyPacks(myPackCollabs);
              // Reload songs to get updated permissions
              apiGet("/songs/?status=In%20Progress")
                .then((songsData) => {
                  setSongs(songsData);
                })
                .catch((err) => console.error("Failed to refresh songs:", err));
            })
            .catch((err) =>
              console.error("Failed to refresh collaborations:", err)
            );
        }}
      />

      {/* Custom Alert Modal */}
      <CustomAlert
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
        onConfirm={alertConfig.onConfirm}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}

export default WipPage;
