import React, { useState } from "react";
import { apiPost, apiPatch, apiGet, ApiError } from "../../utils/api";
import SmartDropdown from "../ui/SmartDropdown";

const BulkEditModal = ({ isOpen, onClose, selectedSongs, onComplete }) => {
  const [selectedAction, setSelectedAction] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    message: "",
  });

  if (!isOpen) return null;

  const handleActionExecute = async () => {
    if (!selectedAction) {
      window.showNotification("Please select an action.", "warning");
      return;
    }

    // Actions that require input value
    const actionsNeedingInput = [
      "edit_artist",
      "edit_album",
      "edit_pack",
      "edit_year",
      "edit_cover_art",
      "edit_collaborations",
      "edit_owner",
      "edit_visibility",
    ];

    if (actionsNeedingInput.includes(selectedAction) && !inputValue) {
      window.showNotification("Please enter a value.", "warning");
      return;
    }

    setLoading(true);
    let failed = 0;
    let errorMessages = []; // Collect error messages for better user feedback

    try {
      switch (selectedAction) {
        case "edit_artist":
        case "edit_album":
        case "edit_pack":
        case "edit_year":
        case "edit_cover_art":
          let field = selectedAction.replace("edit_", "");
          // Map cover_art to album_cover for the backend
          if (field === "cover_art") {
            field = "album_cover";
          }
          setProgress({
            current: 0,
            total: selectedSongs.length,
            message: `Updating ${selectedAction.replace("edit_", "")}...`,
          });
          for (let i = 0; i < selectedSongs.length; i++) {
            const id = selectedSongs[i];
            try {
              const updates = {};
              updates[field] =
                field === "year" ? Number(inputValue) : inputValue;
              await apiPatch(`/songs/${id}`, updates);
              setProgress({
                current: i + 1,
                total: selectedSongs.length,
                message: `Updated ${i + 1} of ${selectedSongs.length} songs`,
              });
            } catch (error) {
              failed++;
              // Capture error message if available
              if (error instanceof ApiError) {
                const errorMsg = error.detail || error.message;
                if (errorMsg && !errorMessages.includes(errorMsg)) {
                  errorMessages.push(errorMsg);
                }
              } else if (error.message) {
                if (!errorMessages.includes(error.message)) {
                  errorMessages.push(error.message);
                }
              }
            }
          }
          break;

        case "edit_collaborations":
          setProgress({
            current: 0,
            total: selectedSongs.length,
            message: "Updating collaborations...",
          });
          for (let i = 0; i < selectedSongs.length; i++) {
            const id = selectedSongs[i];
            try {
              const collaborationText = inputValue.trim();
              if (collaborationText) {
                const collaborations = collaborationText
                  .split(",")
                  .map((collab) => ({
                    author: collab.trim(),
                    parts: null,
                  }));
                await apiPost(`/songs/${id}/collaborations/`, {
                  collaborations,
                });
              }
              setProgress({
                current: i + 1,
                total: selectedSongs.length,
                message: `Updated ${i + 1} of ${selectedSongs.length} songs`,
              });
            } catch (error) {
              failed++;
              if (error instanceof ApiError) {
                const errorMsg = error.detail || error.message;
                if (errorMsg && !errorMessages.includes(errorMsg)) {
                  errorMessages.push(errorMsg);
                }
              } else if (error.message) {
                if (!errorMessages.includes(error.message)) {
                  errorMessages.push(error.message);
                }
              }
            }
          }
          break;

        case "edit_owner":
          setProgress({
            current: 0,
            total: selectedSongs.length,
            message: "Updating song owners...",
          });
          for (let i = 0; i < selectedSongs.length; i++) {
            const id = selectedSongs[i];
            try {
              // First, get the user ID for the username
              const usersResponse = await apiGet("/auth/users/");
              const users = usersResponse.data || usersResponse;
              const targetUser = users.find(
                (user) => user.username === inputValue
              );

              if (targetUser) {
                await apiPatch(`/songs/${id}`, { user_id: targetUser.id });
              } else {
                failed++;
                if (!errorMessages.includes(`User "${inputValue}" not found`)) {
                  errorMessages.push(`User "${inputValue}" not found`);
                }
              }
              setProgress({
                current: i + 1,
                total: selectedSongs.length,
                message: `Updated ${i + 1} of ${selectedSongs.length} songs`,
              });
            } catch (error) {
              failed++;
              if (error instanceof ApiError) {
                const errorMsg = error.detail || error.message;
                if (errorMsg && !errorMessages.includes(errorMsg)) {
                  errorMessages.push(errorMsg);
                }
              } else if (error.message) {
                if (!errorMessages.includes(error.message)) {
                  errorMessages.push(error.message);
                }
              }
            }
          }
          break;

        case "edit_visibility":
          setProgress({
            current: 0,
            total: selectedSongs.length,
            message: "Updating visibility...",
          });
          for (let i = 0; i < selectedSongs.length; i++) {
            const id = selectedSongs[i];
            try {
              const makePublic = inputValue === "public";
              // Use the same bulk API endpoint that was used in handleBulkTogglePublic
              await apiPost('/api/public-songs/songs/bulk-toggle-public', {
                song_ids: [id],
                make_public: makePublic,
              });
              setProgress({
                current: i + 1,
                total: selectedSongs.length,
                message: `Updated ${i + 1} of ${selectedSongs.length} songs`,
              });
            } catch (error) {
              failed++;
              if (error instanceof ApiError) {
                const errorMsg = error.detail || error.message;
                if (errorMsg && !errorMessages.includes(errorMsg)) {
                  errorMessages.push(errorMsg);
                }
              } else if (error.message) {
                if (!errorMessages.includes(error.message)) {
                  errorMessages.push(error.message);
                }
              }
            }
          }
          break;

        case "bulk_enhance":
          setProgress({
            current: 0,
            total: selectedSongs.length,
            message: "Starting enhancement...",
          });
          try {
            // Simulate progress updates for better UX
            const progressInterval = setInterval(() => {
              setProgress((prev) => {
                if (prev.current < selectedSongs.length - 1) {
                  return {
                    current: prev.current + 1,
                    total: selectedSongs.length,
                    message: `Enhancing songs... (${prev.current + 1}/${
                      selectedSongs.length
                    })`,
                  };
                }
                return prev;
              });
            }, 200); // Update every 200ms

            // Use non-streaming endpoint for better production compatibility
            const response = await apiPost(
              "/tools/bulk-enhance",
              selectedSongs
            );

            // Clear the progress interval
            clearInterval(progressInterval);

            if (response && response.total_enhanced !== undefined) {
              setProgress({
                current: selectedSongs.length,
                total: selectedSongs.length,
                message: `Enhancement complete! ${response.total_enhanced} enhanced, ${response.total_failed} failed. Running cleanup...`,
              });
            } else {
              setProgress({
                current: selectedSongs.length,
                total: selectedSongs.length,
                message: "Enhancement complete! Running cleanup...",
              });
            }

            // Run clean remaster tags after enhancement
            try {
              await apiPost("/tools/bulk-clean", selectedSongs);
              setProgress({
                current: selectedSongs.length,
                total: selectedSongs.length,
                message: response && response.total_enhanced !== undefined
                  ? `Complete! ${response.total_enhanced} enhanced, ${response.total_failed} failed. Cleanup finished.`
                  : "Enhancement and cleanup complete!",
              });
            } catch (cleanupError) {
              console.error("Cleanup error after enhancement:", cleanupError);
              setProgress({
                current: selectedSongs.length,
                total: selectedSongs.length,
                message: response && response.total_enhanced !== undefined
                  ? `Enhancement complete! ${response.total_enhanced} enhanced, ${response.total_failed} failed. Cleanup failed.`
                  : "Enhancement complete! Cleanup failed.",
              });
            }

            // Trigger refresh after operation completes
            if (onComplete) {
              setTimeout(() => {
                onComplete();
              }, 100);
            }
          } catch (error) {
            console.error("Bulk enhance error:", error);
            failed = selectedSongs.length;
            setProgress({ current: 0, total: 0, message: "" });
            if (error instanceof ApiError) {
              const errorMsg = error.detail || error.message;
              if (errorMsg && !errorMessages.includes(errorMsg)) {
                errorMessages.push(errorMsg);
              }
            } else if (error.message) {
              if (!errorMessages.includes(error.message)) {
                errorMessages.push(error.message);
              }
            }
          }
          break;

        case "bulk_delete":
          try {
            await apiPost("/songs/bulk-delete/", { ids: selectedSongs });
          } catch (error) {
            failed = selectedSongs.length;
            if (error instanceof ApiError) {
              const errorMsg = error.detail || error.message;
              if (errorMsg && !errorMessages.includes(errorMsg)) {
                errorMessages.push(errorMsg);
              }
            } else if (error.message) {
              if (!errorMessages.includes(error.message)) {
                errorMessages.push(error.message);
              }
            }
          }
          break;

        case "clean_remaster_tags":
          setProgress({
            current: 0,
            total: selectedSongs.length,
            message: "Cleaning remaster tags...",
          });
          try {
            await apiPost("/tools/bulk-clean", selectedSongs);
            setProgress({
              current: selectedSongs.length,
              total: selectedSongs.length,
              message: "Cleaning complete!",
            });
          } catch (error) {
            failed = selectedSongs.length;
            setProgress({ current: 0, total: 0, message: "" });
            if (error instanceof ApiError) {
              const errorMsg = error.detail || error.message;
              if (errorMsg && !errorMessages.includes(errorMsg)) {
                errorMessages.push(errorMsg);
              }
            } else if (error.message) {
              if (!errorMessages.includes(error.message)) {
                errorMessages.push(error.message);
              }
            }
          }
          break;

        default:
          window.showNotification("Unknown action selected.", "error");
          return;
      }

      if (failed === 0) {
        window.showNotification(
          `Successfully completed action for ${selectedSongs.length} song(s).`,
          "success"
        );
      } else {
        // Build a user-friendly error message
        let errorMessage = `Failed to update ${failed} of ${selectedSongs.length} song(s).`;
        
        if (errorMessages.length > 0) {
          // Show the first error message (or combine if multiple unique errors)
          const primaryError = errorMessages[0];
          if (errorMessages.length === 1) {
            errorMessage = `Bulk edit failed: ${primaryError}`;
          } else {
            errorMessage = `Bulk edit failed: ${primaryError} (and ${errorMessages.length - 1} other error${errorMessages.length - 1 > 1 ? 's' : ''})`;
          }
        } else {
          // Fallback if we couldn't extract error messages
          errorMessage = `Bulk edit failed for ${failed} song(s). Please try again.`;
        }
        
        window.showNotification(errorMessage, "error");
      }
    } catch (error) {
      // Handle top-level errors (e.g., from bulk_enhance, bulk_delete, etc.)
      let errorMessage = "Bulk edit action failed.";
      
      if (error instanceof ApiError) {
        errorMessage = error.detail || error.message || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      window.showNotification(errorMessage, "error");
    }

    setLoading(false);
    setSelectedAction("");
    setInputValue("");
    setProgress({ current: 0, total: 0, message: "" });

    // Ensure onComplete is called to refresh the parent component
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.18)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "2rem 2.5rem",
          minWidth: 340,
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 14,
            background: "none",
            border: "none",
            fontSize: 22,
            color: "#888",
            cursor: "pointer",
          }}
          aria-label="Close"
        >
          ×
        </button>

        <h3
          style={{
            margin: 0,
            marginBottom: "1.2rem",
            fontSize: "1.2rem",
            color: "#333",
          }}
        >
          Bulk Actions for {selectedSongs.length} Song(s)
        </h3>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}
        >
          <option value="">-- Choose Action --</option>
          <option value="edit_artist">Edit Artist</option>
          <option value="edit_album">Edit Album</option>
          <option value="edit_pack">Edit Pack</option>
          <option value="edit_year">Edit Year</option>
          <option value="edit_cover_art">Edit Cover Art</option>
          <option value="edit_collaborations">Edit Collaborations</option>
          <option value="edit_owner">Edit Owner</option>
          <option value="edit_visibility">Edit Visibility</option>
          <option value="bulk_enhance">Bulk Enhance</option>
          <option value="bulk_delete">Bulk Delete</option>
          <option value="clean_remaster_tags">Clean Remaster Tags</option>
        </select>

        {[
          "edit_artist",
          "edit_album",
          "edit_pack",
          "edit_year",
          "edit_cover_art",
          "edit_collaborations",
          "edit_owner",
          "edit_visibility",
        ].includes(selectedAction) && (
          <div style={{ marginTop: "1rem" }}>
            {selectedAction === "edit_artist" && (
              <SmartDropdown
                type="artist"
                value={inputValue}
                onChange={setInputValue}
                placeholder="Select or add artist name"
              />
            )}
            {selectedAction === "edit_album" && (
              <SmartDropdown
                type="album"
                value={inputValue}
                onChange={setInputValue}
                placeholder="Select or add album name"
              />
            )}
            {selectedAction === "edit_pack" && (
              <SmartDropdown
                type="pack"
                value={inputValue}
                onChange={setInputValue}
                placeholder="Select or add pack name"
              />
            )}
            {selectedAction === "edit_collaborations" && (
              <SmartDropdown
                type="collaborations"
                value={inputValue}
                onChange={setInputValue}
                placeholder="Select or add usernames (comma-separated)"
              />
            )}
            {selectedAction === "edit_owner" && (
              <SmartDropdown
                type="users"
                value={inputValue}
                onChange={setInputValue}
                placeholder="Select or add username"
                includeCurrentUser={true}
              />
            )}
            {selectedAction === "edit_visibility" && (
              <select
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              >
                <option value="">-- Select Visibility --</option>
                <option value="public">🌐 Public</option>
                <option value="private">🔒 Private</option>
              </select>
            )}
            {(selectedAction === "edit_year" ||
              selectedAction === "edit_cover_art") && (
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  selectedAction === "edit_year"
                    ? "Enter year..."
                    : "Enter cover art URL..."
                }
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                }}
              />
            )}
          </div>
        )}

        {/* Progress Bar */}
        {loading && progress.total > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
                fontSize: "0.9rem",
                color: "#666",
              }}
            >
              <span>{progress.message}</span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  height: "100%",
                  backgroundColor: "#007bff",
                  transition: "width 0.3s ease",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#f5f5f5",
              color: "#333",
              border: "1px solid #ccc",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleActionExecute}
            disabled={loading || !selectedAction}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
            }}
          >
            {loading ? "Executing..." : "Execute Action"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;
