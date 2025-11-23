import { useState, useCallback } from "react";
import { apiGet } from "../../utils/api";

export const useCollaborations = () => {
  const [userCollaborations, setUserCollaborations] = useState([]);
  const [collaborationsOnMyPacks, setCollaborationsOnMyPacks] = useState([]);

  const fetchCollaborations = useCallback(async () => {
    try {
      const [userCollabs, myPackCollabs] = await Promise.all([
        apiGet("/collaborations/my-collaborations"),
        apiGet("/collaborations/on-my-packs"),
      ]);
      setUserCollaborations(userCollabs);
      setCollaborationsOnMyPacks(myPackCollabs);
    } catch (error) {
      console.error("Failed to fetch collaborations:", error);
    }
  }, []);

  const getPackCollaborators = useCallback(
    (packId, validSongsInPack) => {
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
      validSongsInPack.forEach((song) => {
        if (song.collaborations && song.collaborations.length > 0) {
          song.collaborations.forEach((collab) => {
            if (collab.collaboration_type === "song_edit") {
              collaborators.add(collab.username);
            }
          });
        }
      });

      return collaborators.size > 0 ? Array.from(collaborators) : null;
    },
    [userCollaborations, collaborationsOnMyPacks]
  );

  return {
    userCollaborations,
    collaborationsOnMyPacks,
    fetchCollaborations,
    getPackCollaborators,
  };
};

export default useCollaborations;
