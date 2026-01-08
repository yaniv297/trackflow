import React, { useState } from "react";
import EditableCell from "../ui/EditableCell";
import SpotifyEnhancementRow from "../music/SpotifyEnhancementRow";
import SmartDropdown from "../ui/SmartDropdown";
import CustomAlert from "../ui/CustomAlert";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfilePopup } from "../../hooks/ui/useUserProfilePopup";
import UserProfilePopup from "../shared/UserProfilePopup";
import publicSongsService from "../../services/publicSongsService";
import { apiPatch } from "../../utils/api";

// Content Rating options
const RATING_OPTIONS = [
  { value: null, icon: "—", color: "#999", label: "Not Rated" },
  { value: "family_friendly", icon: "👨‍👩‍👧‍👦", color: "#28a745", label: "Family Friendly" },
  { value: "supervision", icon: "⚠️", color: "#ffc107", label: "Supervision Recommended" },
  { value: "mature", icon: "🔞", color: "#dc3545", label: "Mature" },
];

// Needs Update Cell Component
const NeedsUpdateCell = ({ song, onSongUpdate, isEditable }) => {
  const [saving, setSaving] = useState(false);
  const hasUpdateStatus = song.update_status !== null && song.update_status !== undefined;

  const toggleUpdateStatus = async () => {
    if (!isEditable || saving) return;
    
    setSaving(true);
    try {
      const newUpdateStatus = hasUpdateStatus ? null : "future_plans";
      await apiPatch(`/songs/${song.id}`, { update_status: newUpdateStatus });
      if (onSongUpdate) {
        onSongUpdate(song.id, { update_status: newUpdateStatus });
      }
      
      // If marking as needs update, trigger refresh for Future Plans page specifically
      // This ensures it appears immediately there without refreshing Released page
      // We don't invalidate cache here to avoid refreshing the current page
      if (newUpdateStatus) {
        window.dispatchEvent(new CustomEvent("refresh-future-plans"));
      }
      
      if (window.showNotification) {
        window.showNotification(
          newUpdateStatus 
            ? "Song marked as needs update - it will appear in Future Plans" 
            : "Update status cleared",
          "success"
        );
      }
    } catch (error) {
      console.error("Failed to update needs update status:", error);
      if (window.showNotification) {
        window.showNotification("Failed to update status", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <button
        onClick={toggleUpdateStatus}
        disabled={!isEditable || saving}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.25rem",
          borderRadius: "4px",
          background: hasUpdateStatus ? "#ffc10720" : "transparent",
          border: `1px solid ${hasUpdateStatus ? "#ffc107" : "#ddd"}`,
          fontSize: hasUpdateStatus ? "1.1rem" : "0.9rem",
          cursor: isEditable ? "pointer" : "default",
          opacity: saving ? 0.5 : (!isEditable ? 0.7 : 1),
          minWidth: "28px",
          height: "28px",
        }}
        title={hasUpdateStatus ? "Update planned - click to clear" : "Click to mark as needs update"}
      >
        {saving ? "…" : hasUpdateStatus ? "✓" : "○"}
      </button>
    </div>
  );
};

// Content Rating Cell Component
const ContentRatingCell = ({ song, onSongUpdate, isEditable }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentRating = RATING_OPTIONS.find(r => r.value === song.content_rating) || RATING_OPTIONS[0];

  const updateRating = async (newValue) => {
    setSaving(true);
    try {
      await apiPatch(`/songs/${song.id}`, { content_rating: newValue });
      if (onSongUpdate) {
        onSongUpdate(song.id, { content_rating: newValue });
      }
      setShowDropdown(false);
      const ratingLabel = RATING_OPTIONS.find(r => r.value === newValue)?.label || "Not Rated";
      if (window.showNotification) {
        window.showNotification(`Content rating set to ${ratingLabel}`, "success");
      }
    } catch (error) {
      console.error("Failed to update content rating:", error);
      if (window.showNotification) {
        window.showNotification("Failed to update content rating", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => isEditable && !saving && setShowDropdown(!showDropdown)}
        disabled={!isEditable || saving}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.15rem 0.3rem",
          borderRadius: "4px",
          background: currentRating.value ? `${currentRating.color}15` : "#f8f9fa",
          border: `1px solid ${currentRating.value ? currentRating.color : "#ddd"}`,
          fontSize: "1rem",
          cursor: isEditable ? "pointer" : "default",
          opacity: saving ? 0.5 : (!isEditable ? 0.7 : 1),
          minWidth: "28px",
          height: "28px",
        }}
        title={`${currentRating.label}${isEditable ? " - Click to change" : ""}`}
      >
        {saving ? "…" : currentRating.icon}
      </button>

      {showDropdown && isEditable && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowDropdown(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: "4px",
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: "1px solid #e0e0e0",
              zIndex: 1000,
              minWidth: "200px",
              overflow: "hidden",
            }}
          >
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value || "null"}
                onClick={() => updateRating(option.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "none",
                  background: song.content_rating === option.value ? `${option.color}10` : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  borderLeft: song.content_rating === option.value ? `3px solid ${option.color}` : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (song.content_rating !== option.value) {
                    e.currentTarget.style.background = "#f5f5f5";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = song.content_rating === option.value ? `${option.color}10` : "transparent";
                }}
              >
                <span style={{ fontSize: "1rem" }}>{option.icon}</span>
                <span style={{ fontSize: "0.85rem", color: option.color, fontWeight: "500" }}>
                  {option.label}
                </span>
                {song.content_rating === option.value && (
                  <span style={{ marginLeft: "auto", color: option.color }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Color palette for collaborators
const collaboratorColors = [
  "#3498db", // Blue
  "#e74c3c", // Red
  "#2ecc71", // Green
  "#f39c12", // Orange
  "#9b59b6", // Purple
  "#1abc9c", // Turquoise
  "#e67e22", // Dark Orange
  "#34495e", // Dark Blue
  "#16a085", // Dark Green
  "#8e44ad", // Dark Purple
  "#27ae60", // Emerald
  "#d35400", // Pumpkin
  "#c0392b", // Dark Red
  "#2980b9", // Dark Blue
  "#f1c40f", // Yellow
];

// Function to get consistent color for each collaborator
const getCollaboratorColor = (collaboratorName) => {
  // Handle undefined or null collaborator names
  if (!collaboratorName || typeof collaboratorName !== "string") {
    return collaboratorColors[0]; // Return first color as fallback
  }

  // Simple hash function to get consistent color for each collaborator
  let hash = 0;
  for (let i = 0; i < collaboratorName.length; i++) {
    const char = collaboratorName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % collaboratorColors.length;
  return collaboratorColors[index];
};

export default function SongRow({
  song,
  selected,
  onSelect,
  visibleColumns = {},
  editing,
  editValues,
  setEditing,
  setEditValues,
  saveEdit,
  fetchSpotifyOptions,
  handleDelete,
  spotifyOptions,
  setSpotifyOptions,
  applySpotifyEnhancement,
  status,
  groupBy,
  packName,
  onSongUpdate,
}) {
  const { user } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearUpdateConfirm, setShowClearUpdateConfirm] = useState(false);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [clearingUpdate, setClearingUpdate] = useState(false);

  const hasUpdateStatus = song.update_status !== null && song.update_status !== undefined;
  const { popupState, handleUsernameClick, hidePopup } = useUserProfilePopup();

  // Helper function to check if a column should be displayed
  const shouldShowColumn = (columnKey) => {
    if (!visibleColumns[columnKey]) return true; // Default to showing if not specified
    return visibleColumns[columnKey].enabled && !visibleColumns[columnKey].groupHidden;
  };

  // Handle public status toggle
  const handleTogglePublic = async () => {
    if (isTogglingPublic) return;
    
    setIsTogglingPublic(true);
    try {
      const result = await publicSongsService.toggleSongPublic(song.id);
      if (result.success && onSongUpdate) {
        // Update the song in parent component
        onSongUpdate(song.id, { is_public: result.data.is_public });
      }
    } catch (error) {
      console.error('Error toggling song public status:', error);
    } finally {
      setIsTogglingPublic(false);
    }
  };

  // Handle clearing update status
  const handleClearUpdate = async () => {
    setClearingUpdate(true);
    try {
      await apiPatch(`/songs/${song.id}`, { update_status: null });
      if (onSongUpdate) {
        onSongUpdate(song.id, { update_status: null });
      }
      
      // Trigger refresh for Future Plans/WIP pages to remove the song
      window.dispatchEvent(new CustomEvent("refresh-future-plans"));
      
      if (window.showNotification) {
        window.showNotification(
          "Update status cleared - song is now a normal released song",
          "success"
        );
      }
      setShowClearUpdateConfirm(false);
    } catch (error) {
      console.error('Failed to clear update status:', error);
      if (window.showNotification) {
        window.showNotification('Failed to clear update status', 'error');
      }
    } finally {
      setClearingUpdate(false);
    }
  };

  return (
    <>
      <tr
        style={{
          backgroundColor: selected ? "#e3f2fd" : "white",
          borderBottom: "1px solid #eee",
        }}
      >
        {/* Checkbox */}
        <td style={{ padding: "8px", width: "40px" }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e)}
            style={{ cursor: "pointer" }}
          />
        </td>

        {/* Album Cover */}
        {shouldShowColumn("cover") && (
          <td style={{ padding: "8px" }}>
            <EditableCell
              value={song.album_cover || ""}
              songId={song.id}
              field="album_cover"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Title */}
        {shouldShowColumn("title") && (
          <td style={{ padding: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <EditableCell
                value={song.title}
                songId={song.id}
                field="title"
                editing={editing}
                editValues={editValues}
                setEditing={setEditing}
                setEditValues={setEditValues}
                saveEdit={saveEdit}
                isEditable={song.is_editable}
              />
              {/* Show update icon in Future Plans/WIP if song has update_status */}
              {(status === "Future Plans" || status === "In Progress") && 
               song.update_status && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "0.9rem",
                    color: "#856404",
                    cursor: "help",
                  }}
                  title="This is an update to an already released song - it will appear in both Released and this view until the update is complete"
                >
                  🔁
                </span>
              )}
            </div>
          </td>
        )}

        {/* Artist */}
        {groupBy !== "artist" && shouldShowColumn("artist") && (
          <td style={{ padding: "8px" }}>
            <EditableCell
              value={song.artist}
              songId={song.id}
              field="artist"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Album */}
        {shouldShowColumn("album") && (
          <td style={{ padding: "8px" }}>
            <EditableCell
              value={song.album}
              songId={song.id}
              field="album"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Pack */}
        {groupBy !== "pack" && shouldShowColumn("pack") && (
          <td style={{ padding: "8px" }}>
            <EditableCell
              value={song.pack_name || ""}
              songId={song.id}
              field="pack"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Author */}
        {shouldShowColumn("author") && (
          <td style={{ padding: "8px" }}>
            <span
              style={{
                background: getCollaboratorColor(song.author || "Unknown"),
                color: "white",
                padding: "2px 6px",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: "500",
                cursor: "pointer",
                display: "inline-block",
              }}
              onClick={handleUsernameClick(song.author || "Unknown")}
              title="Click to view profile"
            >
              {song.author || "Unknown"}
            </span>
          </td>
        )}

        {/* Year */}
        {shouldShowColumn("year") && (
          <td style={{ padding: "8px" }}>
            <EditableCell
              value={song.year || ""}
              songId={song.id}
              field="year"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Content Rating */}
        {shouldShowColumn("content_rating") && (
          <td style={{ padding: "8px", textAlign: "center" }}>
            <ContentRatingCell 
              song={song} 
              onSongUpdate={onSongUpdate}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Notes */}
        {shouldShowColumn("notes") && (
          <td style={{ padding: "8px" }}>
            <EditableCell
              value={song.notes || ""}
              songId={song.id}
              field="notes"
              editing={editing}
              editValues={editValues}
              setEditing={setEditing}
              setEditValues={setEditValues}
              saveEdit={saveEdit}
              isEditable={song.is_editable}
              placeholder="Progress notes..."
            />
          </td>
        )}

        {/* Collaborations */}
        {shouldShowColumn("collaborations") && (
          <td style={{ padding: "8px" }}>
          {editing[`${song.id}_collaborations`] && status !== "Future Plans" ? (
            <SmartDropdown
              type="users"
              value={
                editValues[`${song.id}_collaborations`] ??
                (song.collaborations && song.collaborations.length > 0
                  ? song.collaborations
                      .filter((collab) => collab.username !== user.username)
                      .map((collab) => collab.username)
                      .join(", ")
                  : "")
              }
              onChange={(value) =>
                setEditValues((prev) => ({
                  ...prev,
                  [`${song.id}_collaborations`]: value,
                }))
              }
              onBlur={() => saveEdit(song.id, "collaborations")}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit(song.id, "collaborations");
              }}
              placeholder="Select or add collaborators..."
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
                minHeight: "20px",
              }}
            >
              {/* Show collaborators (excluding the song owner) */}
              {song.collaborations && song.collaborations.length > 0
                ? song.collaborations
                    .filter((collab) => collab.username !== song.author)
                    .map((collab) => (
                      <span
                        key={collab.id}
                        style={{
                          background: getCollaboratorColor(collab.username),
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        onClick={handleUsernameClick(collab.username)}
                        title="Click to view profile"
                      >
                        {collab.username}
                      </span>
                    ))
                : null}

              {/* Show "None" if no collaborators */}
              {(!song.collaborations || song.collaborations.length === 0) && (
                <span style={{ color: "#ccc", fontSize: "0.85rem" }}>
                  {status === "Future Plans" ? "Managed via pack" : "None"}
                </span>
              )}
            </div>
          )}
          </td>
        )}

        {/* Visibility */}
        {shouldShowColumn("visibility") && (
          <td style={{ padding: "8px", textAlign: "center" }}>
            {song.user_id === user?.id ? (
              <button
                onClick={handleTogglePublic}
                disabled={isTogglingPublic}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: isTogglingPublic ? "not-allowed" : "pointer",
                  fontSize: "1.2rem",
                  padding: "4px",
                  opacity: isTogglingPublic ? 0.6 : 1,
                  borderRadius: "4px",
                }}
                title={`Make song ${song.is_public ? 'private' : 'public'}`}
              >
                {song.is_public ? '🌐' : '🔒'}
              </button>
            ) : (
              <span 
                style={{ 
                  fontSize: "1.2rem",
                  opacity: 0.7
                }}
                title={song.is_public ? 'Public song' : 'Private song'}
              >
                {song.is_public ? '🌐' : '🔒'}
              </span>
            )}
          </td>
        )}

        {/* Needs Update */}
        {shouldShowColumn("needs_update") && (
          <td style={{ padding: "8px", textAlign: "center" }}>
            <NeedsUpdateCell 
              song={song} 
              onSongUpdate={onSongUpdate}
              isEditable={song.is_editable}
            />
          </td>
        )}

        {/* Actions (Enhance + Delete) */}
        {shouldShowColumn("actions") && (
          <td style={{ padding: "8px" }}>
          {song.is_editable && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              {spotifyOptions[song.id] ? (
                <button
                  onClick={() =>
                    setSpotifyOptions((prev) => ({
                      ...prev,
                      [song.id]: undefined,
                    }))
                  }
                >
                  Cancel
                </button>
              ) : (
                <button onClick={() => fetchSpotifyOptions(song)}>
                  Enhance
                </button>
              )}
              {song.user_id === user?.id && (
                <>
                  {hasUpdateStatus ? (
                    <button
                      onClick={() => setShowClearUpdateConfirm(true)}
                      disabled={clearingUpdate}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#856404",
                        cursor: clearingUpdate ? "not-allowed" : "pointer",
                        fontWeight: "bold",
                        opacity: clearingUpdate ? 0.5 : 1,
                      }}
                      title="Don't Update - Remove update status"
                    >
                      ❌
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "red",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                      title="Delete Song"
                    >
                      ❌
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          </td>
        )}
      </tr>

      {/* Spotify Enhancement Row */}
      <SpotifyEnhancementRow
        songId={song.id}
        options={spotifyOptions[song.id]}
        onApply={applySpotifyEnhancement}
      />

      {/* User Profile Popup */}
      <UserProfilePopup
        username={popupState.username}
        isVisible={popupState.isVisible}
        position={popupState.position}
        onClose={hidePopup}
      />

      <CustomAlert
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          handleDelete(song.id);
          setShowDeleteConfirm(false);
        }}
        title="Delete Song"
        message={`Are you sure you want to delete "${song.title}" by ${song.artist}?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <CustomAlert
        isOpen={showClearUpdateConfirm}
        onClose={() => setShowClearUpdateConfirm(false)}
        onConfirm={handleClearUpdate}
        title="Don't Update"
        message={`This will clear the update status for "${song.title}" by ${song.artist}. The song will remain released but will no longer appear in Future Plans/WIP.`}
        confirmText="Don't Update"
        cancelText="Cancel"
        type="warning"
      />
    </>
  );
}
