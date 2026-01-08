import { useState, useEffect, useMemo, useCallback } from "react";
import { apiGet } from "../../utils/api";
import { useWorkflowData } from "../workflows/useWorkflowData";
import { useUserWorkflowFields } from "../workflows/useUserWorkflowFields";
import { preloadOwnerWorkflows } from "../workflows/useOwnerWorkflows";
import {
  getCompletedFieldsCount,
  getSongCompletionPercentage,
  isSongComplete,
} from "../../utils/progressUtils";

export const useWipData = (user) => {
  const [songs, setSongs] = useState([]);
  const [packs, setPacks] = useState([]);
  const [userCollaborations, setUserCollaborations] = useState([]);
  const [collaborationsOnMyPacks, setCollaborationsOnMyPacks] = useState([]);
  const [collapsedPacks, setCollapsedPacks] = useState({});
  const [loading, setLoading] = useState(true);
  const [userWorkflowFields, setUserWorkflowFields] = useState({});
  const [packSortBy, setPackSortBy] = useState("completion"); // Default to completion for WIP

  // Get dynamic workflow fields for the current user
  const { authoringFields } = useWorkflowData(user);
  const { fetchUserWorkflowFields, getWorkflowFields, clearCache: clearWorkflowFieldsCache } =
    useUserWorkflowFields();

  // Helper to load songs with their workflow progress in one place
  const loadSongsWithProgress = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet("/songs/?status=In%20Progress");

      // After loading songs, fetch song_progress AND wip_collaborations for ALL songs in parallel
      let songsWithProgress = [];
      if (data && data.length > 0) {
        try {
          const songIds = data.map((s) => s.id).join(",");
          
          // Fetch both progress and WIP collaborations in parallel
          const [progressMap, wipCollaborationsMap] = await Promise.all([
            apiGet(`/workflows/songs/progress/bulk?song_ids=${songIds}`),
            apiGet(`/authoring/wip-collaborations/bulk?song_ids=${songIds}`)
          ]);

          songsWithProgress = data.map((s) => {
            // Handle new format: {progress: {...}, irrelevant_steps: [...]}
            // or legacy format: {step_name: is_completed, ...}
            const songProgressData = progressMap[s.id] || {};
            const hasNewFormat = songProgressData.progress !== undefined;
            
            return {
              ...s,
              progress: hasNewFormat ? songProgressData.progress : songProgressData,
              irrelevantSteps: hasNewFormat ? (songProgressData.irrelevant_steps || []) : [],
              wipCollaborations: wipCollaborationsMap[s.id] || [],
            };
          });
        } catch (e) {
          console.error("Failed to fetch bulk data:", e);
          // Fallback to original songs if bulk fetch fails
          songsWithProgress = data || [];
        }
      } else {
        songsWithProgress = data || [];
      }

      setSongs(songsWithProgress);

      // Fetch workflow fields for all unique song owners IMMEDIATELY (in parallel)
      // This ensures categorization happens quickly without waiting
      if (songsWithProgress.length > 0) {
        const uniqueUserIds = new Set();
        songsWithProgress.forEach((song) => {
          if (song.user_id) {
            uniqueUserIds.add(song.user_id);
          }
        });

        const uniqueUserIdsArray = Array.from(uniqueUserIds);

        // Fetch all workflow fields in parallel (non-blocking)
        // They'll be cached and available when grouping happens
        uniqueUserIdsArray.forEach((userId) => {
          fetchUserWorkflowFields(userId).then((fields) => {
            if (fields) {
              setUserWorkflowFields((prev) => ({
                ...prev,
                [userId]: fields,
              }));
            }
          }).catch((err) => {
            // Silent fail - will use fallback
            console.warn(`Failed to fetch workflow for user ${userId}:`, err);
          });
        });

        // PERFORMANCE: Also preload FULL owner workflows in the background
        // This ensures the "Edit Collaboration" modal opens instantly
        // Most users only collaborate with 2-3 other users, so this is minimal overhead
        preloadOwnerWorkflows(uniqueUserIdsArray).catch((err) => {
          // Silent fail - modal will fetch on demand if cache miss
          console.warn("Failed to preload owner workflows:", err);
        });
      }

      // Calculate pack completion and set initial collapsed state
      const packs = Array.from(
        new Set((songsWithProgress || []).map((s) => s.pack_name || "(no pack)"))
      );

      setCollapsedPacks((prev) => {
        const collapsed = {};
        packs.forEach((packName) => {
          // Preserve existing expanded state if pack exists, otherwise collapse by default
          collapsed[packName] =
            prev[packName] !== undefined ? prev[packName] : true;
        });
        return collapsed;
      });
    } catch (error) {
      console.error("Failed to load songs:", error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [fetchUserWorkflowFields]);

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

  // Note: We don't need to load packs separately since pack priority
  // comes from song data (pack_priority field) which is more reliable

  // Load songs
  useEffect(() => {
    loadSongsWithProgress();
  }, [authoringFields, loadSongsWithProgress]);

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

  // Update workflow fields from cache immediately when songs change
  // (Actual fetching happens in loadSongsWithProgress for better performance)
  useEffect(() => {
    const uniqueUserIds = new Set();
    songs.forEach((song) => {
      if (song.user_id) {
        uniqueUserIds.add(song.user_id);
      }
    });

    // Update state with cached workflow fields immediately
    const cachedFields = {};
    uniqueUserIds.forEach((userId) => {
      const cached = getWorkflowFields(userId);
      if (cached) {
        cachedFields[userId] = cached;
      }
    });
    if (Object.keys(cachedFields).length > 0) {
      setUserWorkflowFields((prev) => ({ ...prev, ...cachedFields }));
    }
  }, [songs, getWorkflowFields]);

  // Group songs by pack with statistics
  const grouped = useMemo(() => {
    // Helper to get workflow fields for a song's owner
    const getSongOwnerWorkflowFields = (song) => {
      if (!song.user_id) return authoringFields;
      // Use cached workflow fields if available, otherwise fall back to current user's
      return userWorkflowFields[song.user_id] || authoringFields;
    };

    // Helper to get pack priority from song data
    const getPackPriority = (packName, songsInPack) => {
      if (packName === "(no pack)") return null; // No priority for songs without pack
      // Get priority from the first song in the pack (all songs in a pack have the same pack_priority)
      const firstSong = songsInPack[0];
      return firstSong?.pack_priority || null;
    };

    // Group ALL songs by pack (both owned and collaborator songs)
    const groups = songs.reduce((acc, song) => {
      const pack = song.pack_name || "(no pack)";
      if (!acc[pack]) acc[pack] = [];
      const songOwnerFields = getSongOwnerWorkflowFields(song);
      acc[pack].push({
        ...song,
        filledCount: getCompletedFieldsCount(song, songOwnerFields),
        songOwnerFields, // Store for later use
      });
      return acc;
    }, {});

    const packStats = Object.entries(groups).map(([pack, songs]) => {
      const coreSongs = songs.filter((s) => !s.optional);
      const optionalSongs = songs.filter((s) => s.optional);

      // Calculate pack completion as total completed steps / total relevant steps
      // This correctly handles songs with different numbers of steps (due to N/A parts)
      let totalCompletedSteps = 0;
      let totalRelevantSteps = 0;
      coreSongs.forEach((song) => {
        const songOwnerFields = song.songOwnerFields || authoringFields;
        const completedCount = getCompletedFieldsCount(song, songOwnerFields);
        const relevantCount = songOwnerFields.filter(
          (f) => !song.irrelevantSteps?.includes(f)
        ).length;
        totalCompletedSteps += completedCount;
        totalRelevantSteps += relevantCount;
      });
      const percent =
        totalRelevantSteps > 0 ? Math.round((totalCompletedSteps / totalRelevantSteps) * 100) : 0;

      // Categorize songs within the pack by ownership and completion
      const ownedSongs = coreSongs.filter((song) => song.user_id === user?.id);

      // Only include songs where user is NOT a direct collaborator
      const collaboratorSongs = coreSongs.filter((song) => {
        const isOwner = song.user_id === user?.id;
        const isDirectCollaborator =
          song.collaborations &&
          song.collaborations.some(
            (collab) =>
              collab.user_id === user?.id &&
              (collab.collaboration_type === "SONG_EDIT" ||
                collab.collaboration_type === "song_edit")
          );
        return !isOwner && !isDirectCollaborator;
      });

      const collaboratorOptionalSongs = optionalSongs.filter((song) => {
        const isOwner = song.user_id === user?.id;
        const isDirectCollaborator =
          song.collaborations &&
          song.collaborations.some(
            (collab) =>
              collab.user_id === user?.id &&
              (collab.collaboration_type === "SONG_EDIT" ||
                collab.collaboration_type === "song_edit")
          );
        return !isOwner && !isDirectCollaborator;
      });

      const completedSongs = ownedSongs.filter((song) => {
        const songOwnerFields = song.songOwnerFields || authoringFields;
        return isSongComplete(song, songOwnerFields);
      });

      const inProgressSongs = ownedSongs.filter((song) => {
        const songOwnerFields = song.songOwnerFields || authoringFields;
        return !isSongComplete(song, songOwnerFields);
      });

      // Sort songs by completion percentage (descending - highest first)
      // Use each song's owner workflow for accurate sorting
      const sortByCompletion = (songList) => {
        return songList.sort((a, b) => {
          const aFields = a.songOwnerFields || authoringFields;
          const bFields = b.songOwnerFields || authoringFields;
          const aPercent = getSongCompletionPercentage(a, aFields);
          const bPercent = getSongCompletionPercentage(b, bFields);
          return bPercent - aPercent; // Descending order
        });
      };

      return {
        pack,
        percent,
        priority: getPackPriority(pack, songs),
        coreSongs: sortByCompletion(coreSongs),
        allSongs: sortByCompletion(songs),
        completedSongs: sortByCompletion(completedSongs),
        inProgressSongs: sortByCompletion(inProgressSongs),
        optionalSongs: sortByCompletion(optionalSongs),
        collaboratorSongs: sortByCompletion(collaboratorSongs),
        collaboratorOptionalSongs: sortByCompletion(collaboratorOptionalSongs),
      };
    });

    // Sort by user's choice: alphabetical, priority, or completion
    return packStats.sort((a, b) => {
      if (packSortBy === "alphabetical") {
        // Alphabetical sorting (case insensitive)
        return a.pack.toLowerCase().localeCompare(b.pack.toLowerCase());
      } else if (packSortBy === "priority") {
        // Priority sorting (highest first), then by alphabetical
        const aPriority = a.priority ?? 0; // null becomes 0
        const bPriority = b.priority ?? 0; // null becomes 0

        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        return a.pack.toLowerCase().localeCompare(b.pack.toLowerCase()); // Then alphabetically
      } else {
        // completion
        // Completion sorting (highest first), then by alphabetical
        if (a.percent !== b.percent) {
          return b.percent - a.percent; // Higher completion first
        }
        return a.pack.toLowerCase().localeCompare(b.pack.toLowerCase()); // Then alphabetically
      }
    });
  }, [songs, packs, authoringFields, userWorkflowFields, packSortBy]);

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
    // Clear workflow fields cache to ensure fresh data after workflow updates
    // This ensures new workflow steps are immediately visible
    clearWorkflowFieldsCache();
    
    // Use the same logic as the initial load so that
    // song.progress is always populated and pack percentages
    // remain correct after any refresh-triggering operation.
    await loadSongsWithProgress();
  };

  const updatePackPriorityLocal = (packId, priority) => {
    // Update local pack data immediately without triggering loading state
    setPacks((prevPacks) =>
      prevPacks.map((pack) =>
        pack.id === packId ? { ...pack, priority } : pack
      )
    );

    // ALSO update the pack_priority field on all songs in this pack
    // This is what the UI actually displays!
    setSongs((prevSongs) =>
      prevSongs.map((song) =>
        song.pack_id === packId ? { ...song, pack_priority: priority } : song
      )
    );
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
    updatePackPriorityLocal,
    loading,
    packSortBy,
    setPackSortBy,
  };
};
