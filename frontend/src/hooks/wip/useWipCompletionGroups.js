import { useMemo } from "react";
import {
  getSongCompletionPercentage,
  isSongComplete,
} from "../../utils/progressUtils";

/**
 * Custom hook for managing completion groups logic in WipPage
 */
export const useWipCompletionGroups = (
  songs,
  authoringFields,
  user,
  searchQuery
) => {
  const completionGroups = useMemo(() => {
    // Separate songs by category
    const completed = [];
    const inProgress = [];
    const optional = [];
    const collaboratorSongs = [];
    const optionalCollaboratorSongs = [];

    const matchesSearch = (s) => {
      if (!searchQuery) return true;
      const q = searchQuery.trim().toLowerCase();
      return [s.title, s.artist, s.album, s.pack_name]
        .map((v) => (v || "").toString().toLowerCase())
        .some((v) => v.includes(q));
    };

    songs.filter(matchesSearch).forEach((song) => {
      const isOwner = song.user_id === user?.id;
      const completionPercent = getSongCompletionPercentage(
        song,
        authoringFields
      );
      const isComplete = isSongComplete(song, authoringFields);

      // Check if user is a direct collaborator on this song
      const isDirectCollaborator = song.collaborations && song.collaborations.some(
        collab => collab.user_id === user?.id && 
        (collab.collaboration_type === 'SONG_EDIT' || collab.collaboration_type === 'song_edit')
      );

      if (isDirectCollaborator && !isOwner) {
        // Songs where user IS a collaborator (should be editable) - these go in "Collaboration songs"
        if (song.optional) {
          optional.push({ ...song, completionPercent });
        } else if (isComplete) {
          completed.push({ ...song, completionPercent });
        } else {
          inProgress.push({ ...song, completionPercent });
        }
      } else if (!isOwner && !isDirectCollaborator) {
        // Songs by collaborators - user has access but is NOT a collaborator (read-only)
        if (song.optional) {
          optionalCollaboratorSongs.push({ ...song, completionPercent });
        } else {
          collaboratorSongs.push({ ...song, completionPercent });
        }
      } else if (isOwner) {
        // Songs owned by current user
        if (song.optional) {
          // Optional songs by current user
          optional.push({ ...song, completionPercent });
        } else if (isComplete) {
          // Completed songs by current user
          completed.push({ ...song, completionPercent });
        } else {
          // In progress songs by current user
          inProgress.push({ ...song, completionPercent });
        }
      }
    });

    // Sort in progress songs by completion percentage (descending)
    inProgress.sort((a, b) => b.completionPercent - a.completionPercent);
    collaboratorSongs.sort((a, b) => b.completionPercent - a.completionPercent);

    return {
      completed,
      inProgress,
      optional,
      collaboratorSongs,
      optionalCollaboratorSongs,
    };
  }, [songs, authoringFields, user, searchQuery]);

  return {
    completionGroups,
  };
};

