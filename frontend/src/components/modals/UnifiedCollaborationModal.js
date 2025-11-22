import React, { useState, useEffect } from "react";
import { useUserProfilePopup } from "../../hooks/useUserProfilePopup";
import { useCollaborationData } from "../../hooks/useCollaborationData";
import { useCollaborationOperations } from "../../hooks/useCollaborationOperations";
import UserProfilePopup from "../shared/UserProfilePopup";
import UserSelector from "../features/collaboration/UserSelector";
import PermissionSelector from "../features/collaboration/PermissionSelector";
import InstrumentAssignment from "../features/collaboration/InstrumentAssignment";
import CollaboratorList from "../features/collaboration/CollaboratorList";
import PendingChanges from "../features/collaboration/PendingChanges";
import EditCollaborator from "../features/collaboration/EditCollaborator";

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

  // Pending changes system
  const [pendingCollaborations, setPendingCollaborations] = useState([]);
  const [pendingRemovals, setPendingRemovals] = useState([]);
  const [pendingWipChanges, setPendingWipChanges] = useState({});

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

  // Custom hooks
  const {
    users,
    packSongs,
    wipCollaborations,
    groupedCollaborators,
    loadingCollaborators,
    loadCollaborators,
    loadWipCollaborations,
    setWipCollaborations
  } = useCollaborationData({
    isOpen,
    collaborationType,
    packId,
    songId,
    currentUser
  });

  const { loading, handleSaveAll, handleSaveEdit } = useCollaborationOperations({
    collaborationType,
    packId,
    songId,
    users,
    packSongs,
    wipCollaborations,
    loadCollaborators,
    loadWipCollaborations,
    onCollaborationSaved,
    onClose
  });

  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

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
    } else if (type === "readonly") {
      // Add read-only collaboration and reset to step 1
      const user = users.find((u) => u.username === selectedUser);
      if (user) {
        if (collaborationType === "pack") {
          setPendingCollaborations((prev) => [
            ...prev,
            {
              type: "readonly",
              user_id: user.id,
              username: user.username,
              permissions: ["pack_view"],
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

      setSelectedInstruments(existingInstruments);
    } else {
      setSelectedInstruments([]);
    }
  };

  const handleSaveEditWrapper = async () => {
    await handleSaveEdit(
      editingCollaborator,
      selectedInstruments,
      setWipCollaborations,
      uiToDbFieldMap
    );
    // Exit edit mode
    setEditingCollaborator(null);
    setSelectedInstruments([]);
  };

  const handleCancelEdit = () => {
    setEditingCollaborator(null);
    setSelectedInstruments([]);
  };

  const handleSaveAllWrapper = async () => {
    await handleSaveAll(pendingCollaborations, pendingRemovals, pendingWipChanges);
    // Reset form
    setPendingCollaborations([]);
    setPendingRemovals([]);
    setPendingWipChanges({});
    setSelectedUser("");
    setPermissionType("");
    setSelectedSongs([]);
    setSelectedInstruments([]);
    setStep(1);
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
      return "Add collaborators to this pack. You can give them full access to all songs, read-only access, or assign them to specific songs for editing.";
    } else if (collaborationType === "pack_share") {
      return "Share this pack with another user. They will be able to view all songs (read-only) and add their own songs to the pack.";
    }
    return "Add a collaborator to this song and assign them to specific instruments.";
  };


  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: isOpen ? "flex" : "none",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
        onClick={onClose}
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
            <UserSelector
              collaborationType={collaborationType}
              selectedUser={selectedUser}
              selectedUsersForShare={selectedUsersForShare}
              onUserSelect={handleUserSelect}
              onShareUsersChange={setSelectedUsersForShare}
              currentUser={currentUser}
              users={users}
              pendingCollaborations={pendingCollaborations}
              setPendingCollaborations={setPendingCollaborations}
            />
          )}

          {/* Step 2: Choose Permission Type (only for regular pack collaborations) */}
          {step === 2 && collaborationType === "pack" && (
            <PermissionSelector
              collaborationType={collaborationType}
              selectedUser={selectedUser}
              onPermissionSelect={handlePermissionSelect}
              onBack={() => setStep(1)}
            />
          )}

          {/* Step 3: Select Songs and Instruments (only for specific permissions) */}
          {step === 3 && collaborationType !== "pack_share" && (
            <InstrumentAssignment
              collaborationType={collaborationType}
              permissionType={permissionType}
              packSongs={packSongs}
              selectedSongs={selectedSongs}
              selectedInstruments={selectedInstruments}
              onSongSelection={handleSongSelection}
              onInstrumentSelection={handleInstrumentSelection}
              onAddCollaboration={handleAddCollaboration}
              onBack={() => setStep(2)}
              instrumentFields={instrumentFields}
            />
          )}

          {/* Current Collaborators */}
          <CollaboratorList
            collaborationType={collaborationType}
            groupedCollaborators={groupedCollaborators}
            loadingCollaborators={loadingCollaborators}
            pendingRemovals={pendingRemovals}
            wipCollaborations={wipCollaborations}
            packSongs={packSongs}
            songId={songId}
            songTitle={songTitle}
            onEditCollaborator={handleEditCollaborator}
            onRemoveCollaborator={handleRemoveCollaborator}
            onRemovePendingRemoval={handleRemovePendingRemoval}
            onUsernameClick={handleUsernameClick}
            dbToUiFieldMap={dbToUiFieldMap}
          />

          {/* Pending Collaborations */}
          <PendingChanges
            pendingCollaborations={pendingCollaborations}
            pendingRemovals={pendingRemovals}
            onRemovePendingCollaboration={handleRemovePendingCollaboration}
            onUsernameClick={handleUsernameClick}
          />

          {/* Edit Mode UI */}
          <EditCollaborator
            editingCollaborator={editingCollaborator}
            selectedInstruments={selectedInstruments}
            instrumentFields={instrumentFields}
            loading={loading}
            onInstrumentSelection={handleInstrumentSelection}
            onSaveEdit={handleSaveEditWrapper}
            onCancelEdit={handleCancelEdit}
          />


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
              onClick={handleSaveAllWrapper}
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

      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />
    </>
  );
};

export default UnifiedCollaborationModal;
