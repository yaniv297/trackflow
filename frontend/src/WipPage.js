import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useWipData } from "./hooks/useWipData";
import WipPageHeader from "./components/WipPageHeader";
import WipPackCard from "./components/WipPackCard";
import Fireworks from "./components/Fireworks";
import CustomAlert from "./components/CustomAlert";
import UnifiedCollaborationModal from "./components/UnifiedCollaborationModal";
import LoadingSpinner from "./components/LoadingSpinner";
import { apiGet, apiPost, apiDelete, apiPatch, apiPut } from "./utils/api";
import AlbumSeriesModal from "./components/AlbumSeriesModal";
import AlbumSeriesEditModal from "./components/AlbumSeriesEditModal";

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

  // Option: open the edit modal after creating an album series
  const [openEditorAfterCreate, setOpenEditorAfterCreate] = useState(false);

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
    const allCollapsed = grouped.every(({ pack }) => collapsedPacks[pack]);
    const newState = {};
    grouped.forEach(({ pack }) => {
      newState[pack] = !allCollapsed;
    });
    setCollapsedPacks(newState);
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
      prev.map((song) =>
        song.id === songId ? { ...song, ...updatedSongData } : song
      )
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
    try {
      // Get all songs in the pack
      const packSongs = songs.filter(
        (s) => (s.pack_name || "(no pack)") === packName
      );

      // Check if there are any album series associated with this pack
      const albumSeriesIds = new Set();
      packSongs.forEach((song) => {
        if (song.album_series_id) {
          albumSeriesIds.add(song.album_series_id);
        }
      });

      // Delete all songs in the pack
      for (const song of packSongs) {
        await apiDelete(`/songs/${song.id}`);
      }

      // Delete any associated album series
      for (const seriesId of albumSeriesIds) {
        try {
          await apiDelete(`/album-series/${seriesId}`);
        } catch (error) {
          console.error(`Failed to delete album series ${seriesId}:`, error);
        }
      }

      // Delete the pack itself
      if (packId) {
        await apiDelete(`/packs/${packId}`);
      }

      // Remove songs from current view
      setSongs((prev) =>
        prev.filter((song) => (song.pack_name || "(no pack)") !== packName)
      );

      const seriesMessage =
        albumSeriesIds.size > 0
          ? ` and ${albumSeriesIds.size} album series`
          : "";
      window.showNotification(
        `Pack "${packName}"${seriesMessage} and all its songs deleted successfully`,
        "success"
      );
    } catch (error) {
      console.error("Failed to delete pack:", error);
      window.showNotification("Failed to delete pack", "error");
    }
  };

  const releasePack = (pack) => {
    setAlertConfig({
      isOpen: true,
      title: "Release Pack",
      message: `Are you sure you want to release "${pack}"? This will move completed songs to "Released" status and move incomplete optional songs back to "Future Plans" with a new pack name.`,
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
            const { completed_songs, optional_songs, optional_pack_name } =
              response.details;

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

  const handleMakeDoubleAlbumSeries = async (pack, albumsWithEnoughSongs) => {
    // Implementation for double album series
    // This is a complex function that would need to be extracted from the original
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

      // Optionally open the edit modal to add songs
      if (openEditorAfterCreate && created && created.id) {
        const event = new CustomEvent("open-edit-album-series", {
          detail: {
            packName,
            packId,
            series: [
              {
                id: created.id,
                number: created.series_number,
                name: created.album_name,
              },
            ],
          },
        });
        window.dispatchEvent(event);
      }
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
      />

      {/* Loading Spinner */}
      {loading && <LoadingSpinner message="Loading WIP songs..." />}

      {!loading &&
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
            onDeletePack={handleDeletePack}
            userCollaborations={userCollaborations}
          />
        ))}

      {/* Album Series Modal */}
      {showAlbumSeriesModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
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
              borderRadius: "8px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "80vh",
              overflow: "auto",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>Create Album Series</h3>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Artist Name:
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
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem" }}>
                Album Name:
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
                  padding: "0.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                }}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: "1rem",
              }}
            >
              <input
                type="checkbox"
                checked={openEditorAfterCreate}
                onChange={(e) => setOpenEditorAfterCreate(e.target.checked)}
              />
              <span>
                After creating, open the editor to add songs to the pack
              </span>
            </label>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
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
              <button
                onClick={() => setShowAlbumSeriesModal(false)}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
