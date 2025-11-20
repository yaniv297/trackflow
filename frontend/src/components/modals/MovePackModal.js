import React, { useState, useEffect } from "react";
import { apiGet, apiPatch } from "../../utils/api";

const MovePackModal = ({ isOpen, onClose, song, onSongUpdate, onSuccess }) => {
  const [availablePacks, setAvailablePacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState("");
  const [packSuggestions, setPackSuggestions] = useState([]);
  const [showPackSuggestions, setShowPackSuggestions] = useState(false);

  const loadAvailablePacks = async () => {
    try {
      // Get only WIP songs and extract unique pack names
      const songsResponse = await apiGet("/songs/?status=In%20Progress");
      const songsData = songsResponse.data || songsResponse;
      const uniquePacks = [
        ...new Set(songsData.map((song) => song.pack_name).filter(Boolean)),
      ];
      const packs = uniquePacks.map((packName) => ({
        value: packName,
        label: packName,
      }));
      setAvailablePacks(packs);
      setPackSuggestions(packs); // Initialize suggestions with WIP packs only
    } catch (error) {
      console.error("Error loading packs:", error);
    }
  };

  const handlePackInputChange = (value) => {
    setSelectedPack(value);

    if (value.trim()) {
      // Filter packs based on input
      const filtered = availablePacks.filter((pack) =>
        pack.label.toLowerCase().includes(value.toLowerCase())
      );
      setPackSuggestions(filtered);
      setShowPackSuggestions(true);
    } else {
      setPackSuggestions(availablePacks);
      setShowPackSuggestions(false);
    }
  };

  const selectPackSuggestion = (packName) => {
    setSelectedPack(packName);
    setShowPackSuggestions(false);
  };

  const handleMovePack = async () => {
    if (!selectedPack) {
      window.showNotification("Please select a pack", "error");
      return;
    }

    try {
      await apiPatch(`/songs/${song.id}`, { pack: selectedPack });

      // Update the song locally - the backend will return the updated song with pack_id and pack_name
      if (onSongUpdate) {
        onSongUpdate(song.id, { pack_name: selectedPack });
      }

      window.showNotification(
        `Moved "${song.title}" to pack "${selectedPack}"`,
        "success"
      );

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Reset and close
      setSelectedPack("");
      onClose();
    } catch (error) {
      console.error("Error moving song to pack:", error);
      window.showNotification("Failed to move song to pack", "error");
    }
  };

  // Load packs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailablePacks();
    }
  }, [isOpen]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showPackSuggestions &&
        !event.target.closest("[data-pack-suggestions]")
      ) {
        setShowPackSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPackSuggestions]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          padding: "2rem",
          borderRadius: "8px",
          width: "90%",
          maxWidth: "400px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ margin: 0 }}>Move Song to Pack</h3>
          <button
            onClick={() => {
              setSelectedPack("");
              onClose();
            }}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <p style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            Move "{song.title}" to a WIP pack:
          </p>
          <div style={{ position: "relative" }} data-pack-suggestions>
            <input
              type="text"
              value={selectedPack}
              onChange={(e) => handlePackInputChange(e.target.value)}
              placeholder="Type WIP pack name..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
              onFocus={() => setShowPackSuggestions(true)}
            />

            {showPackSuggestions && packSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "white",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  zIndex: 1001,
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {packSuggestions.map((pack) => (
                  <div
                    key={pack.value}
                    onClick={() => selectPackSuggestion(pack.label)}
                    style={{
                      padding: "0.5rem",
                      cursor: "pointer",
                      borderBottom: "1px solid #f0f0f0",
                      fontSize: "0.9rem",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f8f9fa";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    {pack.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={() => {
              setSelectedPack("");
              onClose();
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleMovePack}
            disabled={!selectedPack}
            style={{
              padding: "0.5rem 1rem",
              background: selectedPack ? "#007bff" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: selectedPack ? "pointer" : "not-allowed",
            }}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovePackModal;
