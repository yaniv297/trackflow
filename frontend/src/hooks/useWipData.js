import { useState, useEffect, useMemo } from "react";
import { apiGet } from "../utils/api";
import { useWorkflowData } from "./useWorkflowData";

export const useWipData = (user) => {
  const [songs, setSongs] = useState([]);
  const [userCollaborations, setUserCollaborations] = useState([]);
  const [collaborationsOnMyPacks, setCollaborationsOnMyPacks] = useState([]);
  const [collapsedPacks, setCollapsedPacks] = useState({});
  const [loading, setLoading] = useState(true);

  // Get dynamic workflow fields for the current user
  const { authoringFields } = useWorkflowData(user);

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
    setLoading(true);
    apiGet("/songs/?status=In%20Progress")
      .then(async (data) => {
        // After loading songs, fetch song_progress for each song and merge
        try {
          const progressResponses = await Promise.all(
            (data || []).map(async (song) => {
              try {
                const rows = await apiGet(
                  `/workflows/songs/${song.id}/progress`
                );
                const map = {};
                (rows || []).forEach((r) => {
                  map[r.step_name] = !!r.is_completed;
                });
                return { id: song.id, progress: map };
              } catch (e) {
                return { id: song.id, progress: {} };
              }
            })
          );

          const idToProgress = new Map(
            progressResponses.map((p) => [p.id, p.progress])
          );

          const songsWithProgress = data.map((s) => ({
            ...s,
            progress: idToProgress.get(s.id) || {},
          }));

          setSongs(songsWithProgress);
        } catch (e) {
          // Fallback to original songs if progress fetch fails
          setSongs(data);
        }

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
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authoringFields]);

  // Load user collaborations
  useEffect(() => {
    if (user) {
      // Fetch collaborations where current user is a collaborator
      apiGet("/collaborations/my-collaborations")
        .then((data) => {
          setUserCollaborations(data);
        })
        .catch((err) =>
          console.error("Failed to fetch user collaborations:", err)
        );

      // Fetch collaborations on packs owned by current user
      apiGet("/collaborations/on-my-packs")
        .then((data) => {
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

      // Use the same logic as WipSongCard: check progress first, then song.authoring
      // This matches the UI display logic exactly
      const filledCount = authoringFields.reduce((count, field) => {
        // Check if song has progress data (from song_progress table)
        if (song.progress && song.progress.hasOwnProperty(field)) {
          return count + (song.progress[field] === true ? 1 : 0);
        }
        // Fallback to song.authoring
        if (song.authoring && song.authoring.hasOwnProperty(field)) {
          return count + (song.authoring[field] === true ? 1 : 0);
        }
        return count; // Field doesn't exist in either, so it's not completed
      }, 0);

      // Debug logging for specific songs
      if (
        song.title === "And it Stoned Me" ||
        song.title === "Into the Mystic"
      ) {
        console.log(`SONG DEBUG - ${song.title}:`, {
          filledCount,
          authoringFieldsLength: authoringFields.length,
          authoring: song.authoring,
          progress: song.progress,
          fieldValues: authoringFields.map((field) => ({
            field,
            progressValue: song.progress?.[field],
            authoringValue: song.authoring?.[field],
            hasProgressProperty:
              song.progress && song.progress.hasOwnProperty(field),
            hasAuthoringProperty:
              song.authoring && song.authoring.hasOwnProperty(field),
          })),
        });
      }

      return filledCount;
    };

    // Group ALL songs by pack (both owned and collaborator songs)
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
      const optionalSongs = songs.filter((s) => s.optional);

      // Calculate total parts based on workflow fields (consistent total for all songs)
      const totalParts = coreSongs.length * authoringFields.length;

      const filledParts = coreSongs.reduce(
        (sum, song) => sum + song.filledCount,
        0
      );
      const percent =
        totalParts > 0 ? Math.round((filledParts / totalParts) * 100) : 0;

      // Categorize songs within the pack by ownership and completion
      const ownedSongs = coreSongs.filter((song) => song.user_id === user?.id);
      const collaboratorSongs = coreSongs.filter(
        (song) => song.user_id !== user?.id
      );
      const collaboratorOptionalSongs = optionalSongs.filter(
        (song) => song.user_id !== user?.id
      );

      const completedSongs = ownedSongs.filter((song) => {
        if (!song.authoring) return false;
        const filledCount = getFilledCount(song);
        return filledCount === authoringFields.length;
      });

      const inProgressSongs = ownedSongs.filter((song) => {
        if (!song.authoring) return true;
        const filledCount = getFilledCount(song);
        return filledCount < authoringFields.length; // Only songs that are NOT complete
      });

      // Sort songs by completion percentage (descending - highest first)
      const sortByCompletion = (songList) => {
        return songList.sort((a, b) => {
          const aPercent = a.filledCount / authoringFields.length;
          const bPercent = b.filledCount / authoringFields.length;
          return bPercent - aPercent; // Descending order
        });
      };

      return {
        pack,
        percent,
        coreSongs: sortByCompletion(coreSongs),
        allSongs: sortByCompletion(songs),
        completedSongs: sortByCompletion(completedSongs),
        inProgressSongs: sortByCompletion(inProgressSongs),
        optionalSongs: sortByCompletion(optionalSongs),
        collaboratorSongs: sortByCompletion(collaboratorSongs),
        collaboratorOptionalSongs: sortByCompletion(collaboratorOptionalSongs),
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
      setLoading(true);
      const data = await apiGet("/songs/?status=In%20Progress");
      setSongs(data);
    } catch (error) {
      console.error("Failed to refresh songs:", error);
    } finally {
      setLoading(false);
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
    loading,
  };
};
