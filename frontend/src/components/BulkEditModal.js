import React, { useState } from "react";
import { apiPost, apiPatch, apiGet } from "../utils/api";
import SmartDropdown from "./SmartDropdown";

const BulkEditModal = ({ isOpen, onClose, selectedSongs, onComplete }) => {
  const [selectedAction, setSelectedAction] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

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
    ];

    if (actionsNeedingInput.includes(selectedAction) && !inputValue) {
      window.showNotification("Please enter a value.", "warning");
      return;
    }

    setLoading(true);
    let failed = 0;

    try {
      switch (selectedAction) {
        case "edit_artist":
        case "edit_album":
        case "edit_pack":
        case "edit_year":
        case "edit_cover_art":
          const field = selectedAction.replace("edit_", "");
          for (const id of selectedSongs) {
            try {
              const updates = {};
              updates[field] =
                field === "year" ? Number(inputValue) : inputValue;
              await apiPatch(`/songs/${id}/`, updates);
            } catch {
              failed++;
            }
          }
          break;

        case "edit_collaborations":
          for (const id of selectedSongs) {
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
            } catch {
              failed++;
            }
          }
          break;

        case "edit_owner":
          for (const id of selectedSongs) {
            try {
              // First, get the user ID for the username
              const usersResponse = await apiGet("/auth/users/");
              const users = usersResponse.data || usersResponse;
              const targetUser = users.find(
                (user) => user.username === inputValue
              );

              if (targetUser) {
                await apiPatch(`/songs/${id}/`, { user_id: targetUser.id });
              } else {
                failed++;
              }
            } catch {
              failed++;
            }
          }
          break;

        case "bulk_enhance":
          for (const id of selectedSongs) {
            try {
              await apiPost(`/songs/${id}/enhance/`);
            } catch {
              failed++;
            }
          }
          break;

        case "bulk_delete":
          try {
            await apiPost("/songs/bulk-delete/", { ids: selectedSongs });
          } catch {
            failed = selectedSongs.length;
          }
          break;

        case "clean_remaster_tags":
          try {
            await apiPost("/tools/bulk-clean/", selectedSongs);
          } catch {
            failed = selectedSongs.length;
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
        window.showNotification(`Failed for ${failed} song(s).`, "error");
      }
    } catch (error) {
      window.showNotification("Action failed.", "error");
    }

    setLoading(false);
    setSelectedAction("");
    setInputValue("");
    onComplete();
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
            padding: "0.75rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            fontSize: "1rem",
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
                }}
              />
            )}
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
