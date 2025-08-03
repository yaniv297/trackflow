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
  const [selectedUsersForShare, setSelectedUsersForShare] = useState(""); // For pack_share
  const [permissionType, setPermissionType] = useState(""); // "full", "song-by-song", or "instruments"
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [selectedInstruments, setSelectedInstruments] = useState([]);

  // Edit mode state
  const [editingCollaborator, setEditingCollaborator] = useState(null);

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

  // Mapping between database field names and UI field names
  const dbToUiFieldMap = {
    demucs: "Demucs",
    midi: "Midi",
    tempo_map: "Tempo Map",
    fake_ending: "Fake Ending",
    drums: "Drums",
    bass: "Bass",
    guitar: "Guitar",
    vocals: "Vocals",
    harmonies: "Harmonies",
    pro_keys: "Pro Keys",
    keys: "Keys",
    animations: "Animations",
    drum_fills: "Drum Fills",
    overdrive: "Overdrive",
    compile: "Compile",
  };

  const uiToDbFieldMap = {
    Demucs: "demucs",
    Midi: "midi",
    "Tempo Map": "tempo_map",
    "Fake Ending": "fake_ending",
    Drums: "drums",
    Bass: "bass",
    Guitar: "guitar",
    Vocals: "vocals",
    Harmonies: "harmonies",
    "Pro Keys": "pro_keys",
    Keys: "keys",
    Animations: "animations",
    "Drum Fills": "drum_fills",
    Overdrive: "overdrive",
    Compile: "compile",
  };

  // Load collaborators
  const loadCollaborators = useCallback(async () => {
    if (loadingCollaborators) return;
    setLoadingCollaborators(true);
    try {
      let endpoint;
      if (collaborationType === "pack") {
        endpoint = `/collaborations/packs/${packId}/collaborators`;
      } else {
        endpoint = `/collaborations/songs/${songId}/collaborators`;
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
      const response = await apiGet("/auth/users/");
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
      setSelectedUsersForShare("");
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
    if (collaborationType === "song") {
      // For songs, skip to instrument assignment directly
      setPermissionType("specific");
      setSelectedSongs([songId]);
      setStep(3);
    } else {
      // For packs, go to permission selection
      setStep(2);
    }
  };

  const handlePermissionSelect = (type) => {
    setPermissionType(type);

    if (type === "full") {
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
    } else if (type === "specific") {
      // For both pack and song, go to instrument assignment
      if (collaborationType === "song") {
        // For single song, automatically select it and go to instruments
        setSelectedSongs([songId]);
      }
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

    if (permissionType === "specific") {
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
            type: "specific",
            user_id: user.id,
            username: user.username,
            permissions: ["pack_view"], // Give pack view for song collaborators
            songs: selectedSongObjects,
          },
        ]);
      } else if (collaborationType === "song") {
        // For song collaboration, add to pending collaborations
        setPendingCollaborations((prev) => [
          ...prev,
          {
            type: "specific",
            user_id: user.id,
            username: user.username,
            songId: songId,
            songs: selectedSongObjects,
            instruments: selectedInstruments,
          },
        ]);

        // Track WIP changes only for song collaboration types (WIP songs)
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

  const handleEditCollaborator = async (collaborator) => {
    setEditingCollaborator(collaborator);

    // Pre-populate with existing data
    if (collaborationType === "song") {
      // Ensure WIP collaborations are loaded
      if (!wipCollaborations[songId]) {
        console.log("WIP collaborations not loaded, loading now...");
        await loadWipCollaborations();
      }

      // For song collaborations, get existing instrument assignments
      const existingAssignments = wipCollaborations[songId] || [];
      const userAssignments = existingAssignments.filter(
        (a) => a.collaborator === collaborator.username
      );
      const existingInstruments = userAssignments.map(
        (a) => dbToUiFieldMap[a.field] || a.field
      );

      console.log("Edit collaborator debug:", {
        collaborator: collaborator.username,
        songId,
        wipCollaborations,
        existingAssignments,
        userAssignments,
        existingInstruments,
        selectedInstruments: existingInstruments,
      });

      setSelectedInstruments(existingInstruments);
    } else {
      setSelectedInstruments([]);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCollaborator) return;

    setLoading(true);
    try {
      if (collaborationType === "song") {
        // Update WIP collaborations for the song
        const existingAssignments = wipCollaborations[songId] || [];
        const otherAssignments = existingAssignments.filter(
          (a) => a.collaborator !== editingCollaborator.username
        );

        const newAssignments = selectedInstruments.map((instrument) => ({
          collaborator: editingCollaborator.username,
          field: uiToDbFieldMap[instrument] || instrument,
        }));

        const updatedAssignments = [...otherAssignments, ...newAssignments];

        await apiPut(`/authoring/${songId}/wip-collaborations`, {
          assignments: updatedAssignments,
        });

        // Update local state
        setWipCollaborations((prev) => ({
          ...prev,
          [songId]: updatedAssignments,
        }));
      }

      // Exit edit mode
      setEditingCollaborator(null);
      setSelectedInstruments([]);

      // Refresh collaborators
      await loadCollaborators();

      if (onCollaborationSaved) {
        onCollaborationSaved();
      }
    } catch (error) {
      console.error("Error saving edit:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCollaborator(null);
    setSelectedInstruments([]);
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

          // Also create song-level collaborations for all songs in the pack
          // so the user can actually edit the songs
          console.log(
            "Creating song collaborations for pack songs:",
            packSongs
          );

          // If packSongs is empty, try to load them first
          let songsToCollaborate = packSongs;
          if (songsToCollaborate.length === 0) {
            console.log("packSongs is empty, loading songs from API...");
            try {
              const response = await apiGet(`/songs?pack_id=${packId}`);
              songsToCollaborate = response;
              console.log("Loaded songs from API:", songsToCollaborate);
            } catch (error) {
              console.error("Failed to load pack songs:", error);
            }
          }

          for (const song of songsToCollaborate) {
            try {
              console.log(
                `Creating collaboration for song ${song.id} (${song.title})`
              );
              await apiPost(`/collaborations/songs/${song.id}/collaborate`, {
                user_id: collab.user_id,
              });
              console.log(
                `Successfully created collaboration for song ${song.id}`
              );
            } catch (error) {
              console.error(
                `Failed to create collaboration for song ${song.id}:`,
                error
              );
            }
          }
        } else if (collab.type === "song_edit") {
          // Give song edit permission for single song
          await apiPost(`/collaborations/songs/${collab.songId}/collaborate`, {
            user_id: collab.user_id,
          });
        } else if (collab.type === "specific") {
          if (collaborationType === "pack") {
            // Give pack view permission
            await apiPost(`/collaborations/packs/${packId}/collaborate`, {
              user_id: collab.user_id,
              permissions: collab.permissions,
            });

            // Give song edit permissions for specific songs
            for (const song of collab.songs) {
              await apiPost(`/collaborations/songs/${song.id}/collaborate`, {
                user_id: collab.user_id,
              });
            }
          } else if (collaborationType === "song") {
            // For song-level collaboration, give song edit permission
            await apiPost(
              `/collaborations/songs/${collab.songId}/collaborate`,
              {
                user_id: collab.user_id,
              }
            );
          }
        } else if (collab.type === "pack_share") {
          // Share pack with read-only access
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: collab.user_id,
            permissions: collab.permissions,
          });
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
        } else if (collaborationType === "pack_share") {
          await apiDelete(
            `/collaborations/packs/${packId}/collaborate/${removal.user_id}`
          );
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
    } else if (collaborationType === "pack_share") {
      return "Pack view permission (read-only)";
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
    } else if (collaborationType === "pack_share") {
      return `Share Pack - ${packName}`;
    }
    return `Manage Collaborations - ${songTitle}`;
  };

  const getDescription = () => {
    if (collaborationType === "pack") {
      return "Add collaborators to this pack. You can give them full access to all songs, or assign them to specific songs for editing.";
    } else if (collaborationType === "pack_share") {
      return "Share this pack with another user. They will be able to view all songs (read-only) and add their own songs to the pack.";
    }
    return "Add a collaborator to this song and assign them to specific instruments.";
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Select a user to add as a collaborator";
      case 2:
        return `Choose the type of collaboration for ${selectedUser}`;
      case 3:
        if (collaborationType === "song") {
          return "Select instruments to assign";
        } else if (permissionType === "specific") {
          return "Select songs for collaboration";
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
              value={
                collaborationType === "pack_share"
                  ? selectedUsersForShare
                  : selectedUser
              }
              onChange={(e) => {
                const newUsers = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);

                if (collaborationType === "pack_share") {
                  // For pack sharing, update the selectedUsersForShare and add to pending immediately
                  const oldUsernames = selectedUsersForShare
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s);

                  setSelectedUsersForShare(e.target.value);

                  // Add any new users to pending collaborations
                  const newUsernames = newUsers.filter(
                    (username) => !oldUsernames.includes(username)
                  );

                  newUsernames.forEach((username) => {
                    const user = users.find((u) => u.username === username);
                    if (user) {
                      setPendingCollaborations((prev) => [
                        ...prev,
                        {
                          type: "pack_share",
                          user_id: user.id,
                          username: user.username,
                          permissions: ["pack_view"],
                        },
                      ]);
                    }
                  });

                  // Remove any deselected users from pending collaborations
                  const removedUsernames = oldUsernames.filter(
                    (username) => !newUsers.includes(username)
                  );

                  if (removedUsernames.length > 0) {
                    setPendingCollaborations((prev) =>
                      prev.filter(
                        (collab) =>
                          !(
                            collab.type === "pack_share" &&
                            removedUsernames.includes(collab.username)
                          )
                      )
                    );
                  }
                } else if (newUsers.length > 0) {
                  handleUserSelect(newUsers[newUsers.length - 1]);
                }
              }}
              placeholder="Select a user..."
              currentUser={currentUser}
            />
          </div>
        )}

        {/* Step 2: Choose Permission Type (only for regular pack collaborations) */}
        {step === 2 && collaborationType === "pack" && (
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
                  background: "#f0f8ff",
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: "0.5rem",
                }}
              >
                <strong>
                  {collaborationType === "pack"
                    ? "Full Pack Access"
                    : "Full Song Access"}
                </strong>
                <br />
                <small style={{ color: "#666" }}>
                  {collaborationType === "pack"
                    ? "Can edit all songs in this pack"
                    : "Can edit all instruments in this song"}
                </small>
              </button>

              <button
                onClick={() => handlePermissionSelect("specific")}
                style={{
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  background: "#f8f9fa",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <strong>
                  {collaborationType === "pack"
                    ? "Choose Songs & Instruments"
                    : "Choose Instruments"}
                </strong>
                <br />
                <small style={{ color: "#666" }}>
                  {collaborationType === "pack"
                    ? "Select specific songs and assign instruments"
                    : "Assign specific instruments only"}
                </small>
              </button>
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

        {/* Step 3: Select Songs and Instruments (only for specific permissions) */}
        {step === 3 && collaborationType !== "pack_share" && (
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
            {collaborationType === "pack" && permissionType === "specific" && (
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

            {/* Instrument Selection (only for WIP songs, not for Future Plans collaborations) */}
            {permissionType === "specific" && collaborationType === "song" && (
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
                  permissionType === "specific" &&
                  ((collaborationType === "pack" &&
                    selectedSongs.length === 0) ||
                    (collaborationType === "song" &&
                      selectedInstruments.length === 0))
                }
                style={{
                  padding: "0.5rem 1rem",
                  background:
                    permissionType === "specific" &&
                    ((collaborationType === "pack" &&
                      selectedSongs.length === 0) ||
                      (collaborationType === "song" &&
                        selectedInstruments.length === 0))
                      ? "#ccc"
                      : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor:
                    permissionType === "specific" &&
                    ((collaborationType === "pack" &&
                      selectedSongs.length === 0) ||
                      (collaborationType === "song" &&
                        selectedInstruments.length === 0))
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
                      <div style={{ display: "flex", gap: "0.5rem" }}>
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
                          <>
                            {collaborationType === "song" && (
                              <button
                                onClick={() => handleEditCollaborator(collab)}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  background: "#007bff",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "3px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                }}
                              >
                                Edit
                              </button>
                            )}
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
                          </>
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
                        {collab.type === "specific" &&
                          `${
                            collab.instruments
                              ? collab.instruments.join(", ")
                              : "Song edit"
                          } for: ${collab.songs
                            .map((s) => s.title)
                            .join(", ")}`}
                        {collab.type === "pack_share" &&
                          "Pack view permission (read-only)"}
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

        {/* Edit Mode UI */}
        {editingCollaborator && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              border: "2px solid #007bff",
              borderRadius: "4px",
              backgroundColor: "#f8f9fa",
            }}
          >
            <h3
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1rem",
                color: "#007bff",
              }}
            >
              Edit Collaboration - {editingCollaborator.username}
            </h3>

            <div>
              <p style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
                Select instruments to assign to {editingCollaborator.username}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                {instrumentFields.map((instrument) => (
                  <label
                    key={instrument}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      cursor: "pointer",
                      backgroundColor: selectedInstruments.includes(instrument)
                        ? "#e3f2fd"
                        : "white",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedInstruments.includes(instrument)}
                      onChange={(e) =>
                        handleInstrumentSelection(instrument, e.target.checked)
                      }
                    />
                    {instrument}
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleSaveEdit}
                  disabled={loading}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancelEdit}
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
              </div>
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
