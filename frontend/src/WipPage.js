import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useWipData } from "./hooks/useWipData";
import WipPageHeader from "./components/WipPageHeader";
import WipPackCard from "./components/WipPackCard";
import CompletionGroupCard from "./components/CompletionGroupCard";
import Fireworks from "./components/Fireworks";
import CustomAlert from "./components/CustomAlert";
import UnifiedCollaborationModal from "./components/UnifiedCollaborationModal";
import LoadingSpinner from "./components/LoadingSpinner";
import { apiGet, apiPost, apiDelete, apiPatch, apiPut } from "./utils/api";
import AlbumSeriesModal from "./components/AlbumSeriesModal";
import AlbumSeriesEditModal from "./components/AlbumSeriesEditModal";
import DoubleAlbumSeriesModal from "./components/DoubleAlbumSeriesModal";

// Utility function to capitalize artist and album names (keeping for compatibility)
// eslint-disable-next-line no-unused-vars
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
        "over",
        "under",
        "around",
        "near",
        "off",
        "out",
        "away",
        "down",
        "since",
        "until",
        "while",
        "although",
        "though",
        "if",
        "unless",
        "because",
        "as",
        "like",
        "than",
        "except",
        "but",
        "or",
        "nor",
        "so",
        "yet",
        "neither",
        "either",
        "both",
        "not",
        "no",
        "any",
        "some",
        "all",
        "each",
        "every",
        "most",
        "few",
        "many",
        "much",
        "more",
        "less",
        "little",
        "big",
        "small",
        "large",
        "great",
        "good",
        "bad",
        "new",
        "old",
        "young",
        "long",
        "short",
        "high",
        "low",
        "wide",
        "narrow",
      ];

      // Only lowercase these words if they're NOT the first word
      if (index > 0 && lowerWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

function WipPage() {
  // console.log("WipPage component rendered");
  const { user } = useAuth();
  const {
    songs,
    setSongs,
    userCollaborations,
    collapsedPacks,
    setCollapsedPacks,
    grouped,
    authoringFields,
    getPackCollaborators,
    refreshCollaborations,
    refreshSongs,
    loading,
  } = useWipData(user);

  // UI State
  const [viewMode, setViewMode] = useState("pack"); // "pack" or "completion"
  const [newSongData, setNewSongData] = useState({});
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
  const [fireworksTrigger, setFireworksTrigger] = useState(0);
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "warning",
  });
  const [editSeriesModal, setEditSeriesModal] = useState({
    open: false,
    packId: null,
    series: [],
    defaultSeriesId: null,
    createMode: false,
    createData: null,
  });
  const [showDoubleAlbumSeriesModal, setShowDoubleAlbumSeriesModal] =
    useState(false);
  const [doubleAlbumSeriesData, setDoubleAlbumSeriesData] = useState(null);
  const [isExecutingDoubleAlbumSeries, setIsExecutingDoubleAlbumSeries] =
    useState(false);

  // Group songs by completion status
  const completionGroups = useMemo(() => {
    const getFilledCount = (song) => {
      if (!song.authoring) return 0;
      return authoringFields.reduce((count, field) => {
        return count + (song.authoring[field] === true ? 1 : 0);
      }, 0);
    };

    const getCompletionPercent = (song) => {
      const filledCount = getFilledCount(song);
      return Math.round((filledCount / authoringFields.length) * 100);
    };

    // Separate songs by category
    const completed = [];
    const inProgress = [];
    const optional = [];
    const collaboratorSongs = [];
    const optionalCollaboratorSongs = [];

    songs.forEach((song) => {
      const isOwner = song.user_id === user?.id;
      const completionPercent = getCompletionPercent(song);

      if (!isOwner) {
        // Songs by collaborators
        if (song.optional) {
          optionalCollaboratorSongs.push({ ...song, completionPercent });
        } else {
          collaboratorSongs.push({ ...song, completionPercent });
        }
      } else if (song.optional) {
        // Optional songs by current user
        optional.push({ ...song, completionPercent });
      } else if (completionPercent === 100) {
        // Completed songs
        completed.push({ ...song, completionPercent });
      } else {
        // In progress songs
        inProgress.push({ ...song, completionPercent });
      }
    });

    // Sort in progress songs by completion percentage (descending)
    inProgress.sort((a, b) => b.completionPercent - a.completionPercent);
    collaboratorSongs.sort((a, b) => b.completionPercent - a.completionPercent);

    return {
      completed,
      inProgress,
      optional,
      collaboratorSongs,
      optionalCollaboratorSongs,
    };
  }, [songs, authoringFields, user]);

  // Option: open the edit modal after creating an album series

  // If a pending request exists (set by NewPackForm), open the editor on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tf_open_edit_series");
      if (raw) {
        const detail = JSON.parse(raw);
        if (
          detail &&
          detail.packId &&
          detail.series &&
          detail.series.length > 0
        ) {
          const evt = new CustomEvent("open-edit-album-series", { detail });
          window.dispatchEvent(evt);
        }
        localStorage.removeItem("tf_open_edit_series");
      }
    } catch (_e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    // console.log("Setting up event listeners in WipPage");

    const handler = (e) => {
      // console.log("Received open-edit-album-series event", e.detail);
      const { packId, series } = e.detail || {};
      setEditSeriesModal({
        open: true,
        packId: packId || null,
        series: series || [],
        defaultSeriesId: series?.[0]?.id || null,
      });
    };

    const createHandler = (e) => {
      // console.log(
      //   "Received open-create-album-series-modal event in WipPage",
      //   e.detail
      // );
      const { artistName, albumName, status } = e.detail || {};
      // console.log("Setting modal state with:", {
      //   artistName,
      //   albumName,
      //   status,
      // });
      setEditSeriesModal({
        open: true,
        packId: null,
        series: [],
        defaultSeriesId: null,
        createMode: true,
        createData: { artistName, albumName, status },
      });
    };

    window.addEventListener("open-edit-album-series", handler);
    window.addEventListener("open-create-album-series-modal", createHandler);
    // console.log("Event listeners registered in WipPage");

    return () => {
      window.removeEventListener("open-edit-album-series", handler);
      window.removeEventListener(
        "open-create-album-series-modal",
        createHandler
      );
      // console.log("Event listeners removed from WipPage");
    };
  }, []);

  // Pack Management
  const togglePack = (packName) => {
    setCollapsedPacks((prev) => ({
      ...prev,
      [packName]: !prev[packName],
    }));
  };

  const toggleAll = () => {
    if (viewMode === "pack") {
      const allCollapsed = grouped.every(({ pack }) => collapsedPacks[pack]);
      const newState = {};
      grouped.forEach(({ pack }) => {
        newState[pack] = !allCollapsed;
      });
      setCollapsedPacks(newState);
    } else {
      // Completion view
      const categories = [
        "completed",
        "inProgress",
        "optional",
        "collaboratorSongs",
        "optionalCollaboratorSongs",
      ];
      const allCollapsed = categories.every((cat) => collapsedPacks[cat]);
      const newState = { ...collapsedPacks };
      categories.forEach((cat) => {
        newState[cat] = !allCollapsed;
      });
      setCollapsedPacks(newState);
    }
  };

  const toggleCategory = (categoryName) => {
    setCollapsedPacks((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  // Song Management
  const updateAuthoringField = (songId, field, value) => {
    setSongs((prev) => {
      const updated = prev.map((song) =>
        song.id === songId
          ? {
              ...song,
              authoring: { ...(song.authoring || {}), [field]: value },
            }
          : song
      );

      const song = updated.find((s) => s.id === songId);
      const completedFields = authoringFields.filter(
        (f) => song.authoring?.[f] === true
      );

      apiPut(`/authoring/${songId}`, { [field]: value }).catch((error) => {
        console.error("Failed to update authoring field:", error);
      });

      if (completedFields.length === authoringFields.length) {
        setFireworksTrigger((prev) => prev + 1);
      }

      return updated;
    });
  };

  const updateSongData = (songId, updatedSongData) => {
    setSongs((prev) =>
      prev.map((song) => {
        if (song.id === songId) {
          // Only update specific fields to avoid overwriting completion status
          const updatedSong = { ...song };

          // Safe fields that can be updated without affecting song status
          const safeFields = [
            "album_cover",
            "title",
            "artist",
            "album",
            "year",
            "notes",
          ];

          safeFields.forEach((field) => {
            if (updatedSongData.hasOwnProperty(field)) {
              updatedSong[field] = updatedSongData[field];
            }
          });

          return updatedSong;
        }
        return song;
      })
    );
  };

  const toggleOptional = async (songId, isCurrentlyOptional) => {
    const newOptionalValue = !isCurrentlyOptional;

    // Optimistic UI update
    setSongs((prev) =>
      prev.map((song) =>
        song.id === songId ? { ...song, optional: newOptionalValue } : song
      )
    );

    try {
      const response = await apiPatch(`/songs/${songId}`, {
        optional: newOptionalValue,
      });

      // Update the local song with the response data to ensure consistency
      setSongs((prev) =>
        prev.map((song) =>
          song.id === songId
            ? { ...song, ...response, optional: newOptionalValue }
            : song
        )
      );

      // Remove the unnecessary full refresh - we already have the updated data
      // refreshSongs();

      window.showNotification(
        `Song marked as ${newOptionalValue ? "optional" : "required"}`,
        "success"
      );
    } catch (error) {
      console.error("Failed to update optional status:", error);
      // Revert the UI change on error
      setSongs((prev) =>
        prev.map((song) =>
          song.id === songId ? { ...song, optional: isCurrentlyOptional } : song
        )
      );
      window.showNotification("Failed to update optional status", "error");
    }
  };

  const handleDeleteSong = (songId) => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Song",
      message:
        "Are you sure you want to delete this song? This action cannot be undone.",
      type: "warning",
      onConfirm: async () => {
        try {
          await apiDelete(`/songs/${songId}`);
          setSongs((prev) => prev.filter((song) => song.id !== songId));
          window.showNotification("Song deleted successfully", "success");
        } catch (error) {
          console.error("Failed to delete song:", error);
          window.showNotification("Failed to delete song", "error");
        }
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeletePack = async (packName, packId) => {
    setAlertConfig({
      isOpen: true,
      title: "Delete Pack",
      message: `Are you sure you want to delete "${packName}"? This will permanently delete the pack and all songs in it.`,
      onConfirm: async () => {
        try {
          // Delete the pack using the proper backend endpoint (this will cascade delete songs and album series)
          await apiDelete(`/packs/${packId}`);

          // Remove songs from current view (optimistic update)
          setSongs((prev) =>
            prev.filter((song) => (song.pack_name || "(no pack)") !== packName)
          );

          window.showNotification(
            `Pack "${packName}" deleted successfully`,
            "success"
          );
        } catch (error) {
          console.error("Failed to delete pack:", error);
          window.showNotification("Failed to delete pack", "error");
        }
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
      },
      type: "danger",
    });
  };

  const releasePack = (pack) => {
    setAlertConfig({
      isOpen: true,
      title: "Release Pack",
      message: `Are you sure you want to release "${pack}"? This will move completed songs to "Released" status and move incomplete optional songs back to "Future Plans" with a new pack name. Any album series associated with this pack will also be released and assigned a series number.`,
      type: "warning",
      onConfirm: async () => {
        try {
          const packSongs = songs.filter(
            (s) => (s.pack_name || "(no pack)") === pack
          );

          // Call the pack release endpoint
          const response = await apiPost(
            `/songs/release-pack?pack_name=${encodeURIComponent(pack)}`
          );

          // Handle the response
          if (response.details) {
            const {
              completed_songs,
              optional_songs,
              optional_pack_name,
              released_series,
            } = response.details;

            // Optimistic update - remove songs from current view (they're now in Released or Future Plans)
            setSongs((prev) =>
              prev.filter(
                (song) => !packSongs.some((packSong) => packSong.id === song.id)
              )
            );

            // Show detailed notification
            let message = `Pack "${pack}" released successfully!`;
            if (completed_songs > 0) {
              message += ` ${completed_songs} song(s) moved to Released.`;
            }
            if (optional_songs > 0) {
              message += ` ${optional_songs} optional song(s) moved to Future Plans in pack "${optional_pack_name}".`;
            }
            if (released_series && released_series.length > 0) {
              const seriesInfo = released_series
                .map((s) => `#${s.series_number} ${s.name}`)
                .join(", ");
              message += ` Album series ${seriesInfo} released!`;
            }

            window.showNotification(message, "success");
          } else {
            // All songs were completed
            setSongs((prev) =>
              prev.filter(
                (song) => !packSongs.some((packSong) => packSong.id === song.id)
              )
            );
            window.showNotification(
              `Pack "${pack}" released successfully!`,
              "success"
            );
          }

          setFireworksTrigger((prev) => prev + 1);
        } catch (error) {
          console.error("Failed to release pack:", error);
          window.showNotification("Failed to release pack", "error");
        }
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const addSongToPack = async (packId, songData) => {
    try {
      if (!songData.title || !songData.artist) {
        window.showNotification(
          "Please fill in song title and artist",
          "error"
        );
        return;
      }

      const payload = {
        title: songData.title,
        artist: songData.artist,
        pack_id: packId, // Use pack_id instead of pack_name
        status: "In Progress",
      };

      const newSong = await apiPost("/songs/", payload);

      // Note: Spotify enhancement happens automatically on the backend
      // No need for manual enhancement call

      const allSongs = await apiGet("/songs/?status=In%20Progress");
      const found = allSongs.find((s) => s.id === newSong.id);
      if (found) {
        setSongs((prev) => [...prev, found]);
      }

      setShowAddForm(null);
      setNewSongData({});
      window.showNotification(`Added "${songData.title}" to pack`, "success");
    } catch (error) {
      window.showNotification(error.message, "error");
    }
  };

  // Album Series Management
  const handleCreateAlbumSeries = async () => {
    if (selectedSongs.length === 0) {
      window.showNotification("Please select songs first", "warning");
      return;
    }

    try {
      const firstSong = songs.find((song) => song.id === selectedSongs[0]);
      if (!firstSong?.pack_name) {
        window.showNotification("Selected songs must be in a pack", "error");
        return;
      }

      await apiPost("/album-series/create-from-pack", {
        pack_name: firstSong.pack_name,
        song_ids: selectedSongs,
        artist_name: albumSeriesForm.artist_name,
        album_name: albumSeriesForm.album_name,
        year: parseInt(albumSeriesForm.year) || null,
        cover_image_url: albumSeriesForm.cover_image_url || null,
        description: albumSeriesForm.description || null,
      });

      // Optimistic update - remove selected songs from the current view
      // since they're now part of an album series
      setSongs((prev) =>
        prev.filter((song) => !selectedSongs.includes(song.id))
      );

      window.showNotification(
        `Album series "${albumSeriesForm.album_name}" created successfully!`,
        "success"
      );

      setShowAlbumSeriesModal(false);
      setSelectedSongs([]);
      setAlbumSeriesForm({
        artist_name: "",
        album_name: "",
        year: "",
        cover_image_url: "",
        description: "",
      });
      // Remove unnecessary full refresh - we already updated local state
      // refreshSongs();
    } catch (error) {
      console.error("Failed to create album series:", error);
      window.showNotification("Failed to create album series", "error");
      // Revert optimistic update on error
      refreshSongs();
    }
  };

  const handleShowAlbumSeriesModal = (packName, albumsWithEnoughSongs) => {
    console.log(
      "Opening album series modal for pack:",
      packName,
      albumsWithEnoughSongs
    );

    const packSongs = songs.filter((song) => song.pack_name === packName);
    if (packSongs.length === 0) {
      console.error("No songs found for pack:", packName);
      return;
    }

    const packSongIds = packSongs.map((song) => song.id);
    setSelectedSongs(packSongIds);

    if (albumsWithEnoughSongs && albumsWithEnoughSongs.length > 0) {
      const [albumName] = albumsWithEnoughSongs[0];
      const firstSong = packSongs[0];
      setAlbumSeriesForm({
        artist_name: firstSong?.artist || "",
        album_name: albumName || "",
        year: firstSong?.year || "",
        cover_image_url: firstSong?.album_cover || "",
        description: "",
      });
    }
    setShowAlbumSeriesModal(true);
  };

  const handleMakeDoubleAlbumSeries = async (
    packName,
    albumsWithEnoughSongs
  ) => {
    if (!albumsWithEnoughSongs || albumsWithEnoughSongs.length < 2) {
      window.showNotification(
        "Pack must have at least 2 albums with 4+ songs each for double album series",
        "error"
      );
      return;
    }

    // Prevent multiple modal openings
    if (showDoubleAlbumSeriesModal || isExecutingDoubleAlbumSeries) {
      return;
    }

    const packSongs = songs.filter(
      (song) => (song.pack_name || "(no pack)") === packName
    );
    const mostCommonArtist = packSongs[0]?.artist;

    // Find the album that should be the "base" album series (the one that stays)
    // This should be the album with the most songs that has an album_series_id
    const albumSeriesCounts = {};
    packSongs.forEach((song) => {
      if (song.album_series_id && song.album) {
        albumSeriesCounts[song.album] =
          (albumSeriesCounts[song.album] || 0) + 1;
      }
    });

    // Find the album with the most songs in the album series (this becomes the "base")
    const baseAlbumSeries = Object.entries(albumSeriesCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const albumsToChooseFrom = albumsWithEnoughSongs.filter(
      ([albumName]) => albumName !== baseAlbumSeries
    );

    if (albumsToChooseFrom.length === 0) {
      window.showNotification(
        "No suitable album found for double album series",
        "error"
      );
      return;
    }

    const [secondAlbumName, secondAlbumCount] = albumsToChooseFrom[0];
    const songsInSecondAlbum = packSongs.filter(
      (song) => song.album === secondAlbumName
    );

    if (songsInSecondAlbum.length < 4) {
      window.showNotification(
        `"${secondAlbumName}" needs at least 4 songs for album series (found ${songsInSecondAlbum.length} total songs including optional ones)`,
        "error"
      );
      return;
    }

    // Show confirmation modal instead of immediately executing
    const newPackName = `${secondAlbumName} Album Series`;
    setDoubleAlbumSeriesData({
      packName,
      secondAlbumName,
      songsToMove: songsInSecondAlbum,
      newPackName,
      mostCommonArtist,
    });
    setShowDoubleAlbumSeriesModal(true);
  };

  const executeDoubleAlbumSeries = async () => {
    if (!doubleAlbumSeriesData || isExecutingDoubleAlbumSeries) return;

    setIsExecutingDoubleAlbumSeries(true);

    const {
      packName,
      secondAlbumName,
      songsToMove,
      newPackName,
      mostCommonArtist,
    } = doubleAlbumSeriesData;

    try {
      // Update all songs from the second album to the new pack
      const songIdsToMove = songsToMove.map((song) => song.id);

      // Update pack names for songs in the second album (sequentially to avoid race conditions)
      for (const songId of songIdsToMove) {
        await apiPatch(`/songs/${songId}`, { pack: newPackName });
      }

      // Create album series for the second album
      await apiPost("/album-series/create-from-pack", {
        pack_name: newPackName,
        artist_name: mostCommonArtist,
        album_name: secondAlbumName,
        year: null,
        cover_image_url: null,
        description: null,
      });

      window.showNotification(
        `Double album series created! "${secondAlbumName}" split into its own album series with ${songsToMove.length} songs.`,
        "success"
      );

      // Close modal and refresh songs to show the updated structure
      setShowDoubleAlbumSeriesModal(false);
      setDoubleAlbumSeriesData(null);
      refreshSongs();
    } catch (error) {
      console.error("Error creating double album series:", error);
      window.showNotification("Failed to create double album series", "error");
    } finally {
      setIsExecutingDoubleAlbumSeries(false);
    }
  };

  const handleCollaborationSaved = async () => {
    try {
      await Promise.all([refreshCollaborations(), refreshSongs()]);
    } catch (error) {
      console.error("Failed to refresh after collaboration saved:", error);
    }
  };

  // Pack Settings Handlers
  const handleRenamePack = async (oldPackName, newPackName) => {
    try {
      // Find the pack ID by looking at songs in the pack
      const packSongs = songs.filter(
        (s) => (s.pack_name || "(no pack)") === oldPackName
      );
      if (packSongs.length === 0) {
        window.showNotification("No songs found in pack", "error");
        return;
      }

      const packId = packSongs[0].pack_id;
      if (!packId) {
        window.showNotification("Pack ID not found", "error");
        return;
      }

      await apiPatch(`/packs/${packId}`, { name: newPackName });

      // Optimistic update - update pack_name for all songs in the pack
      setSongs((prev) =>
        prev.map((song) =>
          (song.pack_name || "(no pack)") === oldPackName
            ? { ...song, pack_name: newPackName }
            : song
        )
      );

      window.showNotification(`Pack renamed to "${newPackName}"`, "success");
    } catch (error) {
      console.error("Failed to rename pack:", error);
      window.showNotification("Failed to rename pack", "error");
      // Revert optimistic update on error
      refreshSongs();
    }
  };

  const handleMovePackToFuturePlans = async (packName) => {
    try {
      // Find the pack ID by looking at songs in the pack
      const packSongs = songs.filter(
        (s) => (s.pack_name || "(no pack)") === packName
      );
      if (packSongs.length === 0) {
        window.showNotification("No songs found in pack", "error");
        return;
      }

      const packId = packSongs[0].pack_id;
      if (!packId) {
        window.showNotification("Pack ID not found", "error");
        return;
      }

      // Optimistic update BEFORE server call for instant feedback
      setSongs((prev) =>
        prev.map((song) =>
          (song.pack_name || "(no pack)") === packName
            ? { ...song, status: "Future Plans" }
            : song
        )
      );

      await apiPatch(`/packs/${packId}/status`, { status: "Future Plans" });

      // Refresh WIP data to ensure consistency
      refreshSongs();

      window.showNotification(
        `Pack "${packName}" moved back to Future Plans`,
        "success"
      );
    } catch (error) {
      console.error("Failed to move pack to Future Plans:", error);
      window.showNotification("Failed to move pack to Future Plans", "error");
      // Revert optimistic update on error
      refreshSongs();
    }
  };

  const handleCreateAlbumSeriesFromPack = async (packName, albumSeriesForm) => {
    try {
      // Find the pack ID by looking at songs in the pack
      const packSongs = songs.filter(
        (s) => (s.pack_name || "(no pack)") === packName
      );
      if (packSongs.length === 0) {
        window.showNotification("No songs found in pack", "error");
        return;
      }

      const packId = packSongs[0].pack_id;
      if (!packId) {
        window.showNotification("Pack ID not found", "error");
        return;
      }

      // Check if pack has at least 4 songs from the specified album
      const songsFromAlbum = packSongs.filter(
        (song) =>
          song.artist?.toLowerCase() ===
            albumSeriesForm.artist_name.toLowerCase() &&
          song.album?.toLowerCase() === albumSeriesForm.album_name.toLowerCase()
      );

      if (songsFromAlbum.length < 4) {
        window.showNotification(
          `Pack must have at least 4 songs from "${albumSeriesForm.artist_name} - ${albumSeriesForm.album_name}" (found ${songsFromAlbum.length})`,
          "error"
        );
        return;
      }

      const created = await apiPost("/album-series/", {
        pack_id: packId,
        artist_name: albumSeriesForm.artist_name,
        album_name: albumSeriesForm.album_name,
      });

      window.showNotification(
        `Album series created for "${albumSeriesForm.artist_name} - ${albumSeriesForm.album_name}"`,
        "success"
      );
    } catch (error) {
      console.error("Failed to create album series:", error);
      window.showNotification("Failed to create album series", "error");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <Fireworks trigger={fireworksTrigger} />

      <WipPageHeader
        grouped={grouped}
        collapsedPacks={collapsedPacks}
        onToggleAll={toggleAll}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Loading Spinner */}
      {loading && <LoadingSpinner message="Loading WIP songs..." />}

      {/* Pack View */}
      {!loading &&
        viewMode === "pack" &&
        grouped.map((packData) => (
          <WipPackCard
            key={packData.pack}
            packName={packData.pack}
            percent={packData.percent}
            coreSongs={packData.coreSongs}
            allSongs={packData.allSongs}
            collapsedPacks={collapsedPacks}
            user={user}
            grouped={grouped}
            showAddForm={showAddForm}
            newSongData={newSongData}
            setNewSongData={setNewSongData}
            authoringFields={authoringFields}
            getPackCollaborators={getPackCollaborators}
            selectedSongs={selectedSongs}
            // Action handlers
            onTogglePack={togglePack}
            onSetShowAddForm={setShowAddForm}
            onAddSongToPack={addSongToPack}
            onSetShowCollaborationModal={setShowCollaborationModal}
            onSetSelectedItemForCollaboration={setSelectedItemForCollaboration}
            onSetCollaborationType={setCollaborationType}
            onUpdateAuthoringField={updateAuthoringField}
            onToggleOptional={toggleOptional}
            onDeleteSong={handleDeleteSong}
            onReleasePack={releasePack}
            onHandleCreateAlbumSeries={handleCreateAlbumSeries}
            onHandleMakeDoubleAlbumSeries={handleMakeDoubleAlbumSeries}
            onSetSelectedSongs={setSelectedSongs}
            onSongUpdate={updateSongData}
            // Pack settings handlers
            onRenamePack={handleRenamePack}
            onMovePackToFuturePlans={handleMovePackToFuturePlans}
            onCreateAlbumSeries={handleCreateAlbumSeriesFromPack}
            onShowAlbumSeriesModal={handleShowAlbumSeriesModal}
            onDeletePack={handleDeletePack}
            userCollaborations={userCollaborations}
          />
        ))}

      {/* Completion View */}
      {!loading && viewMode === "completion" && (
        <>
          <CompletionGroupCard
            categoryName="Completed Songs"
            categoryIcon="✅"
            songs={completionGroups.completed}
            isCollapsed={collapsedPacks.completed !== false}
            onToggle={() => toggleCategory("completed")}
            user={user}
            authoringFields={authoringFields}
            selectedSongs={selectedSongs}
            onUpdateAuthoringField={updateAuthoringField}
            onToggleOptional={toggleOptional}
            onDeleteSong={handleDeleteSong}
            onSongUpdate={updateSongData}
          />

          <CompletionGroupCard
            categoryName="In Progress"
            categoryIcon="🚧"
            songs={completionGroups.inProgress}
            isCollapsed={collapsedPacks.inProgress !== false}
            onToggle={() => toggleCategory("inProgress")}
            user={user}
            authoringFields={authoringFields}
            selectedSongs={selectedSongs}
            onUpdateAuthoringField={updateAuthoringField}
            onToggleOptional={toggleOptional}
            onDeleteSong={handleDeleteSong}
            onSongUpdate={updateSongData}
          />

          <CompletionGroupCard
            categoryName="Optional Songs"
            categoryIcon="⭐"
            songs={completionGroups.optional}
            isCollapsed={collapsedPacks.optional !== false}
            onToggle={() => toggleCategory("optional")}
            user={user}
            authoringFields={authoringFields}
            selectedSongs={selectedSongs}
            onUpdateAuthoringField={updateAuthoringField}
            onToggleOptional={toggleOptional}
            onDeleteSong={handleDeleteSong}
            onSongUpdate={updateSongData}
          />

          <CompletionGroupCard
            categoryName="Songs by Collaborators"
            categoryIcon="👥"
            songs={completionGroups.collaboratorSongs}
            isCollapsed={collapsedPacks.collaboratorSongs !== false}
            onToggle={() => toggleCategory("collaboratorSongs")}
            user={user}
            authoringFields={authoringFields}
            selectedSongs={selectedSongs}
            onUpdateAuthoringField={updateAuthoringField}
            onToggleOptional={toggleOptional}
            onDeleteSong={handleDeleteSong}
            onSongUpdate={updateSongData}
          />

          <CompletionGroupCard
            categoryName="Optional Songs by Collaborators"
            categoryIcon="⭐👥"
            songs={completionGroups.optionalCollaboratorSongs}
            isCollapsed={collapsedPacks.optionalCollaboratorSongs !== false}
            onToggle={() => toggleCategory("optionalCollaboratorSongs")}
            user={user}
            authoringFields={authoringFields}
            selectedSongs={selectedSongs}
            onUpdateAuthoringField={updateAuthoringField}
            onToggleOptional={toggleOptional}
            onDeleteSong={handleDeleteSong}
            onSongUpdate={updateSongData}
          />
        </>
      )}

      {/* Album Series Modal */}
      {showAlbumSeriesModal && (
        <AlbumSeriesModal
          showModal={showAlbumSeriesModal}
          onClose={() => setShowAlbumSeriesModal(false)}
          formData={albumSeriesForm}
          setFormData={setAlbumSeriesForm}
          onSubmit={handleCreateAlbumSeries}
          selectedSongs={selectedSongs}
          songs={songs}
        />
      )}

      {/* Double Album Series Confirmation Modal */}
      {showDoubleAlbumSeriesModal && doubleAlbumSeriesData && (
        <DoubleAlbumSeriesModal
          isOpen={showDoubleAlbumSeriesModal}
          onClose={() => {
            setShowDoubleAlbumSeriesModal(false);
            setDoubleAlbumSeriesData(null);
          }}
          onConfirm={executeDoubleAlbumSeries}
          isExecuting={isExecutingDoubleAlbumSeries}
          packName={doubleAlbumSeriesData.packName}
          secondAlbumName={doubleAlbumSeriesData.secondAlbumName}
          songsToMove={doubleAlbumSeriesData.songsToMove}
          newPackName={doubleAlbumSeriesData.newPackName}
        />
      )}

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
          // Invalidate and refresh WIP data
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("songs-invalidate-cache"));
          }
          // Re-fetch page data
          refreshSongs();
        }}
      />

      {/* Unified Collaboration Modal */}
      <UnifiedCollaborationModal
        packId={
          collaborationType === "pack" || collaborationType === "pack_share"
            ? selectedItemForCollaboration?.id
            : null
        }
        packName={
          collaborationType === "pack" || collaborationType === "pack_share"
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
        onCollaborationSaved={handleCollaborationSaved}
      />

      {/* Custom Alert */}
      <CustomAlert
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={alertConfig.onConfirm}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
      />
    </div>
  );
}

export default WipPage;
