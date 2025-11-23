import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "../../utils/api";

export const useCollaborationData = ({
  isOpen,
  collaborationType,
  packId,
  songId,
  currentUser
}) => {
  // Data state
  const [collaborators, setCollaborators] = useState([]);
  const [users, setUsers] = useState([]);
  const [packSongs, setPackSongs] = useState([]);
  const [wipCollaborations, setWipCollaborations] = useState({});

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