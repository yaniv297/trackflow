import { useState } from "react";
import { apiPost, apiDelete, apiPut } from "../../utils/api";

export const useCollaborationOperations = ({
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
}) => {
  const [loading, setLoading] = useState(false);

  const handleSaveAll = async (pendingCollaborations, pendingRemovals, pendingWipChanges) => {
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
          // Give full pack permissions (PACK_VIEW + PACK_EDIT) - NO individual song collaborations
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: collab.user_id,
            permissions: collab.permissions,
          });
        } else if (collab.type === "readonly") {
          // Give read-only pack permissions (PACK_VIEW only)
          await apiPost(`/collaborations/packs/${packId}/collaborate`, {
            user_id: collab.user_id,
            permissions: collab.permissions,
          });
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
      for (const [targetSongId, assignments] of Object.entries(pendingWipChanges)) {
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

      await loadCollaborators();
      await loadWipCollaborations();

      // Notify parent component to refresh data
      if (onCollaborationSaved) {
        await onCollaborationSaved();
      }

      onClose();
    } catch (error) {
      console.error("Error saving collaborations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (
    editingCollaborator,
    selectedInstruments,
    setWipCollaborations,
    uiToDbFieldMap
  ) => {
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

  return {
    loading,
    handleSaveAll,
    handleSaveEdit
  };
};