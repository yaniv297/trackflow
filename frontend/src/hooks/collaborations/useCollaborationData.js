import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../../utils/api";

export const useCollaborationData = ({
  isOpen,
  collaborationType,
  packId,
  songId,
  currentUser,
  preloadedCollaborations = null, // Preloaded collaborations from song object (optional)
  preloadedWipCollaborations = null, // Preloaded WIP collaborations from song object (optional)
}) => {
  // Data state
  const [collaborators, setCollaborators] = useState([]);
  const [users, setUsers] = useState([]);
  const [packSongs, setPackSongs] = useState([]);
  // Initialize WIP collaborations with preloaded data if available
  const [wipCollaborations, setWipCollaborations] = useState(() => {
    if (collaborationType === "song" && songId && preloadedWipCollaborations) {
      return { [songId]: preloadedWipCollaborations };
    }
    return {};
  });

  // Loading states
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);

  // Refs to store functions and prevent dependency loops
  const loadCollaboratorsRef = useRef();
  const loadUsersRef = useRef();
  const loadPackSongsRef = useRef();
  const loadWipCollaborationsRef = useRef();

  // Load collaborators
  const loadCollaborators = useCallback(async () => {
    if (loadingCollaborators) return;
    
    // Use preloaded collaborations if available (for song collaborations)
    if (collaborationType === "song" && preloadedCollaborations && preloadedCollaborations.length > 0) {
      // Convert song collaborations format to CollaborationResponse format
      const formattedCollaborations = preloadedCollaborations.map((collab) => ({
        id: collab.id,
        pack_id: collab.pack_id || null,
        song_id: collab.song_id || songId,
        user_id: collab.user_id,
        username: collab.username || "Unknown",
        collaboration_type: collab.collaboration_type || collab.collaborationType || "song_edit",
        created_at: collab.created_at || new Date().toISOString(),
      }));
      setCollaborators(formattedCollaborations);
      return;
    }
    
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
  }, [collaborationType, packId, songId, loadingCollaborators, preloadedCollaborations]);

  // Load users for dropdown - use lightweight collaboration endpoint
  const loadUsers = useCallback(async () => {
    try {
      // Use the lightweight collaboration endpoint instead of admin-only /auth/users/
      const response = await apiGet("/collaborations/available-users");
      setUsers(response || []);
    } catch (error) {
      console.error("Error loading users:", error);
      // Set empty array on error so the modal can still function
      // (user dropdown will just be empty)
      setUsers([]);
    }
  }, []);

  // Load pack songs if needed
  const loadPackSongs = useCallback(async () => {
    if (collaborationType !== "pack" || !packId) return;
    try {
      const response = await apiGet(`/songs/?pack_id=${packId}`);
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
        // Use preloaded WIP collaborations if available, otherwise fetch
        if (preloadedWipCollaborations && preloadedWipCollaborations.length > 0) {
          wipData[songId] = preloadedWipCollaborations;
        } else {
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
      }

      setWipCollaborations(wipData);
    } catch (error) {
      console.error("Error loading WIP collaborations:", error);
    }
  }, [collaborationType, songId, packSongs, preloadedWipCollaborations]);

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
        // Always load WIP collaborations when modal opens for song
        // If preloaded data exists, it will be used immediately
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

  return {
    // Data
    collaborators,
    users,
    packSongs,
    wipCollaborations,
    groupedCollaborators,
    
    // Loading states
    loadingCollaborators,
    
    // Functions
    loadCollaborators,
    loadUsers,
    loadPackSongs,
    loadWipCollaborations,
    setWipCollaborations
  };
};