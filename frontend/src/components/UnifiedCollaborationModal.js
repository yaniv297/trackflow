import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiPost, apiGet, apiDelete, apiPut } from "../utils/api";
import UserDropdown from "./UserDropdown";

const UnifiedCollaborationModal = ({
  isOpen,
  onClose,
  packId,
  packName,
  songId,
  songTitle,
  collaborationType = "pack", // "pack" or "song"
  currentUser = null,
  onCollaborationSaved = null,
}) => {
  // UI flow state
  const [step, setStep] = useState(1); // 1: select user, 2: choose permissions, 3: assign instruments
  const [selectedUser, setSelectedUser] = useState("");
  const [permissionType, setPermissionType] = useState(""); // "full", "song-by-song", or "instruments"
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [selectedInstruments, setSelectedInstruments] = useState([]);

  // Data state
  const [collaborators, setCollaborators] = useState([]);
  const [users, setUsers] = useState([]);
  const [packSongs, setPackSongs] = useState([]);
  const [wipCollaborations, setWipCollaborations] = useState({});

  // Pending changes system
  const [pendingCollaborations, setPendingCollaborations] = useState([]);
  const [pendingRemovals, setPendingRemovals] = useState([]);
  const [pendingWipChanges, setPendingWipChanges] = useState({});

  // Loading states
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs to store functions and prevent dependency loops
  const loadCollaboratorsRef = useRef();
  const loadUsersRef = useRef();
  const loadPackSongsRef = useRef();
  const loadWipCollaborationsRef = useRef();

  // Available instrument fields
  const instrumentFields = [
    "Demucs",
    "Midi",
    "Tempo Map",
    "Fake Ending",
    "Drums",
    "Bass",
    "Guitar",
    "Vocals",
    "Harmonies",
    "Pro Keys",
    "Keys",
    "Animations",
    "Drum Fills",
    "Overdrive",
    "Compile",
  ];

  // Load collaborators
  const loadCollaborators = useCallback(async () => {
    if (loadingCollaborators) return;
    setLoadingCollaborators(true);
    try {
      let endpoint;
      if (collaborationType === "pack") {
        endpoint = `/collaborations/pack/${packId}`;
      } else {
        endpoint = `/collaborations/song/${songId}`;
      }
      const response = await apiGet(endpoint);
      setCollaborators(response);
    } catch (error) {
      console.error("Error loading collaborators:", error);
      setCollaborators([]);
    } finally {
      setLoadingCollaborators(false);
    }
  }, [collaborationType, packId, songId, loadingCollaborators]);

  // Load users for dropdown
  const loadUsers = useCallback(async () => {
    try {
      const response = await apiGet("/users");
      setUsers(
        response.filter((user) => user.username !== currentUser?.username)
      );
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, [currentUser?.username]);

  // Load pack songs if needed
  const loadPackSongs = useCallback(async () => {
    if (collaborationType !== "pack" || !packId) return;
    try {
      const response = await apiGet(`/songs?pack_id=${packId}`);
      setPackSongs(response);
    } catch (error) {
      console.error("Error loading pack songs:", error);
    }
  }, [packId, collaborationType]);

  // Load WIP collaborations for all pack songs OR for single song
  const loadWipCollaborations = useCallback(async () => {
    try {
      const wipData = {};

      if (collaborationType === "pack" && packSongs.length > 0) {
        // Load WIP collaborations for each song in the pack
        for (const song of packSongs) {
          try {
            const response = await apiGet(
              `/authoring/${song.id}/wip-collaborations`
            );
            wipData[song.id] = response.assignments || [];
          } catch (error) {
            console.error(
              `Error loading WIP collaborations for song ${song.id}:`,
              error
            );
            wipData[song.id] = [];
          }
        }
      } else if (collaborationType === "song" && songId) {
        // Load WIP collaborations for the single song
        try {
          const response = await apiGet(
            `/authoring/${songId}/wip-collaborations`
          );
          wipData[songId] = response.assignments || [];
        } catch (error) {
          console.error(
            `Error loading WIP collaborations for song ${songId}:`,
            error
          );
          wipData[songId] = [];
        }
      }

      setWipCollaborations(wipData);
    } catch (error) {
      console.error("Error loading WIP collaborations:", error);
    }
  }, [collaborationType, songId, packSongs]);

  // Store functions in refs to prevent dependency loops
  useEffect(() => {
    loadCollaboratorsRef.current = loadCollaborators;
    loadUsersRef.current = loadUsers;
    loadPackSongsRef.current = loadPackSongs;
    loadWipCollaborationsRef.current = loadWipCollaborations;
  });

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
      loadUsers();
      if (collaborationType === "pack") {
        loadPackSongs();
      } else if (collaborationType === "song") {
        loadWipCollaborations();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, collaborationType]);

  useEffect(() => {
    if (packSongs.length > 0 && collaborationType === "pack") {
      loadWipCollaborations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packSongs.length, collaborationType]);

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedUser("");
      setPermissionType("");
      setSelectedSongs([]);
      setSelectedInstruments([]);
      setPendingCollaborations([]);
      setPendingRemovals([]);
      setPendingWipChanges({});
    }
  }, [isOpen]);

  const handleUserSelect = (username) => {
    setSelectedUser(username);
    setStep(2);
  };

  const handlePermissionSelect = (type) => {
    setPermissionType(type);

    if (collaborationType === "song" && type === "instruments") {
      // For single song, automatically select it and go to instruments
      setSelectedSongs([songId]);
      setStep(3);
    } else if (type === "full") {
      // Add to pending collaborations and reset to step 1
      const user = users.find((u) => u.username === selectedUser);
      if (user) {
        if (collaborationType === "pack") {
          setPendingCollaborations((prev) => [
            ...prev,
            {
              type: "full",
              user_id: user.id,
              username: user.username,
              permissions: ["pack_view", "pack_edit"],
            },
          ]);
        } else if (collaborationType === "song") {
          setPendingCollaborations((prev) => [
            ...prev,
            {
              type: "song_edit",
              user_id: user.id,
              username: user.username,
              songId: songId,
            },
          ]);
        }
      }
      // Reset to step 1 to add more collaborators
      setSelectedUser("");
      setPermissionType("");
      setStep(1);
    } else if (type === "song-by-song") {
      setStep(3);
    } else if (type === "instruments") {
      setStep(3);
    }
  };

  const handleSongSelection = (songId, isSelected) => {
    setSelectedSongs((prev) =>
      isSelected ? [...prev, songId] : prev.filter((id) => id !== songId)
    );
  };

  const handleInstrumentSelection = (instrument, isSelected) => {
    setSelectedInstruments((prev) =>
      isSelected ? [...prev, instrument] : prev.filter((i) => i !== instrument)
    );
  };

  const handleAddCollaboration = () => {
    const user = users.find((u) => u.username === selectedUser);
    if (!user) return;

    if (permissionType === "song-by-song") {
      const selectedSongObjects = packSongs.filter((song) =>
        selectedSongs.includes(song.id)
      );

      setPendingCollaborations((prev) => [
        ...prev,
        {
          type: "song-by-song",
          user_id: user.id,
          username: user.username,
          permissions: ["pack_view"],
          songs: selectedSongObjects,
        },
      ]);
    } else if (permissionType === "instruments") {
      let selectedSongObjects;

      if (collaborationType === "song") {
        // For single song collaboration, use the current song
        selectedSongObjects = [{ id: songId, title: songTitle }];
      } else {
        // For pack collaboration, use selected songs
        selectedSongObjects = packSongs.filter((song) =>
          selectedSongs.includes(song.id)
        );
      }

      if (collaborationType === "pack") {
        setPendingCollaborations((prev) => [
          ...prev,
          {
            type: "instruments",
            user_id: user.id,
            username: user.username,
            permissions: ["pack_view"], // Give pack view for instrument collaborators
            songs: selectedSongObjects,
            instruments: selectedInstruments,
          },
        ]);
      }

      // Track WIP changes for both pack and song collaboration types
      const newWipChanges = { ...pendingWipChanges };
      selectedSongObjects.forEach((song) => {
        const actualSongId = song.id || song;
        if (!newWipChanges[actualSongId]) {
          newWipChanges[actualSongId] = [];
        }
        selectedInstruments.forEach((instrument) => {
          newWipChanges[actualSongId].push({
            collaborator: user.username,
            field: instrument.toLowerCase().replace(/\s+/g, "_"),
          });
        });
      });
      setPendingWipChanges(newWipChanges);
    }

    // Reset to step 1
    setSelectedUser("");
    setPermissionType("");
    setSelectedSongs([]);
    setSelectedInstruments([]);
    setStep(1);
  };

  const handleRemoveCollaborator = (userId) => {
    setPendingRemovals((prev) => [
      ...prev,
      {
        user_id: userId,
        type: collaborationType,
      },
    ]);
  };

  const handleRemovePendingCollaboration = (index) => {
    setPendingCollaborations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemovePendingRemoval = (userId) => {
    setPendingRemovals((prev) =>
      prev.filter((removal) => removal.user_id !== userId)
    );
  };

  const handleSaveAll = async () => {
    if (
      pendingCollaborations.length === 0 &&
      pendingRemovals.length === 0 &&
      Object.keys(pendingWipChanges).length === 0
    ) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      // Handle additions
      for (const collab of pendingCollaborations) {
        if (collab.type === "full") {
          // Give full pack permissions
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: collab.user_id,
            permissions: collab.permissions,
          });
        } else if (collab.type === "song_edit") {
          // Give song edit permission for single song
          await apiPost(`/collaborations/songs/${collab.songId}/collaborate`, {
            user_id: collab.user_id,
          });
        } else if (collab.type === "song-by-song") {
          // Give pack view permission
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: collab.user_id,
            permissions: collab.permissions,
          });

          // Give song edit permissions for selected songs
          for (const song of collab.songs) {
            await apiPost(`/collaborations/songs/${song.id}/collaborate`, {
              user_id: collab.user_id,
            });
          }
        } else if (collab.type === "instruments") {
          // Give pack view permission
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: collab.user_id,
            permissions: collab.permissions,
          });

          // Give song edit permissions for instrument songs
          for (const song of collab.songs) {
            await apiPost(`/collaborations/songs/${song.id}/collaborate`, {
              user_id: collab.user_id,
            });
          }
        }
      }

      // Handle WIP collaboration changes
      for (const [targetSongId, assignments] of Object.entries(
        pendingWipChanges
      )) {
        if (assignments.length > 0) {
          // Get existing assignments and add new ones
          const existingAssignments = wipCollaborations[targetSongId] || [];
          const updatedAssignments = [...existingAssignments, ...assignments];

          await apiPut(`/authoring/${targetSongId}/wip-collaborations`, {
            assignments: updatedAssignments,
          });
        }
      }

      // Handle removals
      for (const removal of pendingRemovals) {
        if (collaborationType === "pack") {
          await apiDelete(
            `/collaborations/packs/${packId}/collaborate/${removal.user_id}`
          );

          // Also remove WIP collaborations for this user from all pack songs
          for (const song of packSongs) {
            const existingAssignments = wipCollaborations[song.id] || [];
            const userToRemove = users.find(
              (u) => u.id === removal.user_id
            )?.username;

            if (userToRemove) {
              const filteredAssignments = existingAssignments.filter(
                (assignment) => assignment.collaborator !== userToRemove
              );

              await apiPut(`/authoring/${song.id}/wip-collaborations`, {
                assignments: filteredAssignments,
              });
            }
          }
        } else if (collaborationType === "song") {
          await apiDelete(
            `/collaborations/songs/${songId}/collaborate/${removal.user_id}`
          );

          // Remove WIP collaborations for this user from the song
          const existingAssignments = wipCollaborations[songId] || [];
          const userToRemove = users.find(
            (u) => u.id === removal.user_id
          )?.username;

          if (userToRemove) {
            const filteredAssignments = existingAssignments.filter(
              (assignment) => assignment.collaborator !== userToRemove
            );

            await apiPut(`/authoring/${songId}/wip-collaborations`, {
              assignments: filteredAssignments,
            });
          }
        }
      }

      // Reset form and reload data
      setPendingCollaborations([]);
      setPendingRemovals([]);
      setPendingWipChanges({});
      setSelectedUser("");
      setPermissionType("");
      setSelectedSongs([]);
      setSelectedInstruments([]);
      setStep(1);

      await loadCollaborators();
      await loadWipCollaborations();

      // Notify parent component to refresh data
      if (onCollaborationSaved) {
        onCollaborationSaved();
      }

      onClose();
    } catch (error) {
      console.error("Error saving collaborations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (
      pendingCollaborations.length > 0 ||
      pendingRemovals.length > 0 ||
      Object.keys(pendingWipChanges).length > 0
    ) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to close?"
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getPermissionDescription = (collab) => {
    if (collaborationType === "pack") {
      // Check if this collaborator has song-level permissions
      const songCollabs = collaborators.filter(
        (c) =>
          c.user_id === collab.user_id &&
          c.song_id &&
          c.collaboration_type === "song_edit"
      );

      if (collab.collaboration_type === "pack_edit") {
        return "Full permissions (pack view + edit)";
      } else if (collab.collaboration_type === "pack_view") {
        if (songCollabs.length > 0) {
          const songTitles = songCollabs
            .map((sc) => {
              const song = packSongs.find((ps) => ps.id === sc.song_id);
              return song ? song.title : `Song ${sc.song_id}`;
            })
            .join(", ");
          return `Pack view + song edit for: ${songTitles}`;
        } else {
          return "Pack view only";
        }
      }
    } else if (collaborationType === "song") {
      return "Song edit permission";
    }
    return collab.collaboration_type?.replace("_", " ") || "Unknown";
  };

  // Group collaborators by user to show one entry per user with their combined permissions
  const groupedCollaborators = collaborators.reduce((acc, collab) => {
    const key = collab.user_id;
    if (!acc[key]) {
      acc[key] = {
        user_id: collab.user_id,
        username: collab.username,
        collaborations: [],
      };
    }
    acc[key].collaborations.push(collab);
    return acc;
  }, {});

  const getTitle = () => {
    if (collaborationType === "pack") {
      return `Manage Collaborations - ${packName}`;
    }
    return `Manage Collaborations - ${songTitle}`;
  };

  const getDescription = () => {
    if (collaborationType === "pack") {
      return "Add collaborators to this pack. You can give them full access, specific song permissions, or assign them to specific instruments.";
    }
    return "Add collaborators to this song. You can give them full song edit access or assign them to specific instruments.";
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Select a user to add as a collaborator";
      case 2:
        return `Choose the type of collaboration for ${selectedUser}`;
      case 3:
        if (permissionType === "song-by-song") {
          return "Select which songs they can edit";
        } else if (permissionType === "instruments") {
          if (collaborationType === "song") {
            return "Select instruments to assign";
          }
          return "Select songs and instruments to assign";
        }
        return "";
      default:
        return "";
    }
  };

  // Get WIP collaborations for display
  const getWipCollaborationsForUser = (username) => {
    const userWipCollabs = {};

    Object.entries(wipCollaborations).forEach(([targetSongId, assignments]) => {
      const userAssignments = assignments.filter(
        (a) => a.collaborator === username
      );
      if (userAssignments.length > 0) {
        let displayTitle;
        if (collaborationType === "song" && parseInt(targetSongId) === songId) {
          displayTitle = songTitle;
        } else {
          const song = packSongs.find((s) => s.id === parseInt(targetSongId));
          displayTitle = song ? song.title : `Song ${targetSongId}`;
        }

        if (displayTitle) {
          userWipCollabs[displayTitle] = userAssignments.map((a) =>
            a.field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          );
        }
      }
    });

    return userWipCollabs;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          maxWidth: "700px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 1rem 0", color: "#333" }}>{getTitle()}</h2>

        <p
          style={{
            margin: "0 0 1.5rem 0",
            color: "#666",
            fontSize: "0.9rem",
            lineHeight: "1.4",
          }}
        >
          {getDescription()}
        </p>

        {/* Step 1: Select User */}
        {step === 1 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              {getStepDescription()}
            </h3>

            <UserDropdown
              value=""
              onChange={(e) => {
                const newUsers = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
                if (newUsers.length > 0) {
                  handleUserSelect(newUsers[newUsers.length - 1]);
                }
              }}
              placeholder="Select a user..."
              currentUser={currentUser}
            />
          </div>
        )}

        {/* Step 2: Choose Permission Type */}
        {step === 2 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              {getStepDescription()}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <button
                onClick={() => handlePermissionSelect("full")}
                style={{
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: "#f8f9fa",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <strong>Full Permissions</strong>
                <br />
                <small style={{ color: "#666" }}>
                  {collaborationType === "pack"
                    ? "Can view and edit the entire pack"
                    : "Can edit this song completely"}
                </small>
              </button>

              <button
                onClick={() => handlePermissionSelect("instruments")}
                style={{
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: "#f8f9fa",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <strong>Instrument Assignment</strong>
                <br />
                <small style={{ color: "#666" }}>
                  {collaborationType === "pack"
                    ? "Assign specific instruments/parts for specific songs"
                    : "Assign specific instruments/parts for this song"}
                </small>
              </button>

              {collaborationType === "pack" && (
                <button
                  onClick={() => handlePermissionSelect("song-by-song")}
                  style={{
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    background: "#f8f9fa",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <strong>Song-by-Song Permissions</strong>
                  <br />
                  <small style={{ color: "#666" }}>
                    Can view pack and edit specific songs
                  </small>
                </button>
              )}
            </div>

            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Songs and/or Instruments */}
        {step === 3 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              {getStepDescription()}
            </h3>

            {/* Song Selection (only show for pack collaboration or song-by-song) */}
            {collaborationType === "pack" &&
              (permissionType === "song-by-song" ||
                permissionType === "instruments") && (
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
                    Select Songs:
                  </h4>
                  <div
                    style={{
                      maxHeight: "150px",
                      overflow: "auto",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      padding: "0.5rem",
                    }}
                  >
                    {packSongs.map((song) => (
                      <label
                        key={song.id}
                        style={{
                          display: "block",
                          padding: "0.25rem 0",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSongs.includes(song.id)}
                          onChange={(e) =>
                            handleSongSelection(song.id, e.target.checked)
                          }
                          style={{ marginRight: "0.5rem" }}
                        />
                        {song.title} - {song.artist}
                      </label>
                    ))}
                  </div>
                </div>
              )}

            {/* Instrument Selection (for instrument assignments) */}
            {permissionType === "instruments" && (
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>
                  Select Instruments:
                </h4>
                <div
                  style={{
                    maxHeight: "150px",
                    overflow: "auto",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    padding: "0.5rem",
                  }}
                >
                  {instrumentFields.map((instrument) => (
                    <label
                      key={instrument}
                      style={{
                        display: "block",
                        padding: "0.25rem 0",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedInstruments.includes(instrument)}
                        onChange={(e) =>
                          handleInstrumentSelection(
                            instrument,
                            e.target.checked
                          )
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      {instrument}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                onClick={handleAddCollaboration}
                disabled={
                  (permissionType === "song-by-song" &&
                    selectedSongs.length === 0) ||
                  (permissionType === "instruments" &&
                    (selectedInstruments.length === 0 ||
                      (collaborationType === "pack" &&
                        selectedSongs.length === 0)))
                }
                style={{
                  padding: "0.5rem 1rem",
                  background:
                    (permissionType === "song-by-song" &&
                      selectedSongs.length === 0) ||
                    (permissionType === "instruments" &&
                      (selectedInstruments.length === 0 ||
                        (collaborationType === "pack" &&
                          selectedSongs.length === 0)))
                      ? "#ccc"
                      : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    (permissionType === "song-by-song" &&
                      selectedSongs.length === 0) ||
                    (permissionType === "instruments" &&
                      (selectedInstruments.length === 0 ||
                        (collaborationType === "pack" &&
                          selectedSongs.length === 0)))
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Add Collaboration
              </button>
            </div>
          </div>
        )}

        {/* Current Collaborators */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1rem",
              color: "#555",
            }}
          >
            Current Collaborators
          </h3>

          {loadingCollaborators ? (
            <p style={{ color: "#666", fontSize: "0.9rem" }}>Loading...</p>
          ) : Object.keys(groupedCollaborators).length === 0 ? (
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              No collaborators yet
            </p>
          ) : (
            <div style={{ border: "1px solid #ddd", borderRadius: "4px" }}>
              {Object.values(groupedCollaborators).map((collab, index) => {
                const isPendingRemoval = pendingRemovals.some(
                  (removal) => removal.user_id === collab.user_id
                );
                const wipCollabs = getWipCollaborationsForUser(collab.username);

                return (
                  <div
                    key={collab.user_id}
                    style={{
                      padding: "0.75rem",
                      borderBottom:
                        index < Object.keys(groupedCollaborators).length - 1
                          ? "1px solid #eee"
                          : "none",
                      backgroundColor: isPendingRemoval ? "#ffe6e6" : "white",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: "#333" }}>
                          {collab.username}
                        </strong>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#666",
                            marginTop: "0.25rem",
                          }}
                        >
                          {getPermissionDescription(collab.collaborations[0])}
                        </div>

                        {/* Show WIP instrument assignments */}
                        {Object.keys(wipCollabs).length > 0 && (
                          <div style={{ marginTop: "0.5rem" }}>
                            <div
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                color: "#555",
                              }}
                            >
                              Instrument Assignments:
                            </div>
                            {Object.entries(wipCollabs).map(
                              ([songTitleDisplay, instruments]) => (
                                <div
                                  key={songTitleDisplay}
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#666",
                                    marginLeft: "0.5rem",
                                  }}
                                >
                                  {collaborationType === "song" ? (
                                    <span>
                                      <strong>Instruments:</strong>{" "}
                                      {instruments.join(", ")}
                                    </span>
                                  ) : (
                                    <span>
                                      <strong>{songTitleDisplay}:</strong>{" "}
                                      {instruments.join(", ")}
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        {isPendingRemoval ? (
                          <button
                            onClick={() =>
                              handleRemovePendingRemoval(collab.user_id)
                            }
                            style={{
                              padding: "0.25rem 0.5rem",
                              background: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "3px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Undo Remove
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleRemoveCollaborator(collab.user_id)
                            }
                            style={{
                              padding: "0.25rem 0.5rem",
                              background: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "3px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Collaborations */}
        {pendingCollaborations.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                color: "#555",
              }}
            >
              Pending Collaborations
            </h3>
            <div style={{ border: "1px solid #ddd", borderRadius: "4px" }}>
              {pendingCollaborations.map((collab, index) => (
                <div
                  key={index}
                  style={{
                    padding: "0.75rem",
                    borderBottom:
                      index < pendingCollaborations.length - 1
                        ? "1px solid #eee"
                        : "none",
                    backgroundColor: "#e8f5e8",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <strong>{collab.username}</strong>
                      <div style={{ fontSize: "0.8rem", color: "#666" }}>
                        {collab.type === "full" && "Full permissions"}
                        {collab.type === "song_edit" && "Song edit permission"}
                        {collab.type === "song-by-song" &&
                          `Song edit for: ${collab.songs
                            .map((s) => s.title)
                            .join(", ")}`}
                        {collab.type === "instruments" &&
                          `${collab.instruments.join(", ")} for: ${collab.songs
                            .map((s) => s.title)
                            .join(", ")}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemovePendingCollaboration(index)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "3px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            justifyContent: "flex-end",
            marginTop: "1.5rem",
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: "0.5rem 1rem",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              background: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedCollaborationModal;
