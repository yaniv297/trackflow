import { useState, useEffect, useMemo } from "react";
import { apiGet } from "../utils/api";

export const useWipData = (user) => {
  const [songs, setSongs] = useState([]);
  const [userCollaborations, setUserCollaborations] = useState([]);
  const [collaborationsOnMyPacks, setCollaborationsOnMyPacks] = useState([]);
  const [collapsedPacks, setCollapsedPacks] = useState({});

  const authoringFields = useMemo(
    () => [
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
    ],
    []
  );

  // Helper function to get list of collaborating users for a pack
  const getPackCollaborators = (packId, validSongsInPack) => {
    if (!packId) return null;

    const collaborators = new Set();

    // Check if current user is a collaborator on the pack - add pack owner
    const isPackCollaborator = userCollaborations.some(
      (collab) =>
        collab.pack_id === parseInt(packId) &&
        (collab.collaboration_type === "pack_view" ||
          collab.collaboration_type === "pack_edit")
    );

    if (isPackCollaborator) {
      const packOwner =
        validSongsInPack[0]?.pack_owner_username ||
        validSongsInPack[0]?.author ||
        "unknown";
      collaborators.add(packOwner);
    }

    // Check if current user owns pack - add all collaborators
    const myPackCollabs = collaborationsOnMyPacks.filter(
      (collab) =>
        collab.pack_id === parseInt(packId) &&
        (collab.collaboration_type === "pack_view" ||
          collab.collaboration_type === "pack_edit")
    );

    myPackCollabs.forEach((collab) => {
      collaborators.add(collab.username);
    });

    // Check for individual song collaborations within this pack
    validSongsInPack.forEach((song) => {
      if (song.collaborations && song.collaborations.length > 0) {
        song.collaborations.forEach((collab) => {
          if (collab.collaboration_type === "song_edit") {
            collaborators.add(collab.username);
          }
        });
      }
    });

    // Also check if current user is a collaborator on any song in this pack
    // This is the key fix for the "make collab" scenario
    const isSongCollaborator = userCollaborations.some(
      (collab) =>
        collab.song_id &&
        collab.collaboration_type === "song_edit" &&
        validSongsInPack.some((song) => song.id === collab.song_id)
    );

    if (isSongCollaborator) {
      // Add the song owner(s) as collaborators
      validSongsInPack.forEach((song) => {
        if (song.user_id !== user?.id) {
          // Don't add self
          const songOwner = song.author || "unknown";
          collaborators.add(songOwner);
        }
      });
    }

    // Filter out current user - you don't collaborate with yourself
    collaborators.delete(user?.username);

    return collaborators.size > 0 ? Array.from(collaborators) : null;
  };

  // Load songs
  useEffect(() => {
    apiGet("/songs/?status=In%20Progress")
      .then((data) => {
        setSongs(data);

        // Calculate pack completion and set initial collapsed state
        const packs = Array.from(
          new Set(data.map((s) => s.pack_name || "(no pack)"))
        );
        const collapsed = {};

        packs.forEach((packName) => {
          // ALL PACKS ALWAYS COLLAPSED BY DEFAULT
          collapsed[packName] = true;
        });

        setCollapsedPacks(collapsed);
      })
      .catch((error) => {
        console.error("Failed to load songs:", error);
        setSongs([]);
      });
  }, [authoringFields]);

  // Load user collaborations
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

  // Group songs by pack with statistics
  const grouped = useMemo(() => {
    const getFilledCount = (song) => {
      if (!song.authoring) return 0;
      return authoringFields.reduce((count, field) => {
        return count + (song.authoring[field] === true ? 1 : 0);
      }, 0);
    };

    const groups = songs.reduce((acc, song) => {
      const pack = song.pack_name || "(no pack)";
      if (!acc[pack]) acc[pack] = [];
      acc[pack].push({
        ...song,
        filledCount: getFilledCount(song),
      });
      return acc;
    }, {});

    const packStats = Object.entries(groups).map(([pack, songs]) => {
      const coreSongs = songs.filter((s) => !s.optional);
      const totalParts = coreSongs.length * authoringFields.length;
      const filledParts = coreSongs.reduce(
        (sum, song) => sum + song.filledCount,
        0
      );
      const percent =
        totalParts > 0 ? Math.round((filledParts / totalParts) * 100) : 0;

      return {
        pack,
        percent,
        coreSongs,
        allSongs: songs,
      };
    });

    return packStats.sort((a, b) => b.percent - a.percent);
  }, [songs, authoringFields]);

  const refreshCollaborations = async () => {
    if (user) {
      try {
        const [userCollabs, myPackCollabs] = await Promise.all([
          apiGet("/collaborations/my-collaborations"),
          apiGet("/collaborations/on-my-packs"),
        ]);
        setUserCollaborations(userCollabs);
        setCollaborationsOnMyPacks(myPackCollabs);
      } catch (error) {
        console.error("Failed to refresh collaborations:", error);
      }
    }
  };

  const refreshSongs = async () => {
    try {
      const data = await apiGet("/songs/?status=In%20Progress");
      setSongs(data);
    } catch (error) {
      console.error("Failed to refresh songs:", error);
    }
  };

  return {
    songs,
    setSongs,
    userCollaborations,
    collaborationsOnMyPacks,
    collapsedPacks,
    setCollapsedPacks,
    grouped,
    authoringFields,
    getPackCollaborators,
    refreshCollaborations,
    refreshSongs,
  };
};
