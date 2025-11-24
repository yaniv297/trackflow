import React, { useState, useEffect } from "react";
import { exportYargIni } from "../../../utils/yargUtils";
import { apiPost } from "../../../utils/api";

/**
 * Component for the song actions dropdown menu
 */
const SongActions = ({
  song,
  isFinished,
  wipCollaborations,
  currentUser,
  loadingSpotify,
  onReleaseSong,
  onShowCollaborationModal,
  onMarkAllDone,
  onLoadSpotifyOptions,
  onShowMovePackModal,
  onShowChangeAlbumArtModal,
  onDelete,
  onSongUpdate,
  readOnly = false,
}) => {
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showActionsDropdown &&
        !event.target.closest("[data-actions-dropdown]")
      ) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showActionsDropdown]);

  if (readOnly || !song.is_editable) {
    return null;
  }

  const handleExportYarg = () => {
    exportYargIni(song, currentUser, wipCollaborations);
    setShowActionsDropdown(false);
    window.showNotification("YARG song.ini file downloaded", "success");
  };

  const handleToggleVisibility = async () => {
    setTogglingVisibility(true);
    try {
      const response = await apiPost(`/api/public-songs/songs/${song.id}/toggle-public`);
      
      if (onSongUpdate) {
        onSongUpdate(song.id, { is_public: response.is_public });
      }
      
      window.showNotification(
        `Song ${response.is_public ? 'made public' : 'made private'}`,
        "success"
      );
      setShowActionsDropdown(false);
    } catch (error) {
      console.error('Failed to toggle song visibility:', error);
      window.showNotification('Failed to toggle song visibility', 'error');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const buttonStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "block",
    width: "100%",
    padding: "0.5rem 1rem",
    textAlign: "left",
    color: "#5a8fcf",
    fontSize: "0.9rem",
  };

  const deleteButtonStyle = {
    ...buttonStyle,
    color: "#e74c3c",
  };

  const releaseButtonStyle = {
    ...buttonStyle,
    color: "#28a745",
    fontWeight: "bold",
  };

  return (
    <div style={{ position: "relative" }} data-actions-dropdown>
      <button
        onClick={() => setShowActionsDropdown(!showActionsDropdown)}
        style={{
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "24px",
          height: "24px",
          fontSize: "12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#0056b3";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "#007bff";
        }}
        title="Song actions"
      >
        ⚙️
      </button>

      {showActionsDropdown && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 1000,
            minWidth: "160px",
            padding: "0.5rem 0",
          }}
        >
          {/* Release Song button - only for completed packless songs - PUT FIRST */}
          {isFinished && !song.pack_name && onReleaseSong && (
            <button
              onClick={() => {
                onReleaseSong(song.id);
                setShowActionsDropdown(false);
              }}
              style={releaseButtonStyle}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f0f9f0";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
              }}
            >
              🚀 Release Song
            </button>
          )}

          <button
            onClick={() => {
              onShowCollaborationModal();
              setShowActionsDropdown(false);
            }}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            {wipCollaborations.length > 0
              ? "Edit Collab"
              : "Make Collab"}
          </button>

          <button
            onClick={() => {
              onMarkAllDone();
              setShowActionsDropdown(false);
            }}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            Mark All Done
          </button>

          <button
            onClick={() => {
              onLoadSpotifyOptions();
              setShowActionsDropdown(false);
            }}
            disabled={loadingSpotify}
            style={{
              ...buttonStyle,
              cursor: loadingSpotify ? "not-allowed" : "pointer",
              color: loadingSpotify ? "#999" : "#5a8fcf",
            }}
            onMouseEnter={(e) => {
              if (!loadingSpotify) {
                e.target.style.backgroundColor = "#f8f9fa";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            {loadingSpotify ? "⏳ Loading..." : "Enhance from Spotify"}
          </button>

          <button
            onClick={() => {
              onShowMovePackModal();
              setShowActionsDropdown(false);
            }}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            Move to Pack
          </button>

          <button
            onClick={() => {
              onShowChangeAlbumArtModal();
              setShowActionsDropdown(false);
            }}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            Change Album Art
          </button>

          <button
            onClick={handleExportYarg}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f8f9fa";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            Export YARG .ini
          </button>

          <button
            onClick={handleToggleVisibility}
            disabled={togglingVisibility}
            style={{
              ...buttonStyle,
              cursor: togglingVisibility ? "not-allowed" : "pointer",
              color: togglingVisibility ? "#999" : (song.is_public ? "#28a745" : "#ffc107"),
            }}
            onMouseEnter={(e) => {
              if (!togglingVisibility) {
                e.target.style.backgroundColor = "#f8f9fa";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            {togglingVisibility ? "⏳ Updating..." : (
              song.is_public ? "🔓 Make Private" : "🔒 Make Public"
            )}
          </button>

          <div
            style={{
              borderTop: "1px solid #eee",
              margin: "0.25rem 0",
            }}
          />

          <button
            onClick={() => {
              onDelete();
              setShowActionsDropdown(false);
            }}
            style={deleteButtonStyle}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#fdf2f2";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            Delete Song
          </button>
        </div>
      )}
    </div>
  );
};

export default SongActions;